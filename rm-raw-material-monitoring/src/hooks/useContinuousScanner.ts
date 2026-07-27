import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';

export interface UseContinuousScannerOptions {
    onScan: (decodedText: string) => Promise<boolean | void>;
    cooldownMs?: number;
    enabled?: boolean;
}

export interface UseContinuousScannerReturn {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef: React.RefObject<HTMLCanvasElement>;
    status: 'idle' | 'connecting' | 'scanning' | 'processing' | 'paused' | 'error' | 'permission_denied';
    errorMessage: string;
    isPaused: boolean;
    scanCount: number;
    lastScannedCode: string;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    togglePause: () => void;
    resetScanner: () => void;
}

export const useContinuousScanner = ({
    onScan,
    cooldownMs = 2500,
    enabled = true,
}: UseContinuousScannerOptions): UseContinuousScannerReturn => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameId = useRef<number | null>(null);
    const lastScanTimeRef = useRef<number>(0);
    const lastCodeRef = useRef<string>('');
    const isProcessingRef = useRef<boolean>(false);

    const [status, setStatus] = useState<'idle' | 'connecting' | 'scanning' | 'processing' | 'paused' | 'error' | 'permission_denied'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [scanCount, setScanCount] = useState<number>(0);
    const [lastScannedCode, setLastScannedCode] = useState<string>('');

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        try {
            setStatus('connecting');
            setErrorMessage('');

            // Stop any existing stream before starting a new one
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: 'environment', // Rear camera preferred on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play().catch((playErr) => {
                        console.error('[Scanner] Video play failed:', playErr);
                    });
                };
            }

            setStatus('scanning');
        } catch (err: any) {
            console.error('[Scanner] Camera access error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setStatus('permission_denied');
                setErrorMessage('Camera permission denied. Please grant permission in browser settings.');
            } else {
                setStatus('error');
                setErrorMessage(err.message || 'Failed to access camera device. Make sure it is connected.');
            }
        }
    }, []);

    const togglePause = useCallback(() => {
        setIsPaused((prev) => !prev);
    }, []);

    const resetScanner = useCallback(() => {
        lastCodeRef.current = '';
        lastScanTimeRef.current = 0;
        setLastScannedCode('');
        setErrorMessage('');
        isProcessingRef.current = false;
        if (status !== 'permission_denied' && status !== 'error') {
            setStatus('scanning');
        }
    }, [status]);

    // Initialize/cleanup camera stream based on 'enabled' prop
    useEffect(() => {
        if (enabled) {
            startCamera();
        } else {
            stopCamera();
            setStatus('idle');
        }
        return () => {
            stopCamera();
        };
    }, [enabled, startCamera, stopCamera]);

    // Live frame scanning loop using requestAnimationFrame
    useEffect(() => {
        if (status !== 'scanning' || isPaused || !enabled) return;

        const processFrame = async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && !isProcessingRef.current) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                if (ctx) {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'dontInvert',
                    });

                    if (code && code.data) {
                        const decodedText = code.data.trim();
                        const now = Date.now();

                        // Duplicate scan prevention logic (configurable cooldown interval)
                        const isDuplicate =
                            decodedText === lastCodeRef.current &&
                            now - lastScanTimeRef.current < cooldownMs;

                        if (decodedText && !isDuplicate && !isProcessingRef.current) {
                            isProcessingRef.current = true;
                            setStatus('processing');

                            lastCodeRef.current = decodedText;
                            lastScanTimeRef.current = now;
                            setLastScannedCode(decodedText);
                            setScanCount((prev) => prev + 1);

                            try {
                                await onScan(decodedText);
                            } catch (err: any) {
                                console.error('[Scanner] Frame process error:', err);
                            } finally {
                                isProcessingRef.current = false;
                                setStatus('scanning');
                            }
                            return;
                        }
                    }
                }
            }

            if (status === 'scanning' && !isPaused && enabled) {
                animationFrameId.current = requestAnimationFrame(processFrame);
            }
        };

        animationFrameId.current = requestAnimationFrame(processFrame);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [status, isPaused, enabled, cooldownMs, onScan]);

    return {
        videoRef,
        canvasRef,
        status: isPaused ? 'paused' : status,
        errorMessage,
        isPaused,
        scanCount,
        lastScannedCode,
        startCamera,
        stopCamera,
        togglePause,
        resetScanner,
    };
};

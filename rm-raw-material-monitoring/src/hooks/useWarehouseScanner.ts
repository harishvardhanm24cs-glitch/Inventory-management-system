import { useRef, useState, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';

export type CameraStatus =
  | 'connecting'
  | 'scanning'
  | 'processing'
  | 'error'
  | 'permission_denied';

export interface UseWarehouseScannerOptions {
  
  onDetected: (code: string) => void;
  
  dedupMs?: number;
}

export interface UseWarehouseScannerReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraStatus: CameraStatus;
  isPaused: boolean;
  togglePause: () => void;
  
  resumeScanning: () => void;
  
  pauseScanning: () => void;
}

export function useWarehouseScanner({
  onDetected,
  dedupMs = 2500,
}: UseWarehouseScannerOptions): UseWarehouseScannerReturn {
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeLoopRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('connecting');
  const [isPaused, setIsPaused] = useState<boolean>(false);

  

  const stopLoop = useCallback(() => {
    activeLoopRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startLoop = useCallback(() => {
    if (activeLoopRef.current) return;
    activeLoopRef.current = true;

    const tick = () => {
      if (!activeLoopRef.current || !mountedRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (video.readyState < video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (decoded?.data) {
        const text = decoded.data.trim();
        if (text) {
          const now = Date.now();
          const { code: lastCode, time: lastTime } = lastScanRef.current;

          
          if (text !== lastCode || now - lastTime >= dedupMs) {
            lastScanRef.current = { code: text, time: now };
            activeLoopRef.current = false; 
            onDetectedRef.current(text);
            return; 
          }
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [dedupMs, stopLoop]);

  

  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      setCameraStatus('connecting');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          if (!mountedRef.current) return;
          video.play().catch(console.error);
          if (mountedRef.current) {
            setCameraStatus('scanning');
            startLoop();
          }
        };
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('permission_denied');
      } else {
        setCameraStatus('error');
      }
    }
  }, [startLoop]);

  useEffect(() => {
    mountedRef.current = true;
    startCamera();
    return () => {
      mountedRef.current = false;
      stopLoop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

  const resumeScanning = useCallback(() => {
    if (!mountedRef.current) return;
    
    lastScanRef.current = { code: '', time: 0 };
    setIsPaused(false);
    setCameraStatus('scanning');
    startLoop();
  }, [startLoop]);

  const pauseScanning = useCallback(() => {
    stopLoop();
    setCameraStatus('processing');
  }, [stopLoop]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      const next = !prev;
      if (next) {
        stopLoop();
      } else {
        setCameraStatus('scanning');
        startLoop();
      }
      return next;
    });
  }, [startLoop, stopLoop]);

  return {
    videoRef,
    canvasRef,
    cameraStatus,
    isPaused,
    togglePause,
    resumeScanning,
    pauseScanning,
  };
}

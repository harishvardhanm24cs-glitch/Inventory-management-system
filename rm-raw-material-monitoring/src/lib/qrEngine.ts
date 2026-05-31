import jsQR from 'jsqr';
import toast from 'react-hot-toast';

export interface QRResult {
    materialId: string;
    batchId?: string;
    quantity: number;
    error?: boolean;
    extracts?: {
        paintName?: string;
        registrationId?: string;
        batchNumber?: string;
        location?: string;
        manufactureDate?: string;
        expiryDate?: string;
    };
}

/**
 * Decodes a QR code from an HTML canvas element.
 * @param canvas The canvas containing the image data.
 * @returns The decoded string or null if no QR code is found.
 */
export const decodeFromCanvas = (canvas: HTMLCanvasElement): string | null => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
    });

    return code ? code.data : null;
};

export const parseQRData = (data: string): QRResult => {
    console.log('[DEBUG PIPELINE] 1. Raw Scanned Payload:', data);
    const rawData = data.trim();

    let parsed: any;
    try {
        parsed = JSON.parse(rawData);
    } catch {
        toast.error("Invalid QR format");
        return { materialId: '', quantity: 0, error: true };
    }

    const {
        sku_id,
        paint_name,
        batch,
        location,
        manufacture_date,
        expiry_date,
        weight
    } = parsed;

    const parsedWeight = Number(weight);
    console.log('[DEBUG PIPELINE] 2. Parsed Weight Extracted:', parsedWeight);

    if (weight === undefined || weight === null || isNaN(parsedWeight)) {
        toast.error("Invalid weight in QR");
        return { materialId: '', quantity: 0, error: true };
    }

    return {
        materialId: sku_id || '',
        batchId: batch || '',
        quantity: parsedWeight,
        extracts: {
            paintName: paint_name,
            registrationId: sku_id,
            batchNumber: batch,
            location,
            manufactureDate: manufacture_date,
            expiryDate: expiry_date
        }
    };
};

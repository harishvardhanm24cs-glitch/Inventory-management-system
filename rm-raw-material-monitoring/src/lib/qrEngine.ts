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

    let parsed: any = null;
    let isJson = false;

    if (rawData.startsWith('{') && rawData.endsWith('}')) {
        try {
            parsed = JSON.parse(rawData);
            isJson = true;
        } catch {
            try {
                // Try parsing malformed JSON like `{materialId: 'RM002', quantity: 72}`
                const formatted = rawData
                    .replace(/'/g, '"')
                    .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":');
                parsed = JSON.parse(formatted);
                isJson = true;
            } catch {
                isJson = false;
            }
        }
    }

    if (isJson && parsed) {
        const actualMaterialId = parsed.sku_id || parsed.barcode_id || parsed.barcode || parsed.materialId || '';
        
        const rawWeight = parsed.weight !== undefined 
            ? parsed.weight 
            : (parsed.units !== undefined 
                ? parsed.units 
                : (parsed.quantity !== undefined ? parsed.quantity : undefined));

        let parsedWeight = Number(rawWeight);
        console.log('[DEBUG PIPELINE] 2. Parsed Weight Extracted:', parsedWeight);

        if (rawWeight === undefined || rawWeight === null || isNaN(parsedWeight)) {
            parsedWeight = 1.00; // Fallback
        }

        const actualPaintName = parsed.paint_name || parsed.material_name || '';
        const actualBatchNumber = parsed.batch || parsed.batch_number || '';
        const actualLocation = parsed.location || parsed.rack_code || '';
        const actualManufactureDate = parsed.manufacture_date || parsed.manufacturing_date || '';

        return {
            materialId: actualMaterialId,
            batchId: actualBatchNumber,
            quantity: parsedWeight,
            extracts: {
                paintName: actualPaintName,
                registrationId: actualMaterialId,
                batchNumber: actualBatchNumber,
                location: actualLocation,
                manufactureDate: actualManufactureDate,
                expiryDate: parsed.expiry_date
            }
        };
    } else {
        // Fallback for simple text QR
        return {
            materialId: rawData,
            quantity: 1.00,
            extracts: {
                paintName: '',
                registrationId: rawData,
                batchNumber: '',
                location: '',
                manufactureDate: '',
                expiryDate: ''
            }
        };
    }
};

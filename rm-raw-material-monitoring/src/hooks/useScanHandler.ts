import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { QRResult } from '../lib/qrEngine';
import { useInventory } from '../context/InventoryContext';

export const useScanHandler = () => {
    const { refreshData } = useInventory();
    const lastScanRef = useRef<{ id: string, time: number }>({ id: '', time: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    const handleScan = async (result: QRResult, type: 'inward' | 'outward'): Promise<any> => {
        if (result.error) return false;
        
        if (!result.materialId) {
            toast.error("No QR detected");
            return false;
        }

        const now = Date.now();
        // Prevent duplicate scan (cooldown 3 sec)
        if (result.materialId === lastScanRef.current.id && (now - lastScanRef.current.time) < 3000) {
            return false; // Silently ignore duplicate
        }

        if (isProcessing) return false;

        try {
            setIsProcessing(true);
            lastScanRef.current = { id: result.materialId, time: now };

            const payloadData = {
                sku_id: result.extracts?.registrationId || result.materialId,
                weight: result.quantity,
                type: type, // "inward" or "outward"
                paint_name: result.extracts?.paintName || 'Unknown Material',
                batch_number: result.extracts?.batchNumber || 'N/A',
                location: result.extracts?.location || 'Unknown'
            };
            console.log('[MySQL PIPELINE] Outbound API Payload:', payloadData);

            const response = await api.processScan(payloadData);

            if (type === 'inward') {
                toast.success(`Success: Added ${result.quantity} KG ✅`);
            } else {
                toast.success(`Success: Removed ${result.quantity} KG ❌`);
            }
            await refreshData();
            // Trigger real-time digital twin state refresh
            window.dispatchEvent(new CustomEvent('rack-inventory-update'));
            if (typeof (window as any).refreshDigitalTwin === 'function') {
                (window as any).refreshDigitalTwin();
            }
            return { success: true, data: response };
        } catch (err: any) {
            toast.error(err.message || "Failed to update inventory");
            return false;
        } finally {
            setIsProcessing(false);
        }
    };

    return { handleScan, isProcessing };
};

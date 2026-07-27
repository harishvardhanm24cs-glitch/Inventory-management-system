/**
 * useRackSync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time rack synchronization hook.
 *
 * Subscribes to the existing `rack-inventory-update` CustomEvent that is
 * dispatched by Scanner.tsx and OutwardScanner.tsx after every successful scan.
 *
 * Behaviour
 * ─────────
 * • On mount  → immediately fetches full rack list via GET /api/racks
 * • On event  → debounces 300 ms, then re-fetches rack list
 * • Returns the latest rack array plus sync metadata (isSyncing, lastSyncedAt,
 *   affectedRackCode) so the consumer can highlight only changed cards.
 *
 * Constraints
 * ─────────────
 * • Reuses existing api.getRacks() — no new API endpoints.
 * • Does NOT touch QR scanning, inventory logic, or backend code.
 * • Completely self-contained; consumer can opt-in alongside InventoryContext.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api';
import type { Rack } from '../context/InventoryContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RackSyncState {
    /** Latest rack array from the server */
    racks: Rack[];
    /** True while an in-flight GET /api/racks request is pending */
    isSyncing: boolean;
    /** ISO timestamp of the last successful sync */
    lastSyncedAt: string | null;
    /** rack_code of the most recently changed rack (from event detail) */
    affectedRackCode: string | null;
}

// ─── Event name constant (mirrors what Scanner.tsx dispatches) ────────────────
const RACK_UPDATE_EVENT = 'rack-inventory-update';

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param debounceMs  Minimum ms between successive fetches (default 300)
 */
export function useRackSync(debounceMs = 300): RackSyncState {
    const [racks, setRacks] = useState<Rack[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
    const [affectedRackCode, setAffectedRackCode] = useState<string | null>(null);

    // Debounce timer ref — prevents burst-fetching on rapid scans
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track whether component is still mounted to avoid state updates after unmount
    const isMountedRef = useRef(true);

    // ── Core fetch function ──────────────────────────────────────────────────
    const fetchRacks = useCallback(async (rackCode?: string | null) => {
        if (!isMountedRef.current) return;

        setIsSyncing(true);
        if (rackCode) {
            setAffectedRackCode(rackCode);
        }

        try {
            const response: any = await api.getRacks();

            if (!isMountedRef.current) return;

            // api.getRacks() returns the raw axios response which InventoryContext
            // maps. Here we replicate the mapping used in InventoryContext.fetchData().
            let rawRacks: any[] = [];
            if (response && response.racks) {
                rawRacks = response.racks;
            } else if (Array.isArray(response)) {
                rawRacks = response;
            }

            const mappedRacks: Rack[] = rawRacks.map((r: any) => {
                const qty = parseFloat(String(r.quantity)) || 0;
                const maxCap = parseFloat(String(r.max_capacity)) || 100;
                const capacity = r.capacity !== undefined ? parseFloat(String(r.capacity)) : maxCap;
                const current_stock =
                    r.current_stock !== undefined ? parseFloat(String(r.current_stock)) : qty;
                const occupancy_percentage =
                    capacity > 0
                        ? parseFloat(((current_stock / capacity) * 100).toFixed(2))
                        : 0.0;
                const fallbackStatusColor: 'GREEN' | 'YELLOW' | 'RED' =
                    occupancy_percentage > 80
                        ? 'RED'
                        : occupancy_percentage > 40
                        ? 'YELLOW'
                        : 'GREEN';
                return {
                    ...r,
                    rack_name: r.rack_name || r.rack_code || '',
                    capacity,
                    current_stock,
                    occupancy_percentage,
                    status_color: r.status_color || fallbackStatusColor,
                } as Rack;
            });

            setRacks(mappedRacks);
            setLastSyncedAt(new Date().toISOString());
        } catch (err) {
            console.error('[useRackSync] Failed to fetch rack data:', err);
        } finally {
            if (isMountedRef.current) {
                setIsSyncing(false);
                // Clear the affected rack highlight after 2 s
                setTimeout(() => {
                    if (isMountedRef.current) {
                        setAffectedRackCode(null);
                    }
                }, 2000);
            }
        }
    }, []);

    // ── Debounced fetch ──────────────────────────────────────────────────────
    const debouncedFetch = useCallback(
        (rackCode?: string | null) => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
            debounceTimer.current = setTimeout(() => {
                fetchRacks(rackCode);
            }, debounceMs);
        },
        [fetchRacks, debounceMs]
    );

    // ── Event listener ───────────────────────────────────────────────────────
    useEffect(() => {
        const handleRackUpdate = (event: Event) => {
            // Extract rackCode from the event detail if provided by the scanner
            const detail = (event as CustomEvent).detail;
            const rackCode: string | null =
                detail && typeof detail.rackCode === 'string' ? detail.rackCode : null;

            debouncedFetch(rackCode);
        };

        window.addEventListener(RACK_UPDATE_EVENT, handleRackUpdate);

        // Initial fetch on mount
        fetchRacks(null);

        return () => {
            window.removeEventListener(RACK_UPDATE_EVENT, handleRackUpdate);
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [fetchRacks, debouncedFetch]);

    // ── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return { racks, isSyncing, lastSyncedAt, affectedRackCode };
}

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Layout, RefreshCw, MapPin, Database, Layers, Clock,
  X, TrendingUp, Package, Zap, Activity, Brain,
  ShieldCheck, AlertTriangle, FolderOpen, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';
import api from '../services/api';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// ── Types ──────────────────────────────────────────────────────────────────────
interface RackMaterial {
  id: number;
  material_name: string;
  quantity: number;
  weight: number;
  unit: string;
  batch_number: string | null;
  threshold_limit?: number;
  last_scan_time?: string | null;
}

interface RackInventoryItem {
  id: number;
  rack_code: string;
  zone_name: string;
  current_capacity: number;
  max_capacity: number;
  occupancy_percentage: number;
  color_status: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED';
  last_updated: string | null;
  last_scan: string | null;
  materials: RackMaterial[];
}

interface FlowAnimation {
  id: string;
  type: 'INWARD' | 'OUTWARD';
  materialName: string;
  sourceLocation: string;
  destLocation: string;
  fading: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const getRackDisplayConfig = (occ: number) => {
  if (occ === 0) {
    return {
      card: 'bg-slate-50/60 border-slate-200 hover:border-slate-400',
      dot:  'bg-slate-350',
      bar:  'bg-slate-300',
      badge:'bg-slate-100 text-slate-500 border-slate-200',
      ring: 'ring-slate-400',
      glow: 'shadow-slate-500/10',
      label:'Empty',
      badgeColor: 'text-slate-500',
    };
  }
  if (occ <= 40) {
    const isCold = occ < 20;
    return {
      card: isCold
        ? 'bg-emerald-50/40 border-sky-400 hover:border-sky-500 border-2 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
        : 'bg-emerald-50/60 border-emerald-250 hover:border-emerald-400',
      dot:  'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      bar:  'bg-emerald-500',
      badge: isCold
        ? 'bg-sky-100 text-sky-700 border-sky-200'
        : 'bg-emerald-100 text-emerald-700 border-emerald-200',
      ring: 'ring-emerald-500',
      glow: isCold ? 'shadow-[0_0_15px_rgba(56,189,248,0.35)]' : 'shadow-emerald-500/20',
      label: isCold ? '❄ COLD ZONE' : 'Healthy',
      badgeColor: isCold ? 'text-sky-600' : 'text-emerald-600',
    };
  }
  if (occ <= 80) {
    return {
      card: 'bg-amber-50/60 border-amber-250 hover:border-amber-400',
      dot:  'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      bar:  'bg-amber-500',
      badge:'bg-amber-100 text-amber-700 border-amber-200',
      ring: 'ring-amber-400',
      glow: 'shadow-amber-500/20',
      label:'Medium Load',
      badgeColor: 'text-amber-600',
    };
  }
  // 81-100% is High Load
  const isHot = occ > 85;
  return {
    card: isHot
      ? 'bg-rose-50/60 border-red-600 hover:border-red-750 border-[3px] shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse'
      : 'bg-rose-50/60 border-red-250 hover:border-red-400 border-2',
    dot:  isHot
      ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-bounce'
      : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse',
    bar:  'bg-red-500',
    badge: isHot
      ? 'bg-red-100 text-red-700 border-red-300 animate-pulse font-black'
      : 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse',
    ring: 'ring-rose-500',
    glow: isHot ? 'shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'shadow-rose-500/20',
    label: isHot ? 'High Load (Hot Zone)' : 'High Load',
    badgeColor: isHot ? 'text-red-700' : 'text-rose-600',
  };
};

const getHeatmapConfig = (occ: number) => {
  if (occ === 0) {
    return {
      bg: 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200',
      label: 'Empty (0%)',
    };
  }
  if (occ <= 30) {
    return {
      bg: 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent',
      label: '0-30%',
    };
  }
  if (occ <= 70) {
    return {
      bg: 'bg-yellow-400 hover:bg-yellow-500 text-slate-900 border-transparent',
      label: '31-70%',
    };
  }
  if (occ <= 90) {
    return {
      bg: 'bg-orange-500 hover:bg-orange-600 text-white border-transparent',
      label: '71-90%',
    };
  }
  if (occ <= 100) {
    return {
      bg: 'bg-red-600 hover:bg-red-700 text-white border-transparent',
      label: '91-100%',
    };
  }
  return {
    bg: 'bg-red-600 text-white animate-pulse border-red-700 border-[3px] shadow-[0_0_15px_rgba(220,38,38,0.8)] z-10',
    label: 'Overloaded (>100%)',
  };
};

const getRackHealthScore = (rack: RackInventoryItem) => {
  const occ = parseFloat(String(rack.occupancy_percentage)) || 0;
  let score = 100;
  
  // 1. Overload deduction
  if (occ > 100) {
    score -= Math.min(100, Math.round((occ - 100) * 5));
  } else if (occ > 80) {
    score -= Math.round((occ - 80) * 1.5);
  }
  
  // 2. Low stock deduction
  let lowStockCount = 0;
  if (rack.materials && Array.isArray(rack.materials)) {
    rack.materials.forEach((m: any) => {
      const qty = parseFloat(m.quantity) || 0;
      const thresh = parseFloat(m.threshold_limit) || 0;
      if (qty <= thresh) {
        lowStockCount++;
      }
    });
  }
  score -= lowStockCount * 15;
  
  return Math.max(0, Math.min(100, score));
};

const getHealthStatus = (score: number) => {
  if (score === 100) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-250 text-emerald-600' };
  if (score >= 70) return { label: 'Good', color: 'bg-green-50 text-green-700 border-green-200 text-green-650' };
  if (score >= 40) return { label: 'Warning', color: 'bg-amber-50 text-amber-700 border-amber-200 text-amber-600' };
  return { label: 'Critical', color: 'bg-rose-50 text-rose-700 border-rose-200 text-rose-600 font-bold' };
};

const parseRackCode = (code: string) => {
  if (!code) return { row: '', col: 0 };
  const match = code.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: code, col: 0 };
  return { row: match[1], col: parseInt(match[2], 10) };
};

const compareRackCodes = (aStr: string, bStr: string) => {
  const a = parseRackCode(aStr);
  const b = parseRackCode(bStr);
  if (a.row.length !== b.row.length) {
    return a.row.length - b.row.length;
  }
  if (a.row !== b.row) {
    return a.row.localeCompare(b.row);
  }
  return a.col - b.col;
};

const getRackCodeFromMovement = (mv: any, activeCodes: string[]): string | null => {
  const src = (mv.source_location || '').toUpperCase();
  const dest = (mv.destination_location || '').toUpperCase();
  if (activeCodes.includes(src)) return src;
  if (activeCodes.includes(dest)) return dest;
  for (const code of activeCodes) {
    if (src.includes(code)) return code;
    if (dest.includes(code)) return code;
  }
  return null;
};

const getZoneHealth = (avgOccupancy: number, zoneRacks: RackInventoryItem[]) => {
  const hasOverloaded = zoneRacks.some(r => r.occupancy_percentage > 100);
  const redRacksCount = zoneRacks.filter(r => r.occupancy_percentage > 80).length;

  if (hasOverloaded || redRacksCount >= 2 || avgOccupancy > 80) {
    return {
      status: 'Critical',
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse',
      cardBorder: 'hover:border-rose-300 border-rose-100',
    };
  }
  
  if (redRacksCount > 0 || avgOccupancy > 50) {
    return {
      status: 'Warning',
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
      cardBorder: 'hover:border-amber-300 border-amber-100',
    };
  }

  return {
    status: 'Healthy',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-250',
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    cardBorder: 'hover:border-emerald-300 border-emerald-100',
  };
};

const runDataValidationReport = (racksList: RackInventoryItem[]) => {
  console.group('%c Warehouse Digital Twin Data Integrity Report ', 'background: #0f172a; color: #38bdf8; font-weight: bold; padding: 4px;');
  let errorsCount = 0;
  let warningsCount = 0;
  let emptyCount = 0;

  racksList.forEach(rack => {
    const occ     = parseFloat(String(rack.occupancy_percentage)) || 0;
    const current = parseFloat(String(rack.current_capacity))     || 0;
    const max     = parseFloat(String(rack.max_capacity))         || 0;

    // 1. Rack occupancy cannot exceed max capacity — use actual DB max_capacity
    if (max > 0 && current > max) {
      console.error(
        `❌ [INTEGRITY ERROR] Rack ${rack.rack_code} current capacity exceeds max! ` +
        `Current: ${current} KG, Max (DB): ${max} KG, Reported Occupancy: ${occ}%`
      );
      errorsCount++;
    }

    // 2. Verify reported occupancy % matches what we can compute from DB values
    if (max > 0) {
      const computedOcc = parseFloat(((current / max) * 100).toFixed(2));
      const diff = Math.abs(computedOcc - occ);
      if (diff > 1.0) {
        console.warn(
          `⚠️ [OCCUPANCY MISMATCH] Rack ${rack.rack_code}: ` +
          `Reported=${occ}%, Computed from DB (${current}/${max} KG)=${computedOcc}%. ` +
          `Difference: ${diff.toFixed(2)}% — rack_inventory may be stale.`
        );
        warningsCount++;
      }
    }

    // 3. Negative capacity stats
    if (current < 0 || max < 0 || occ < 0) {
      console.error(`❌ [INTEGRITY ERROR] Rack ${rack.rack_code} has negative stats! Current: ${current}, Max: ${max}, Occ: ${occ}%`);
      errorsCount++;
    }

    // 4. Negative material inventory check
    if (rack.materials && Array.isArray(rack.materials)) {
      rack.materials.forEach((mat: any) => {
        const qty = parseFloat(mat.quantity) || parseFloat(mat.bucket_count) || 0;
        const wt  = parseFloat(mat.weight)  || parseFloat(mat.weight_kg)    || 0;
        if (qty < 0 || wt < 0) {
          console.error(`❌ [INTEGRITY ERROR] Negative inventory not allowed for material '${mat.material_name || 'Unknown'}' in Rack '${rack.rack_code}': Quantity=${qty}, Weight=${wt}`);
          errorsCount++;
        }
      });
    }

    // 5. Warning / Critical / Empty Alerts
    if (occ === 0) {
      emptyCount++;
    } else if (occ > 100) {
      console.error(`🔴 [OVERLOAD] Rack ${rack.rack_code} is OVERLOADED at ${occ}% (${current} KG / ${max} KG max).`);
      errorsCount++;
    } else if (occ > 80) {
      console.warn(`⚠️ [CAPACITY ALERT] Rack ${rack.rack_code} is at HIGH LOAD (${occ}% capacity).`);
      warningsCount++;
    }
  });

  console.log(`[REPORT COMPLETE] Found ${errorsCount} Integrity Errors, ${warningsCount} Alerts/Warnings, and ${emptyCount} Empty Racks.`);
  console.groupEnd();
};

const formatDateTime = (isoStr: string | null | undefined) => {
  if (!isoStr) return 'Never';
  try {
    return new Date(isoStr).toLocaleString('en-IN', {
      day:    '2-digit',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr;
  }
};

// Paint bucket color dots for material cards
const PAINT_COLORS: Record<string, string> = {
  'pink':       'bg-pink-400',
  'cream':      'bg-yellow-100 border border-yellow-300',
  'dark blue':  'bg-blue-900',
  'blue':       'bg-blue-500',
  'red':        'bg-red-500',
  'green':      'bg-green-500',
  'white':      'bg-white border border-slate-300',
  'black':      'bg-slate-900',
  'yellow':     'bg-yellow-400',
  'orange':     'bg-orange-400',
  'purple':     'bg-purple-500',
  'grey':       'bg-slate-400',
  'gray':       'bg-slate-400',
};

const getPaintDot = (name: string) => {
  const lower = name.toLowerCase();
  for (const [key, cls] of Object.entries(PAINT_COLORS)) {
    if (lower.includes(key)) return cls;
  }
  return 'bg-slate-300';
};

// Zone config is computed dynamically inside the component

// ── Material Flow Animation Banner (Phase 4 Step 3) ─────────────────────────
const FlowAnimationBanner = ({ flow }: { flow: FlowAnimation }) => {
  const isInward = flow.type === 'INWARD';
  const truncate = (s: string, n = 14) => s.length > n ? s.slice(0, n) + '\u2026' : s;

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border',
        'transition-all duration-500 ease-out',
        isInward
          ? 'bg-gradient-to-r from-indigo-50/90 to-blue-50/60 border-indigo-100 shadow-indigo-100/50'
          : 'bg-gradient-to-r from-orange-50/90 to-amber-50/60 border-orange-100 shadow-orange-100/50',
        'shadow-sm',
        flow.fading ? 'opacity-0 scale-95 -translate-y-0.5' : 'opacity-100 scale-100 translate-y-0'
      )}
      style={{ animation: flow.fading ? undefined : 'flowBannerIn 0.28s cubic-bezier(0.34,1.56,0.64,1)' }}
    >
      {/* Icon bubble */}
      <div className={cn(
        'flex-shrink-0 p-1.5 rounded-lg',
        isInward ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'
      )}>
        <Package className="w-3 h-3" />
      </div>

      {/* Direction label + material name */}
      <div className="flex-shrink-0 leading-none">
        <p className={cn(
          'text-[8px] font-black uppercase tracking-wider mb-0.5',
          isInward ? 'text-indigo-400' : 'text-orange-400'
        )}>
          {isInward ? '\u25bc Inward' : '\u25b2 Outward'}
        </p>
        <p className="text-[10px] font-black text-slate-800 max-w-[72px] truncate">
          {flow.materialName}
        </p>
      </div>

      {/* Animated path: Source → moving dot → Destination */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
        {/* Source node */}
        <span className="flex-shrink-0 text-[7px] font-black text-slate-500 bg-white/90 px-1.5 py-0.5 rounded-md border border-slate-100 whitespace-nowrap">
          {truncate(flow.sourceLocation)}
        </span>

        {/* Dot travel track */}
        <div className="relative h-3 flex-1 min-w-[28px]">
          {/* Track line */}
          <div className={cn(
            'absolute inset-x-0 top-1/2 -translate-y-1/2 h-px',
            isInward ? 'bg-indigo-200' : 'bg-orange-200'
          )} />
          {/* Traveling dot */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              marginTop: '-5px',
              left: 0,
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: isInward ? '#6366f1' : '#f97316',
              boxShadow: isInward
                ? '0 0 8px rgba(99,102,241,0.7)'
                : '0 0 8px rgba(249,115,22,0.7)',
              animation: 'dotTravel 1.9s cubic-bezier(0.4,0,0.2,1) forwards',
            }}
          />
        </div>

        {/* Destination node */}
        <span className={cn(
          'flex-shrink-0 text-[7px] font-black px-1.5 py-0.5 rounded-md border whitespace-nowrap',
          isInward
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-orange-50 text-orange-700 border-orange-200'
        )}>
          {truncate(flow.destLocation)}
        </span>
      </div>
    </div>
  );
};

// ── Timestamp formatter for movement feed
const formatMovementTime = (isoStr: string | null | undefined): string => {
  if (!isoStr) return '--:-- --';
  try {
    return new Date(isoStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr ?? '--:-- --';
  }
};

// ── Main Component ─────────────────────────────────────────────────────────────
const WarehouseTwin = () => {
  const [racks, setRacks] = useState<RackInventoryItem[]>([]);
  const totalRacks = racks.length;
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState<RackInventoryItem | null>(null);
  const [selectedRackDetails, setSelectedRackDetails] = useState<any | null>(null);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [pulseKey, setPulseKey] = useState(0); // force re-render on refresh
  const [movements, setMovements] = useState<any[]>([]);
  const prevMovementIdRef = useRef<number | null>(null);
  const [activeFlows, setActiveFlows] = useState<FlowAnimation[]>([]);
  const [highTrafficRack, setHighTrafficRack] = useState<{ rack_code: string; count: number } | null>(null);
  const [rackOptimizations, setRackOptimizations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [showHeatmap, setShowHeatmap] = useState<boolean>(() => {
    const saved = localStorage.getItem('wt_show_heatmap');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('wt_show_heatmap', String(showHeatmap));
  }, [showHeatmap]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<HTMLDivElement | null>(null);
  const dispatchRef = useRef<HTMLDivElement | null>(null);
  const rackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [particles, setParticles] = useState<any[]>([]);

  interface WarehouseStats {
    totalMaterials: number;
    totalInventory: number;
    occupiedRacks: number;
    emptyRacks: number;
    lowStockMaterials: number;
    utilizationPercentage: number;
    todayInward: number;
    todayOutward: number;
    systemHealthScore: number;
    aiRiskScore: number;
  }

  const [stats, setStats] = useState<WarehouseStats | null>(null);

  const fetchWarehouseStats = useCallback(async () => {
    try {
      const res = await api.getWarehouseStats();
      if (res) {
        const data = res.data || res;
        setStats({
          totalMaterials: data.totalMaterials || 0,
          totalInventory: data.totalInventory || 0,
          occupiedRacks: data.occupiedRacks || 0,
          emptyRacks: data.emptyRacks !== undefined ? data.emptyRacks : (totalRacks - (data.occupiedRacks || 0)),
          lowStockMaterials: data.lowStockCount || 0,
          utilizationPercentage: data.utilizationPercentage || 0,
          todayInward: data.todayInward || 0,
          todayOutward: data.todayOutward || 0,
          systemHealthScore: data.systemHealthScore !== undefined ? data.systemHealthScore : 100,
          aiRiskScore: data.aiRiskScore || 0,
        });
      }
    } catch (err) {
      console.error('[WarehouseTwin] Failed to fetch warehouse stats:', err);
    }
  }, [totalRacks]);

  const fetchRackMaterials = useCallback(async (rackCode: string, showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.getRackMaterials(rackCode);
      if (res && res.rack_code) {
        const occ = parseFloat(res.occupancy_percentage) || 0;
        let color_status: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED';
        if (occ === 0)        color_status = 'GRAY';
        else if (occ <= 40)   color_status = 'GREEN';
        else if (occ <= 80)   color_status = 'YELLOW';
        else                  color_status = 'RED';

        setSelectedRackDetails({
          rack_code: res.rack_code,
          occupancy_percentage: occ,
          color_status,
          zone_name: selectedRack?.zone_name || '',
          current_capacity: selectedRack?.current_capacity || 0,
          max_capacity: selectedRack?.max_capacity || 0,
          last_updated: selectedRack?.last_updated || null,
          last_scan: selectedRack?.last_scan || null,
          id: selectedRack?.id,
          materials: (res.materials || []).map((m: any, idx: number) => ({
            id: m.id || idx,
            material_name: m.material_name,
            quantity: parseFloat(m.quantity) || 0,
            weight: parseFloat(m.weight) || 0,
            unit: m.unit || 'KG',
            batch_number: m.batch_number || null,
          })),
          summary: {
            total_materials: (res.materials || []).length,
            total_quantity: (res.materials || []).reduce((s: number, m: any) => s + (parseFloat(m.quantity) || 0), 0),
            total_weight: (res.materials || []).reduce((s: number, m: any) => s + (parseFloat(m.weight) || 0), 0)
          }
        });
      }
    } catch (err) {
      console.error('[WarehouseTwin] Failed to fetch rack materials:', err);
    } finally {
      if (showSpinner) setLoadingMaterials(false);
    }
  }, [selectedRack]);

  const fetchRecentMovements = useCallback(async () => {
    try {
      const res: any = await api.getMovementsRecent();
      if (res && res.data && Array.isArray(res.data)) {
        setMovements(res.data);
      }
    } catch (err) {
      console.error('[WarehouseTwin] Failed to fetch recent movements:', err);
    }
  }, []);

  const fetchRackInventory = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.getRackInventory();
      if (res && res.data && Array.isArray(res.data)) {
        setRacks(res.data);
        runDataValidationReport(res.data);
      }
      if (res && res.highTrafficZone) {
        setHighTrafficRack(res.highTrafficZone);
      } else {
        setHighTrafficRack(null);
      }
      const now = new Date();
      setLastRefresh(now.toLocaleTimeString('en-IN', { hour12: true }));
      setPulseKey(k => k + 1);
    } catch (err) {
      console.error('[WarehouseTwin] Failed to fetch rack inventory:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const fetchRackOptimizations = useCallback(async () => {
    try {
      const res = await api.getRackOptimizations();
      if (Array.isArray(res)) {
        setRackOptimizations(res);
      }
    } catch (err) {
      console.error('[WarehouseTwin] Failed to fetch rack optimizations:', err);
    }
  }, []);

  const fetchSearchResults = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.locateMaterials(query);
      if (res && res.success && Array.isArray(res.data)) {
        setSearchResults(res.data);
      } else if (Array.isArray(res)) {
        setSearchResults(res);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('[WarehouseTwin] Failed to locate materials:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      fetchSearchResults(searchQuery);
    }, 300);

    const interval = setInterval(() => {
      fetchSearchResults(searchQuery);
    }, 5000);

    return () => {
      clearTimeout(delayDebounceFn);
      clearInterval(interval);
    };
  }, [searchQuery, fetchSearchResults]);

  useEffect(() => {
    fetchRackOptimizations();
    const interval = setInterval(fetchRackOptimizations, 300000); // 5 minutes auto refresh
    return () => clearInterval(interval);
  }, [fetchRackOptimizations]);

  useEffect(() => {
    fetchRackInventory(true);
    fetchRecentMovements();
    const interval = setInterval(() => {
      fetchRackInventory(false);
      fetchRecentMovements();
      if (drawerOpen && selectedRack) {
        fetchRackMaterials(selectedRack.rack_code, false);
      }
    }, 10000); // 10s refresh for live movements feed
    return () => clearInterval(interval);
  }, [fetchRackInventory, fetchRackMaterials, fetchRecentMovements, drawerOpen, selectedRack]);

  // Real-Time React state refresh handler (Phase 2 Step 6)
  const refreshDigitalTwin = useCallback(() => {
    console.log('[Digital Twin] Real-time state refresh invoked');
    fetchRackInventory(false);
    fetchRecentMovements();
    fetchRackOptimizations();
    fetchWarehouseStats();
    if (selectedRack) {
      fetchRackMaterials(selectedRack.rack_code, false);
    }
    if (searchQuery.trim()) {
      fetchSearchResults(searchQuery);
    }
  }, [fetchRackInventory, fetchRackMaterials, fetchRecentMovements, fetchRackOptimizations, fetchWarehouseStats, selectedRack, searchQuery, fetchSearchResults]);

  useEffect(() => {
    fetchWarehouseStats();
    const statsInterval = setInterval(fetchWarehouseStats, 30000); // 30s refresh for executive stats
    return () => clearInterval(statsInterval);
  }, [fetchWarehouseStats]);

  useEffect(() => {
    // Expose globally
    (window as any).refreshDigitalTwin = refreshDigitalTwin;

    // Listen to custom transactional update events
    const handleUpdate = () => {
      refreshDigitalTwin();
    };
    window.addEventListener('rack-inventory-update', handleUpdate);

    return () => {
      delete (window as any).refreshDigitalTwin;
      window.removeEventListener('rack-inventory-update', handleUpdate);
    };
  }, [refreshDigitalTwin]);

  // Phase 4 Step 3: Detect new movements and trigger flow animations
  useEffect(() => {
    if (!movements || movements.length === 0) return;
    const latest = movements[0];
    if (!latest || latest.id === prevMovementIdRef.current) return;
    prevMovementIdRef.current = latest.id;

    const newFlow: FlowAnimation = {
      id: `flow-${latest.id}-${Date.now()}`,
      type: (latest.movement_type as 'INWARD' | 'OUTWARD') || 'INWARD',
      materialName: latest.material_name || latest.barcode_id || 'Material',
      sourceLocation: latest.source_location || 'Scanner',
      destLocation: latest.destination_location || 'Warehouse',
      fading: false,
    };

    setActiveFlows(prev => [newFlow, ...prev].slice(0, 3));

    // Begin fade-out at 2.2s
    const fadeTimer = setTimeout(() => {
      setActiveFlows(prev =>
        prev.map(f => f.id === newFlow.id ? { ...f, fading: true } : f)
      );
    }, 2200);

    // Fully remove at 2.7s
    const removeTimer = setTimeout(() => {
      setActiveFlows(prev => prev.filter(f => f.id !== newFlow.id));
    }, 2700);

    // Trigger visual package flow animation on the floor map layout
    const activeCodes = racks.map(r => r.rack_code.toUpperCase());
    const rackCode = getRackCodeFromMovement(latest, activeCodes);
    if (rackCode) {
      setTimeout(() => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const scannerRect = scannerRef.current?.getBoundingClientRect();
        const dispatchRect = dispatchRef.current?.getBoundingClientRect();
        const rackElement = rackRefs.current[rackCode];
        const rackRect = rackElement?.getBoundingClientRect();

        if (containerRect && rackRect) {
          const isInward = latest.movement_type === 'INWARD';
          let startX = 0, startY = 0, endX = 0, endY = 0;

          if (isInward && scannerRect) {
            startX = scannerRect.left - containerRect.left + scannerRect.width / 2;
            startY = scannerRect.top - containerRect.top + scannerRect.height / 2;
            endX = rackRect.left - containerRect.left + rackRect.width / 2;
            endY = rackRect.top - containerRect.top + rackRect.height / 2;
          } else if (!isInward && dispatchRect) {
            startX = rackRect.left - containerRect.left + rackRect.width / 2;
            startY = rackRect.top - containerRect.top + rackRect.height / 2;
            endX = dispatchRect.left - containerRect.left + dispatchRect.width / 2;
            endY = dispatchRect.top - containerRect.top + dispatchRect.height / 2;
          } else {
            return;
          }

          const particleId = `part-${latest.id}-${Date.now()}`;
          const newParticle = {
            id: particleId,
            startX,
            startY,
            currentX: startX,
            currentY: startY,
            endX,
            endY,
            isInward,
            materialName: latest.material_name || latest.barcode_id || 'Material'
          };

          setParticles(prev => [...prev, newParticle]);

          // Transition package to destination in the next frame
          setTimeout(() => {
            setParticles(prev =>
              prev.map(p =>
                p.id === particleId
                  ? { ...p, currentX: endX, currentY: endY }
                  : p
              )
            );
          }, 50);

          // Clean up package element after transition completes
          setTimeout(() => {
            setParticles(prev => prev.filter(p => p.id !== particleId));
          }, 2500);
        }
      }, 150);
    }

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [movements]);

  // ── Helper: get rack by code
  const getRack = (code: string) => racks.find(r => r.rack_code === code);

  // ── Summary metrics
  const emptyRacks       = racks.filter(r => r.occupancy_percentage === 0).length;
  const criticalRacks    = racks.filter(r => r.color_status === 'RED').length;
  const totalCapacity    = racks.reduce((a, r) => a + r.max_capacity, 0);
  const usedCapacity     = racks.reduce((a, r) => a + r.current_capacity, 0);
  const avgUtil = totalCapacity > 0 ? parseFloat(((usedCapacity / totalCapacity) * 100).toFixed(1)) : 0;
  const hotZones         = racks.filter(r => r.occupancy_percentage > 85);
  const coldZones        = racks.filter(r => r.occupancy_percentage > 0 && r.occupancy_percentage < 20);

  // ── Health Score Calculations
  const overloadCount = racks.filter(r => r.occupancy_percentage >= 100).length;
  const activeAlertsCount = hotZones.length + racks.filter(r => r.current_capacity > r.max_capacity).length;
  
  let criticalStockCount = 0;
  racks.forEach(r => {
    if (r.materials && Array.isArray(r.materials)) {
      r.materials.forEach((m: any) => {
        const qty = parseFloat(m.quantity) || parseFloat(m.bucket_count) || 0;
        const thresh = parseFloat(m.threshold_limit) || 0;
        if (qty <= thresh) {
          criticalStockCount++;
        }
      });
    }
  });

  // ── Utilization Gauge Calculations
  let utilLabel = 'Optimal';
  let utilColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
  let utilBarColor = '#10b981';
  if (avgUtil < 50) {
    utilLabel = 'Optimal';
    utilColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
    utilBarColor = '#10b981';
  } else if (avgUtil < 80) {
    utilLabel = 'Warning';
    utilColor = 'text-amber-600 bg-amber-50 border-amber-100';
    utilBarColor = '#f59e0b';
  } else {
    utilLabel = 'Critical';
    utilColor = 'text-rose-600 bg-rose-50 border-rose-100';
    utilBarColor = '#ef4444';
  }

  const gaugeRadius = 50;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeHalfCircumference = gaugeCircumference / 2;
  const utilStrokeOffset = gaugeHalfCircumference - (Math.min(100, Math.max(0, avgUtil)) / 100) * gaugeHalfCircumference;

  // Filter racks containing materials matching searchQuery (Phase 6 Step 7) - removed local matching, using searchResults state

  // ── Compute dynamic Zone Config ───────────────────────────────────────────────
  const dynamicZoneConfig = useMemo(() => {
    const rowsMap: Record<string, string[]> = {};
    racks.forEach(r => {
      const { row } = parseRackCode(r.rack_code);
      if (!rowsMap[row]) {
        rowsMap[row] = [];
      }
      rowsMap[row].push(r.rack_code);
    });

    const sortedRows = Object.keys(rowsMap).sort((a, b) => {
      if (a.length !== b.length) return a.length - b.length;
      return a.localeCompare(b);
    });

    return sortedRows.map(row => {
      const rowRacks = rowsMap[row].sort(compareRackCodes);
      
      let zone_name = `STORAGE ZONE (ROW ${row})`;
      let label = `Main Storage • Shelf ${row}`;
      let color = 'text-violet-600';
      let bg = 'bg-violet-50';
      let border = 'border-violet-100';
      let icon = Database;

      if (row === 'A') {
        zone_name = 'RECEIVING ZONE';
        label = 'Inbound • Receiving Bay';
        color = 'text-blue-600';
        bg = 'bg-blue-50';
        border = 'border-blue-100';
        icon = Package;
      } else if (row === 'C') {
        zone_name = 'DISPATCH ZONE';
        label = 'Outbound • Dispatch Bay';
        color = 'text-orange-600';
        bg = 'bg-orange-50';
        border = 'border-orange-100';
        icon = Zap;
      }

      return {
        zone_name,
        racks: rowRacks,
        icon,
        color,
        bg,
        border,
        label
      };
    });
  }, [racks]);

  // ── Zone stats metrics
  const getZoneStats = (zoneRacksList: string[]) => {
    const zoneRacks = racks.filter(r => zoneRacksList.includes(r.rack_code));
    const numRacks = zoneRacks.length;
    const avgOccupancy = numRacks > 0 
      ? zoneRacks.reduce((s, r) => s + r.occupancy_percentage, 0) / numRacks 
      : 0;

    const totalMaterials = zoneRacks.reduce((s, r) => {
      if (r.materials && Array.isArray(r.materials)) {
        return s + r.materials.reduce((sm, m) => sm + (parseFloat((m as any).bucket_count) || parseFloat((m as any).quantity) || 0), 0);
      }
      return s;
    }, 0);

    const totalWeight = zoneRacks.reduce((s, r) => {
      if (r.materials && Array.isArray(r.materials)) {
        return s + r.materials.reduce((sm, m) => sm + (parseFloat((m as any).weight_kg) || parseFloat((m as any).weight) || 0), 0);
      }
      return s;
    }, 0);

    return {
      numRacks,
      avgOccupancy: parseFloat(avgOccupancy.toFixed(1)),
      totalMaterials,
      totalWeight: parseFloat(totalWeight.toFixed(1)),
    };
  };

  // ── Click rack handler
  const handleRackClick = (rack: RackInventoryItem | undefined) => {
    if (!rack) return;
    setSelectedRack(rack);
    setSelectedRackDetails(null);
    setDrawerOpen(true);
    fetchRackMaterials(rack.rack_code, true);
  };

  // ── Select search result handler (Scroll & Flash Auto-Focus)
  const handleSelectSearchResult = (result: any) => {
    const targetRack = racks.find(r => r.rack_code === result.rack_code);
    if (targetRack) {
      setSelectedRack(targetRack);
      setSelectedRackDetails(null);
      setDrawerOpen(true);
      fetchRackMaterials(targetRack.rack_code, true);

      setTimeout(() => {
        const el = rackRefs.current[targetRack.rack_code];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          el.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2', 'scale-[1.08]', 'z-20');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2', 'scale-[1.08]', 'z-20');
          }, 2500);
        }
      }, 200);
    }
  };

  // ── Rack Cell renderer
  const renderRackCell = (code: string) => {
    const rack = getRack(code);

    if (!rack) {
      return (
        <div
          key={code}
          className="flex flex-col items-center justify-center h-[120px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30 select-none"
        >
          <span className="font-mono font-black text-sm text-slate-400">{code}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mt-1">OFFLINE</span>
        </div>
      );
    }

    const occ = rack.occupancy_percentage;
    const isSelected = selectedRack?.rack_code === rack.rack_code;
    const isHighTraffic = highTrafficRack?.rack_code === rack.rack_code;

    const isMatched = searchQuery.trim() ? searchResults.some((res: any) => res.rack_code === rack.rack_code) : false;

    const hScore = getRackHealthScore(rack);
    const hStatus = getHealthStatus(hScore);

    if (showHeatmap) {
      const heat = getHeatmapConfig(occ);
      return (
        <div
          key={rack.rack_code}
          ref={el => { rackRefs.current[rack.rack_code] = el; }}
          onClick={() => handleRackClick(rack)}
          className={cn(
            'relative flex flex-col items-center justify-center h-[120px] rounded-2xl border-2 cursor-pointer shadow-sm select-none',
            'transition-all duration-300 hover:scale-[1.03] hover:shadow-md p-3',
            heat.bg,
            heat.bg.includes('text-slate-900') ? 'border-slate-350' : 'border-transparent',
            isSelected && 'ring-4 ring-indigo-500 ring-offset-2 scale-[1.03] shadow-lg border-transparent',
            isHighTraffic && !isSelected && !isMatched && 'ring-2 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-[1.02] border-transparent',
            isMatched && !isSelected && 'ring-4 ring-amber-500 scale-[1.04] shadow-[0_0_20px_rgba(245,158,11,0.8)] z-10 animate-pulse border-transparent'
          )}
        >
          {/* Health Badge */}
          <span className={cn('absolute top-2 left-2 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border shadow-sm z-10', hStatus.color)}>
            H: {hScore}
          </span>

          {isHighTraffic && (
            <span className="absolute top-2 right-2 text-xs animate-bounce" title="High Traffic Zone">🔥</span>
          )}

          <div className="text-center font-mono">
            <div className="text-2xl font-black tracking-wider leading-none">
              {rack.rack_code}
            </div>
            <div className="text-lg font-extrabold mt-1">
              {occ}%
            </div>
          </div>

          <div className="absolute bottom-2 text-[8px] font-bold uppercase tracking-wider opacity-75">
            {rack.current_capacity} / {rack.max_capacity} KG
          </div>
        </div>
      );
    }

    // Original view code
    const cfg = getRackDisplayConfig(occ);
    return (
      <div
        key={rack.rack_code}
        ref={el => { rackRefs.current[rack.rack_code] = el; }}
        onClick={() => handleRackClick(rack)}
        className={cn(
          'relative flex flex-col justify-between h-[120px] rounded-2xl border-2 cursor-pointer',
          'transition-all duration-300 hover:scale-[1.03] hover:shadow-lg p-3',
          cfg.card,
          isSelected && `ring-2 ${cfg.ring} scale-[1.03] shadow-lg ${cfg.glow} border-transparent`,
          isHighTraffic && !isSelected && !isMatched && 'ring-2 ring-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] scale-[1.02] border-transparent',
          isMatched && !isSelected && 'ring-4 ring-amber-500 scale-[1.04] shadow-[0_0_20px_rgba(245,158,11,0.8)] z-10 animate-pulse border-transparent'
        )}
      >
        {/* Top stripe */}
        <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-2xl', cfg.bar)} />

        {/* Header row */}
        <div className="flex items-start justify-between pt-1">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-black text-sm text-slate-900 leading-none">{rack.rack_code}</span>
              {isHighTraffic && (
                <span className="text-xs animate-bounce" title="High Traffic Zone">🔥</span>
              )}
              <span className={cn('px-1 py-0.5 text-[7px] font-black rounded border uppercase tracking-wider leading-none', hStatus.color)}>
                H: {hScore}
              </span>
            </div>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
              {(rack.zone_name || '').split(' ')[0]}
            </p>
          </div>
          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5', cfg.dot)} />
        </div>

        {/* Occupancy data */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-slate-500">
            <span>{rack.current_capacity} / {rack.max_capacity} KG</span>
            <span className={cn(
              'font-black',
              cfg.badgeColor
            )}>
              {occ}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', cfg.bar)}
              style={{ width: `${Math.min(occ, 100)}%` }}
            />
          </div>
          <div className={cn('text-center text-[8px] font-black uppercase tracking-widest py-0.5 rounded-lg border', cfg.badge, 'text-opacity-80')}>
            {cfg.label}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 md:px-6 py-2">

      {/* CSS keyframes for material flow animations (Phase 4 Step 3) */}
      <style>{`
        @keyframes dotTravel {
          0%   { left: 0;                  opacity: 0; }
          10%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { left: calc(100% - 10px); opacity: 0; }
        }
        @keyframes flowBannerIn {
          from { opacity: 0; transform: translateY(-5px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-blue-500/30">
            <Layout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Warehouse Digital Twin
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100 rounded-full">
                <Activity className="w-2.5 h-2.5" />
                Phase 1.1
              </span>
            </h1>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.15em] mt-0.5">
              Industrial Floor Layout · Real-Time Slot Utilization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Synced {lastRefresh}
            </span>
          )}
          <Button
            onClick={() => fetchRackInventory(true)}
            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl shadow-sm text-xs"
          >
            <RefreshCw size={14} className="mr-1.5" />
            Sync Now
          </Button>
        </div>
      </div>

      {/* ── High Traffic Alert Block (Phase 4 Step 7) ───────────────────────── */}
      {highTrafficRack && (
        <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-orange-500/25 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-xl animate-bounce">
              🔥
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-1">
                🔥 HIGH TRAFFIC
              </h3>
              <p className="text-2xl font-black tracking-tight mt-0.5">
                Rack {highTrafficRack.rack_code}
              </p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex flex-col items-start sm:items-end">
            <span className="text-xs font-black uppercase tracking-wider text-orange-100">
              Movements Today: {highTrafficRack.count}
            </span>
          </div>
        </div>
      )}

      {/* ── Hot Zones Alerts ─────────────────────────────────────────────────── */}
      {hotZones.length > 0 && (
        <div className="bg-rose-50/70 border border-red-200 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-wider">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            Critical Alert: Hot Zones Detected
          </div>
          <div className="flex flex-wrap gap-3">
            {hotZones.map(rack => (
              <div key={rack.rack_code} className="bg-white border border-red-100 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-black text-slate-800 shadow-sm">
                <span className="text-base">🔥</span>
                <span className="text-red-600 uppercase tracking-wide">HOT ZONE</span>
                <span className="text-slate-305 font-bold">|</span>
                <span>Rack {rack.rack_code}</span>
                <span className="text-slate-305 font-bold">|</span>
                <span>Occupancy {rack.occupancy_percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Space Optimization Suggestions ────────────────────────────────────── */}
      {coldZones.length > 0 && (
        <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-sky-600 font-black text-xs uppercase tracking-wider">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-600"></span>
            </span>
            Space Optimization Suggestions
          </div>
          <div className="flex flex-col gap-2">
            {coldZones.map(rack => (
              <div key={rack.rack_code} className="bg-white border border-sky-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm text-xs text-slate-800">
                <div className="flex flex-wrap items-center gap-2 font-black">
                  <span className="text-base">❄</span>
                  <span className="text-sky-600 uppercase tracking-wide">COLD ZONE</span>
                  <span className="text-slate-300 font-bold">|</span>
                  <span>Rack {rack.rack_code}</span>
                  <span className="text-slate-300 font-bold">|</span>
                  <span>Occupancy {rack.occupancy_percentage}%</span>
                </div>
                <div className="bg-sky-50/80 text-sky-700 px-3 py-1.5 rounded-lg border border-sky-100 font-bold text-[10px] uppercase tracking-wide">
                  💡 Suggestion: Unused rack capacity available.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Summary KPI Strip ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Materials',
            value: stats ? stats.totalMaterials : '...',
            sub: 'Unique types stored',
            icon: Database,
            iconBg: 'bg-blue-50 text-blue-600',
            valColor: 'text-slate-800',
          },
          {
            label: 'Total Weight',
            value: stats ? `${stats.totalInventory.toLocaleString('en-IN')} KG` : '...',
            sub: 'Gross inventory weight',
            icon: Package,
            iconBg: 'bg-indigo-50 text-indigo-600',
            valColor: 'text-slate-800',
          },
          {
            label: 'Active Racks',
            value: stats ? `${stats.occupiedRacks} / ${totalRacks}` : '...',
            sub: 'Racks with inventory',
            icon: Layers,
            iconBg: 'bg-violet-50 text-violet-600',
            valColor: 'text-slate-800',
          },
          {
            label: 'Empty Racks',
            value: stats ? `${stats.emptyRacks} / ${totalRacks}` : '...',
            sub: 'Racks with no stock',
            icon: FolderOpen,
            iconBg: 'bg-slate-50 text-slate-650',
            valColor: 'text-slate-500',
          },
          {
            label: 'Warehouse Utilization',
            value: stats ? `${stats.utilizationPercentage}%` : '...',
            sub: 'Overall capacity filled',
            icon: TrendingUp,
            iconBg: 'bg-emerald-50 text-emerald-600',
            valColor: stats && stats.utilizationPercentage > 80 ? 'text-rose-600 font-extrabold' : 'text-emerald-650 font-black',
          },
          {
            label: 'Low Stock Materials',
            value: stats ? stats.lowStockMaterials : '...',
            sub: 'Materials below threshold',
            icon: AlertTriangle,
            iconBg: 'bg-rose-50 text-rose-600',
            valColor: stats && stats.lowStockMaterials > 0 ? 'text-rose-600 animate-pulse font-black' : 'text-slate-850',
          },
          {
            label: "Today's Inward",
            value: stats ? stats.todayInward : '...',
            sub: 'New batches received',
            icon: ArrowDownCircle,
            iconBg: 'bg-sky-50 text-sky-600',
            valColor: 'text-slate-800',
          },
          {
            label: "Today's Outward",
            value: stats ? stats.todayOutward : '...',
            sub: 'Dispatches processed',
            icon: ArrowUpCircle,
            iconBg: 'bg-orange-50 text-orange-600',
            valColor: 'text-slate-800',
          },
          {
            label: 'System Health Score',
            value: stats ? `${stats.systemHealthScore}%` : '...',
            sub: 'Racks safety average',
            icon: ShieldCheck,
            iconBg: 'bg-teal-50 text-teal-650',
            valColor: stats && stats.systemHealthScore < 70 ? 'text-rose-600 font-extrabold animate-pulse' : 'text-teal-650 font-black',
          },
          {
            label: 'AI Risk Score',
            value: stats ? `${stats.aiRiskScore}%` : '...',
            sub: 'Estimated stock risk',
            icon: Brain,
            iconBg: 'bg-purple-50 text-purple-600',
            valColor: stats && stats.aiRiskScore > 50 ? 'text-rose-600 font-extrabold animate-pulse' : 'text-purple-600 font-black',
          }
        ].map((item, idx) => {
          const IconComp = item.icon;
          return (
            <div key={idx} className="bg-white/70 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{item.label}</p>
                <h3 className={cn("text-xl font-black mt-1 truncate", item.valColor)}>{item.value}</h3>
                <p className="text-[9px] text-slate-450 font-bold mt-0.5 uppercase tracking-wider truncate">{item.sub}</p>
              </div>
              <div className={cn("p-2.5 rounded-xl flex-shrink-0 ml-2", item.iconBg)}>
                <IconComp className="w-4.5 h-4.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Main Split Dashboard Layout ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column (Zone Stats & Map) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Zone Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dynamicZoneConfig.map(zone => {
              const zoneStats = getZoneStats(zone.racks);
              const zoneRacks = racks.filter(r => zone.racks.includes(r.rack_code));
              const health = getZoneHealth(zoneStats.avgOccupancy, zoneRacks);
              const ZoneIcon = zone.icon;
              return (
                <div 
                  key={zone.zone_name}
                  className={cn(
                    "relative bg-white/70 backdrop-blur-md border rounded-2xl p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01] overflow-hidden",
                    zone.border,
                    health.cardBorder
                  )}
                >
                  <div className={cn("absolute -right-6 -bottom-6 w-20 h-20 rounded-full opacity-5 blur-xl", zone.bg)} />
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-2 rounded-xl", zone.bg, zone.color)}>
                        <ZoneIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider leading-none">
                          {zone.zone_name === 'RECEIVING ZONE' ? 'Zone A Health' :
                           zone.zone_name === 'DISPATCH ZONE' ? 'Zone C Health' :
                           `${zone.zone_name} Health`}
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{zoneStats.numRacks} Racks</p>
                      </div>
                    </div>

                    {/* Glowing Health Status Badge */}
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shadow-sm",
                      health.color
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", health.dot)} />
                      {health.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50/50 rounded-xl p-2 text-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                        Occupancy
                      </span>
                      <span className={cn("text-sm font-black tracking-tight", zone.color)}>
                        {zoneStats.avgOccupancy}%
                      </span>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-2 text-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                        Active Materials
                      </span>
                      <span className="text-sm font-black tracking-tight text-slate-800">
                        {zoneStats.totalMaterials}
                      </span>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-2 text-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                        Weight
                      </span>
                      <span className="text-sm font-black tracking-tight text-slate-800 truncate block">
                        {zoneStats.totalWeight} <span className="text-[9px] font-bold text-slate-400">KG</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Floor Map */}
          <div ref={containerRef} className="relative bg-white/60 backdrop-blur-md border border-slate-150 rounded-3xl shadow-sm overflow-hidden">
            
            {/* Map header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  Industrial Warehouse Floor Map
                </h2>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Click any rack to inspect details · Auto-refresh every 10s
                </p>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                {/* Heatmap Toggle Control */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
                  <button
                    onClick={() => setShowHeatmap(false)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                      !showHeatmap ? "bg-white text-slate-800 shadow-sm" : "text-slate-450 hover:text-slate-700"
                    )}
                  >
                    Layout View
                  </button>
                  <button
                    onClick={() => setShowHeatmap(true)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                      showHeatmap ? "bg-white text-slate-850 shadow-sm" : "text-slate-450 hover:text-slate-700"
                    )}
                  >
                    Heatmap View
                  </button>
                </div>

                {/* Live pulse indicator */}
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live
                </div>
              </div>
            </div>

            {/* Color legend above the map */}
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30 flex flex-wrap gap-4 items-center justify-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-2">Map Legend:</span>
              {showHeatmap ? (
                [
                  { dot: 'bg-green-500',  label: '0-30% = Green',   text: 'text-green-600 font-extrabold' },
                  { dot: 'bg-yellow-400',  label: '31-70% = Yellow', text: 'text-yellow-600 font-extrabold' },
                  { dot: 'bg-orange-500', label: '71-90% = Orange', text: 'text-orange-600 font-extrabold' },
                  { dot: 'bg-red-650',    label: '91-100% = Red',     text: 'text-red-600 font-extrabold' },
                  { dot: 'bg-red-600 animate-pulse border border-red-800 shadow',    label: '>100% = Flashing Red',     text: 'text-red-600 font-black animate-pulse' },
                ].map(({ dot, label, text }) => (
                  <div key={label} className={cn('flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider', text)}>
                    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dot)} />
                    {label}
                  </div>
                ))
              ) : (
                [
                  { dot: 'bg-slate-300', label: 'Gray = Empty',          text: 'text-slate-500' },
                  { dot: 'bg-emerald-500', label: 'Green = Healthy',   text: 'text-emerald-600' },
                  { dot: 'bg-amber-500',  label: 'Yellow = Medium Load', text: 'text-amber-600' },
                  { dot: 'bg-rose-500',   label: 'Red = High Load', text: 'text-rose-600' },
                ].map(({ dot, label, text }) => (
                  <div key={label} className={cn('flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider', text)}>
                    <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dot)} />
                    {label}
                  </div>
                ))
              )}
            </div>

            {/* ── Active Material Flow Animations (Phase 4 Step 3) ──────────── */}
            {activeFlows.length > 0 && (
              <div className="px-4 py-2.5 border-b border-slate-100 bg-white/40 space-y-1.5">
                {activeFlows.map(flow => (
                  <FlowAnimationBanner key={flow.id} flow={flow} />
                ))}
              </div>
            )}

            <div className="p-6">
              {loading ? (
                <div className="py-16">
                  <LoadingSpinner message="Loading warehouse floor layout..." />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Visual Inward/Outward terminals */}
                  <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50/50 border border-slate-100 p-3.5 rounded-2xl gap-3 shadow-inner">
                    <div ref={scannerRef} className="flex items-center gap-2.5 px-3 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl font-extrabold text-xs shadow-sm">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                      </span>
                      📥 Inbound Scan Terminal
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                      Live Flow Visualization Corridor
                    </div>
                    <div ref={dispatchRef} className="flex items-center gap-2.5 px-3 py-2 bg-orange-50 border border-orange-100 text-orange-700 rounded-xl font-extrabold text-xs shadow-sm">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-600"></span>
                      </span>
                      📤 Outbound Dispatch Port
                    </div>
                  </div>

                  {/* ── Material Locator Search Bar (Phase 6 Step 7) ──────────────── */}
                  <div className="bg-slate-50/60 border border-slate-200 p-4.5 rounded-2xl space-y-3.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 flex-shrink-0">
                        <span className="text-xs">🔍</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">
                          Material Locator Search
                        </h3>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          Locate items across racks instantly
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by Material Name, QR Code, or Batch Number..."
                        className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold shadow-sm"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-450 hover:bg-slate-100 hover:text-slate-700 text-[10px] font-black uppercase tracking-wider transition-all"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Search Results Display */}
                    {searchQuery.trim() && (
                      <div className="mt-2.5 pt-3 border-t border-slate-100 space-y-2.5">
                        <div className="flex justify-between items-center text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Search Results</span>
                          <span>{searchResults.length} Material{searchResults.length !== 1 ? 's' : ''} Found</span>
                        </div>
                        {searching ? (
                          <div className="py-6 flex justify-center">
                            <LoadingSpinner message="Searching materials..." />
                          </div>
                        ) : searchResults.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {searchResults.map((result: any, idx: number) => {
                              const targetRack = getRack(result.rack_code);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => handleSelectSearchResult(result)}
                                  className="bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-indigo-300 p-3.5 rounded-xl cursor-pointer transition-all duration-200 shadow-sm flex flex-col justify-between animate-in fade-in zoom-in-95 duration-200"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <span className="text-xs font-black text-slate-800">
                                        {result.material_name}
                                      </span>
                                      <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                        Location: Rack {result.rack_code} {targetRack ? `(${targetRack.zone_name})` : ''}
                                      </p>
                                    </div>
                                    {result.batch_number && (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[8px] font-bold text-slate-500">
                                        Batch: {result.batch_number}
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] font-bold text-slate-500 pt-2 border-t border-slate-100">
                                    <div><span className="text-slate-400 font-normal">Quantity:</span> {result.quantity} Units</div>
                                    <div><span className="text-slate-400 font-normal">Weight:</span> {result.weight} KG</div>
                                    {result.barcode && (
                                      <div className="col-span-2"><span className="text-slate-400 font-normal">QR Code:</span> {result.barcode}</div>
                                    )}
                                    {result.last_scan_time && (
                                      <div className="col-span-2"><span className="text-slate-400 font-normal">Last Scan:</span> {formatDateTime(result.last_scan_time)}</div>
                                    )}
                                    
                                    {/* Movement History */}
                                    {result.movement_history && result.movement_history.length > 0 && (
                                      <div className="col-span-2 mt-2 pt-2 border-t border-dashed border-slate-100 space-y-1">
                                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">Movement History</span>
                                        {result.movement_history.slice(0, 3).map((h: any, hIdx: number) => (
                                          <div key={hIdx} className="flex justify-between items-center text-[8px] font-medium text-slate-500">
                                            <span className="truncate max-w-[150px] font-bold text-slate-600">
                                              {h.remarks || `${h.action} in Rack ${h.rack_code}`}
                                            </span>
                                            <span className="text-[7.5px] text-slate-400 flex-shrink-0 font-mono">
                                              {h.timestamp ? new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-[10px] text-slate-400 font-bold bg-white border border-slate-100 rounded-xl animate-in fade-in duration-200">
                            No materials matching "{searchQuery}" located in any rack.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {dynamicZoneConfig.map((zone, zoneIdx) => {
                    const ZoneIcon = zone.icon;
                    return (
                      <div key={zone.zone_name}>
                        {/* Zone label header */}
                        <div className={cn(
                          'flex items-center justify-between px-4 py-2.5 rounded-xl mb-3 border',
                          zone.bg, zone.border
                        )}>
                          <div className="flex items-center gap-2.5">
                            <div className={cn('p-1.5 rounded-lg', zone.bg, zone.color)}>
                              <ZoneIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className={cn('text-xs font-black uppercase tracking-widest', zone.color)}>
                                {zone.zone_name}
                              </span>
                              <p className="text-[9px] text-slate-400 font-bold mt-0.5">{zone.label}</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest">
                            Slots {zone.racks[0]} – {zone.racks[zone.racks.length - 1]}
                          </span>
                        </div>

                        {/* 4-column rack grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {zone.racks.map(code => renderRackCell(code))}
                        </div>

                        {/* Aisle divider between zones */}
                        {zoneIdx < dynamicZoneConfig.length - 1 && (
                          <div className="mt-5 h-8 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
                            <span className="text-[9px] font-black text-slate-355 uppercase tracking-[0.2em] select-none">
                              ⟵ Forklift Aisle {String.fromCharCode(65 + zoneIdx)}-{String.fromCharCode(66 + zoneIdx)} ⟶
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Flowing visual particles overlay */}
            {particles.map(p => (
              <div
                key={p.id}
                className={cn(
                  "absolute pointer-events-none z-30 flex items-center justify-center rounded-full w-9 h-9 shadow-lg",
                  p.isInward 
                    ? "bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/40" 
                    : "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-orange-500/40"
                )}
                style={{
                  left: 0,
                  top: 0,
                  transform: `translate3d(${p.currentX - 18}px, ${p.currentY - 18}px, 0)`,
                  transition: 'transform 2.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                }}
              >
                <Package className="w-4.5 h-4.5 animate-bounce" />
                <div className={cn(
                  "absolute -top-6 whitespace-nowrap px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shadow-sm",
                  p.isInward 
                    ? "bg-indigo-900 text-white border-indigo-700" 
                    : "bg-orange-900 text-white border-orange-700"
                )}>
                  {p.materialName.slice(0, 10)}
                </div>
              </div>
            ))}

          {/* AI Recommendation Panel */}
            <div className="bg-white/60 backdrop-blur-md border border-slate-150 rounded-3xl shadow-sm overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                    <Brain className="w-4 h-4 text-blue-550 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">
                      AI Recommendation Panel
                    </h2>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                      Occupancy Balancing & Smart Slot Consolidation
                    </p>
                  </div>
                </div>
                <div className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Auto-refresh 5m
                </div>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Current Rack</th>
                        <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Suggested Rack</th>
                        <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">AI Intelligent Recommendation</th>
                        <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Occupancy Improvement</th>
                        <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rackOptimizations.map((opt, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                          <td className="py-4 text-center">
                            <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-mono font-black rounded-lg border border-slate-200 text-xs shadow-sm">
                              {opt.current_rack}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            {opt.suggested_rack ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-slate-300 text-xs font-bold">⟶</span>
                                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-mono font-black rounded-lg border border-blue-200 text-xs shadow-sm">
                                  {opt.suggested_rack}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-bold text-xs">—</span>
                            )}
                          </td>
                          <td className="py-4">
                            <p className="font-extrabold text-slate-800 text-xs leading-normal">{opt.suggestion}</p>
                          </td>
                          <td className="py-4">
                            <p className="text-xs font-bold text-slate-500 leading-normal">{opt.expected_improvement || opt.occupancy_improvement}</p>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex justify-center">
                              <span className={cn(
                                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                opt.priority_score === 'CRITICAL' ? "bg-red-600 text-white border-red-700 shadow-sm shadow-red-200" :
                                opt.priority_score === 'HIGH' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                opt.priority_score === 'MEDIUM' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-emerald-50 text-emerald-700 border-emerald-200"
                              )}>
                                {opt.priority_score}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {rackOptimizations.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center">
                            <p className="text-xs font-bold text-slate-400">All racks balanced perfectly. No layout suggestions generated.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column (Health Score + Live Movement Feed) */}
        <div className="lg:col-span-1 space-y-6">

          {/* ── Warehouse Utilization Gauge Widget ───────────────────────────── */}
          <div className="bg-white/70 backdrop-blur-md border border-slate-150 rounded-3xl p-5 shadow-sm space-y-5">
            <div>
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                Warehouse Utilization
              </h2>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                Control Room Diagnostics
              </p>
            </div>

            {/* SVG Gauge Chart */}
            <div className="flex flex-col items-center justify-center pt-2">
              <svg className="w-36 h-20 overflow-visible" viewBox="0 0 120 70">
                {/* Background Arc */}
                <path
                  d="M 10,60 A 50,50 0 0,1 110,60"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* Foreground Arc */}
                <path
                  d="M 10,60 A 50,50 0 0,1 110,60"
                  fill="none"
                  stroke={utilBarColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={gaugeHalfCircumference}
                  strokeDashoffset={utilStrokeOffset}
                  className="transition-all duration-1000 ease-out"
                />
                {/* Text inside the gauge */}
                <text x="60" y="52" textAnchor="middle" className="text-xl font-black fill-slate-900 leading-none font-mono">
                  {avgUtil}%
                </text>
                <text x="60" y="68" textAnchor="middle" className="text-[6.5px] font-black uppercase tracking-wider fill-slate-400">
                  UTILIZATION
                </text>
              </svg>

              {/* Status Badge */}
              <span className={cn(
                'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border mt-3',
                utilColor
              )}>
                {utilLabel}
              </span>
            </div>

            {/* Metrics Breakdown list */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              {[
                { label: 'Avg Occupancy', value: `${avgUtil}%` },
                { label: 'Active Alerts', value: activeAlertsCount, isCritical: activeAlertsCount > 0 },
                { label: 'Critical Stock', value: criticalStockCount, isWarning: criticalStockCount > 0 },
                { label: 'Overloaded Racks', value: overloadCount, isCritical: overloadCount > 0 }
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span className="text-slate-400 font-black uppercase tracking-wider">{item.label}</span>
                  <span className={cn(
                    "font-black text-xs font-mono",
                    item.isCritical ? "text-red-655 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-lg" : 
                    item.isWarning ? "text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-lg" : 
                    "text-slate-850"
                  )}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Live Movement Feed ───────────────────────────────────────────── */}
          <div className="bg-white/70 backdrop-blur-md border border-slate-150 rounded-3xl shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">
                    Live Movement Feed
                  </h2>
                  <p className="text-[8px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
                    Latest 20 · Auto-refresh 10s
                  </p>
                </div>
              </div>
              {/* Live pulse */}
              <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-500 uppercase tracking-wider">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600" />
                </span>
                Live
              </div>
            </div>

            {/* Scrollable feed */}
            <div className="overflow-y-auto max-h-[420px] divide-y divide-slate-50">
              {movements.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-300">
                  <Activity className="w-8 h-8" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">No movements yet</p>
                  <p className="text-[8px] text-slate-300">Trigger a scan to see live data</p>
                </div>
              ) : (
                movements.map((mv: any, idx: number) => {
                  const isInward = mv.movement_type === 'INWARD';
                  return (
                    <div
                      key={mv.id ?? idx}
                      className="px-4 py-3 hover:bg-slate-50/60 transition-colors duration-150 group"
                    >
                      {/* Top row: time badge + movement type chip */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          <Clock className="w-2.5 h-2.5" />
                          {formatMovementTime(mv.timestamp)}
                        </span>
                        <span className={cn(
                          'text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                          isInward
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-orange-50 text-orange-700 border-orange-100'
                        )}>
                          {isInward ? '⬇ Inward' : '⬆ Outward'}
                        </span>
                      </div>

                      {/* Human-friendly timeline message */}
                      <p className="text-xs font-semibold text-slate-700 leading-normal">
                        {isInward
                          ? `${mv.material_name || mv.barcode_id || 'Material'} inwarded to ${mv.destination_location || 'Warehouse'}`
                          : `${mv.material_name || mv.barcode_id || 'Material'} outwarded from ${mv.source_location || 'Warehouse'}`
                        }
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {movements.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                <p className="text-[8px] font-black text-slate-350 uppercase tracking-wider text-center">
                  Showing {movements.length} recent movement{movements.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Side Drawer ──────────────────────────────────────────────────────── */}
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div className={cn(
        'fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col',
        'bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl',
        'transition-transform duration-300 ease-in-out',
        drawerOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {selectedRack && (() => {
          const displayRack = selectedRackDetails || selectedRack;
          const occ = displayRack.occupancy_percentage;
          const cfg = getRackDisplayConfig(occ);
          return (
            <>
              {/* Drawer header */}
              <div className={cn(
                'flex items-start justify-between p-6 border-b border-slate-100',
                'bg-gradient-to-r from-slate-50 to-white'
              )}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                      Slot Inspector
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {displayRack.rack_code}
                  </h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">{displayRack.zone_name}</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Occupancy Status
                  </span>
                  <span className={cn(
                    'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5',
                    cfg.badge
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                    {cfg.label}
                  </span>
                </div>

                {/* Occupancy visual */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Occupancy
                    </span>
                    <span className={cn('text-2xl font-black', cfg.bar.replace('bg-', 'text-'))}>
                      {occ}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700', cfg.bar)}
                      style={{ width: `${Math.min(occ, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-500">
                    <span>{displayRack.current_capacity} KG</span>
                    <span>{displayRack.max_capacity} KG MAX</span>
                  </div>
                </div>

                {/* Capacity info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Database, label: 'Rack Code',        value: displayRack.rack_code,         mono: true  },
                    { icon: MapPin,   label: 'Zone',             value: displayRack.zone_name,          mono: false },
                    { icon: Layers,   label: 'Current Weight',   value: `${displayRack.current_capacity} KG`, mono: false },
                    { icon: TrendingUp, label: 'Max Capacity',   value: `${displayRack.max_capacity} KG`,     mono: false },
                  ].map(({ icon: Icon, label, value, mono }) => (
                    <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
                      </div>
                      <p className={cn('text-sm font-black text-slate-800 break-all', mono && 'font-mono')}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Occupancy % detail */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Occupancy %</span>
                  </div>
                  <p className="text-2xl font-black text-slate-800">{occ}%</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">
                    {occ === 0 ? 'Rack is empty — ready for storage'
                      : occ < 20 ? 'Rack is underutilized (Cold Zone)'
                      : occ <= 40 ? 'Rack is safely loaded'
                      : occ <= 80 ? 'Approaching high utilization — monitor closely'
                      : 'Critical load — consider redistribution'}
                  </p>
                </div>

                {occ > 0 && occ < 20 && (
                  <div className="bg-sky-50 border border-sky-100 text-sky-800 rounded-xl p-4 space-y-1 shadow-sm">
                    <div className="flex items-center gap-1.5 text-sky-600 font-black text-[9px] uppercase tracking-widest">
                      <span>💡</span> Space Optimization Suggestion
                    </div>
                    <p className="text-xs font-bold leading-normal text-slate-800 mt-1">
                      Unused rack capacity available.
                    </p>
                  </div>
                )}

                {/* ── Materials Inside ─────────────────────────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                      Materials Inside
                    </span>
                    <span className={cn(
                      'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border',
                      selectedRackDetails && selectedRackDetails.materials.length > 0
                        ? 'bg-blue-50 text-blue-600 border-blue-100'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    )}>
                      {selectedRackDetails ? `${selectedRackDetails.materials.length} item${selectedRackDetails.materials.length !== 1 ? 's' : ''}` : 'Loading...'}
                    </span>
                  </div>

                  {loadingMaterials && !selectedRackDetails ? (
                    <div className="py-8">
                      <LoadingSpinner message="Fetching materials..." />
                    </div>
                  ) : selectedRackDetails && selectedRackDetails.materials.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRackDetails.materials.map((mat: any) => {
                        const stock = mat.quantity;
                        const threshold = mat.threshold_limit || 0;
                        let status: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
                        let badgeClass = '';

                        if (stock <= threshold) {
                          status = 'Critical';
                          badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                        } else if (stock <= threshold * 1.5) {
                          status = 'Warning';
                          badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                        } else {
                          status = 'Healthy';
                          badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        }

                        return (
                          <div
                            key={mat.id || mat.material_name}
                            className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all duration-200 space-y-2.5"
                          >
                            {/* Header row */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  'w-3 h-3 rounded-full flex-shrink-0',
                                  getPaintDot(mat.material_name)
                                )} />
                                <span className="text-xs font-black text-slate-800 truncate">
                                  {mat.material_name}
                                </span>
                              </div>
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border',
                                badgeClass
                              )}>
                                {status}
                              </span>
                            </div>

                            {/* Details layout */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold border-t border-slate-100 pt-2">
                              <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Quantity</span>
                                <span>{mat.quantity} {mat.unit}</span>
                              </div>
                              <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Threshold</span>
                                <span>{threshold} {mat.unit}</span>
                              </div>
                            </div>

                            {/* Extra details (weight / batch) */}
                            <div className="flex justify-between items-center text-[9px] text-slate-400 border-t border-slate-50 pt-1.5 mt-1 font-semibold">
                              <span>Weight: {mat.weight} KG</span>
                              {mat.batch_number && (
                                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold text-[8px] uppercase tracking-wider">
                                  Batch: {mat.batch_number}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Total details card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            Total Materials
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {selectedRackDetails.summary.total_materials} Unique Entry{selectedRackDetails.summary.total_materials !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-150 pt-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            Total Weight
                          </span>
                          <span className="text-sm font-black text-slate-800">
                            {selectedRackDetails.summary.total_weight.toFixed(1)} KG
                            <span className="text-[9px] font-bold text-slate-400 ml-1.5">
                              / {displayRack.max_capacity} KG Max
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        No Materials Stored
                      </p>
                      <p className="text-[9px] text-slate-300 mt-1">This rack is currently empty.</p>
                    </div>
                  )}
                </div>

                {/* Last Scan Time */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Last Scan Time</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {formatDateTime(displayRack.last_scan || displayRack.last_updated || displayRack.updated_at)}
                  </p>
                </div>

                {/* Rack ID footer */}
                <div className="text-center pt-1">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    Rack DB ID: #{displayRack.id}
                  </span>
                </div>
              </div>

              {/* Drawer footer */}

              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Close Inspector
                </button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default WarehouseTwin;

import React from 'react';
import {
  X,
  MapPin,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  ShieldCheck,
  QrCode
} from 'lucide-react';

export interface SelectedRackDetails {
  id: string | number;
  rack_code: string;
  material_name?: string | null;
  batch_number?: string | null;
  quantity: number;
  max_capacity: number;
  threshold_limit: number;
  occupancy_percentage: number;
  status_color?: string;
}

export interface RackDrillDownModalProps {
  rack: SelectedRackDetails | null;
  onClose: () => void;
}

export const RackDrillDownModal: React.FC<RackDrillDownModalProps> = ({ rack, onClose }) => {
  if (!rack) return null;

  const qty = typeof rack.quantity === 'number' ? rack.quantity : parseFloat(String(rack.quantity)) || 0;
  const maxCap = typeof rack.max_capacity === 'number' ? rack.max_capacity : parseFloat(String(rack.max_capacity)) || 100;
  const minLimit = typeof rack.threshold_limit === 'number' ? rack.threshold_limit : parseFloat(String(rack.threshold_limit)) || 10;
  
  const isEmpty = qty === 0 || !rack.material_name;
  const isCritical = qty > 0 && qty <= minLimit;
  const pct = rack.occupancy_percentage !== undefined ? rack.occupancy_percentage : (maxCap > 0 ? parseFloat(((qty / maxCap) * 100).toFixed(1)) : 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-6 text-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
              <MapPin className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Rack Drill-Down Inspection
              </span>
              <h2 className="text-xl font-extrabold text-white font-mono tracking-tight mt-0.5">
                Rack {rack.rack_code}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Status Banner */}
        <div
          className={`flex items-center justify-between rounded-2xl border p-4 backdrop-blur-md ${
            isEmpty
              ? 'border-slate-800 bg-slate-950/60 text-slate-400'
              : isCritical
              ? 'border-rose-500/40 bg-rose-950/30 text-rose-300 animate-pulse'
              : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {isEmpty ? (
              <Inbox className="h-5 w-5 text-slate-400" />
            ) : isCritical ? (
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                {isEmpty ? 'Empty Rack Slot' : isCritical ? 'Critical Safety Alert' : 'Active Stocked Slot'}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {isEmpty
                  ? 'Slot available for material inward assignment'
                  : isCritical
                  ? `Stock (${qty} KG) is below safety limit (${minLimit} KG)`
                  : 'Operating within normal safety thresholds'}
              </p>
            </div>
          </div>
          <span className="font-mono text-sm font-bold">{pct}% Fill</span>
        </div>

        {/* Occupancy Fill Progress Bar */}
        <div className="space-y-1.5 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-400">Volume Occupancy Progress</span>
            <span className="font-mono text-slate-200 font-bold">{pct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pct <= 40 ? 'bg-emerald-500' : pct <= 80 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
            <span>Stored: {qty.toLocaleString()} Units</span>
            <span>Capacity: {maxCap >= 99999999 ? 'Unlimited' : `${maxCap.toLocaleString()} Units`}</span>
          </div>
        </div>

        {/* Material & Batch Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Database className="h-3.5 w-3.5 text-cyan-400" /> Stored Material
            </span>
            <p className="font-bold text-slate-100 truncate text-sm">
              {rack.material_name || 'No Material Assigned'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Clock className="h-3.5 w-3.5 text-amber-400" /> Batch Number
            </span>
            <p className="font-bold text-slate-100 font-mono truncate text-sm">
              {rack.batch_number || 'N/A'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Safety Limit
            </span>
            <p className="font-bold text-slate-100 font-mono text-sm">
              {minLimit.toLocaleString()} Units
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <QrCode className="h-3.5 w-3.5 text-violet-400" /> Tracking Status
            </span>
            <p className="font-bold text-slate-100 text-sm">
              {isEmpty ? 'Unassigned' : 'Live Sync Active'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-cyan-600 py-3 text-xs font-bold text-white hover:bg-cyan-500 transition-all cursor-pointer shadow-lg shadow-cyan-600/20"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};

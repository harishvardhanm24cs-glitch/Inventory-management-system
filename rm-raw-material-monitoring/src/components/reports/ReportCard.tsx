import React from 'react';
import { Eye, Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ReportOption {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  colorClass: string;
  endpoint: string;
}

export interface ReportCardProps {
  option: ReportOption;
  onAction: (endpoint: string, action: 'preview' | 'download', reportId: string, format: 'pdf' | 'csv' | 'excel') => void;
  loading: boolean;
}

export const ReportCard: React.FC<ReportCardProps> = ({ option, onAction, loading }) => {
  const Icon = option.icon;

  return (
    <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border p-2.5 ${option.colorClass}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span className="rounded-full bg-slate-950 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-400 border border-slate-800 uppercase tracking-wider">
            {option.endpoint}
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
            {option.label}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {option.desc}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2.5">
        {/* PDF Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onAction(option.endpoint, 'preview', option.id, 'pdf')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" /> Preview PDF
          </button>
          <button
            onClick={() => onAction(option.endpoint, 'download', option.id, 'pdf')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-all cursor-pointer shadow-lg shadow-cyan-600/20 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Get PDF
          </button>
        </div>

        {/* Excel & CSV Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onAction(option.endpoint, 'download', option.id, 'excel')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-950/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Excel (.xls)
          </button>
          <button
            onClick={() => onAction(option.endpoint, 'download', option.id, 'csv')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-blue-400 hover:bg-blue-950/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <FileText className="h-3.5 w-3.5 text-blue-400" /> CSV Sheet
          </button>
        </div>
      </div>
    </div>
  );
};

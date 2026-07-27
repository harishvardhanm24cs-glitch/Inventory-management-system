import React from 'react';
import { Calendar, ShieldCheck, Sparkles, Activity } from 'lucide-react';

export interface ExecutiveHeaderProps {
  userName?: string;
}

export const ExecutiveHeader: React.FC<ExecutiveHeaderProps> = ({ userName = 'Executive Manager' }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Executive Dashboard
          </h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            Live Insights
          </span>
        </div>
        <p className="text-sm text-slate-500 font-medium">
          Welcome back, <span className="font-semibold text-slate-700">{userName}</span>. Here is your real-time operational overview for <span className="font-semibold text-slate-700">{currentDate}</span>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{currentDate}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>System Operational</span>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveHeader;

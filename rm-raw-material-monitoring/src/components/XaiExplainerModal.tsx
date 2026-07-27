import React from 'react';
import type { XaiExplanation } from '../services/xaiService';
import {
  HelpCircle, X, ShieldCheck, Database, ArrowRight, CheckCircle2,
  TrendingUp, AlertTriangle, Layers, Cpu, Eye
} from 'lucide-react';

interface XaiExplainerModalProps {
  explanation: XaiExplanation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const XaiExplainerModal: React.FC<XaiExplainerModalProps> = ({ explanation, isOpen, onClose }) => {
  if (!isOpen || !explanation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">Explainable AI (XAI) Audit Breakdown</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  No Black-Box Output
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">Target: {explanation.target_name || explanation.target_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Prediction Banner & Confidence Score */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">1. Output Prediction Directive</div>
              <h4 className="text-sm font-bold text-white">{explanation.prediction}</h4>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center shrink-0">
              <div className="text-[10px] text-slate-400 font-mono">2. CONFIDENCE SCORE</div>
              <div className="text-lg font-extrabold text-emerald-400 font-mono flex items-center justify-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {explanation.confidence_score}%
              </div>
            </div>
          </div>

          {/* 3. Key Factors (Feature Influence Weights sum = 1.0) */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-indigo-400" /> 3. Key Influencing Factors (Feature Weight Attribution)</span>
              <span className="text-[10px] font-mono text-emerald-400 font-normal">Normalized Sum = 100%</span>
            </h4>
            <div className="space-y-3">
              {(explanation.key_factors || []).map((factor, idx) => {
                const pct = Math.round((factor.weight || 0.33) * 100);
                let impactColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                if (factor.impact === 'NEGATIVE') impactColor = 'bg-red-500/20 text-red-300 border-red-500/30';
                else if (factor.impact === 'POSITIVE') impactColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-white flex items-center gap-2">
                        {factor.factor_name}
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${impactColor}`}>
                          {factor.impact}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-indigo-300">{pct}% Weight</span>
                    </div>
                    {/* Weight Bar */}
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          factor.impact === 'NEGATIVE' ? 'bg-red-400' : factor.impact === 'POSITIVE' ? 'bg-emerald-400' : 'bg-blue-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{factor.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Reasoning (Human-Readable Narrative) */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" /> 4. Step-by-Step Explanatory Reasoning
            </h4>
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed font-mono">
              {(explanation.reasoning || []).map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold shrink-0">{idx + 1}.</span>
                  <span>{step.replace(/^[0-9]+\.\s*/, '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Suggested Action Directive */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 space-y-1">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">5. Operational Directive (Suggested Action)</div>
            <div className="text-xs text-amber-200 font-semibold flex items-center gap-2">
              <ArrowRight className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{explanation.suggested_action}</span>
            </div>
          </div>

          {/* 6. Data Sources Lineage Audit */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-cyan-400" /> 6. Telemetry Data Sources Lineage Audit
            </h4>
            <div className="flex flex-wrap gap-2">
              {(explanation.data_sources_used || []).map((src, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 font-mono text-[11px] text-cyan-300 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                  {src}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold"
          >
            Close Audit Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default XaiExplainerModal;

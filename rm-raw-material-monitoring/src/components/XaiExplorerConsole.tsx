import React from 'react';
import useXai, { type XaiPortal } from '../hooks/useXai';
import XaiExplainerModal from './XaiExplainerModal';
import {
  Eye, RefreshCw, Layers, ShieldCheck, Database, ArrowRight, Sparkles,
  LayoutDashboard, Box, FileText, UserCheck, HelpCircle
} from 'lucide-react';

const PORTAL_CONFIG: Record<XaiPortal, { label: string; icon: any; description: string }> = {
  Dashboard: { label: 'Dashboard Portal', icon: LayoutDashboard, description: 'Executive-level summary transparency explanations' },
  'Digital Twin': { label: 'Digital Twin Portal', icon: Box, description: 'Spatial 3D/2D node-level asset explanations' },
  Reports: { label: 'Reports Portal', icon: FileText, description: 'Audit-ready tabular report explanations' },
  'Manager Portal': { label: 'Manager Portal', icon: UserCheck, description: 'Actionable manager decision audit trails' }
};

export const XaiExplorerConsole: React.FC = () => {
  const {
    activePortal,
    setActivePortal,
    portalData,
    selectedExplanation,
    modalOpen,
    setModalOpen,
    inspectMaterialXai,
    inspectRackXai,
    openExplanationModal,
    loading,
    error,
    refresh
  } = useXai();

  // Extract explanation list based on portal adapter
  let explanationsList: any[] = [];
  if (activePortal === 'Dashboard' && portalData?.summary) {
    if (portalData.summary.inventory_health_explanation) explanationsList.push(portalData.summary.inventory_health_explanation);
    if (portalData.summary.rack_utilization_explanation) explanationsList.push(portalData.summary.rack_utilization_explanation);
  } else if (activePortal === 'Digital Twin' && portalData?.spatial_explanations) {
    explanationsList = portalData.spatial_explanations;
  } else if (activePortal === 'Reports' && portalData?.explanations) {
    explanationsList = portalData.explanations;
  } else if (activePortal === 'Manager Portal' && portalData?.escalated_explanations) {
    explanationsList = portalData.escalated_explanations;
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg shadow-indigo-500/20">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">Explainable AI (XAI) System</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Decoupled XAI Layer
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Transparent AI Explanations · Feature Weighting · Data Sources Lineage Audit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Portal XAI
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Portal Adapter Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(PORTAL_CONFIG) as XaiPortal[]).map(pKey => {
            const conf = PORTAL_CONFIG[pKey];
            const Icon = conf.icon;
            const isSelected = activePortal === pKey;

            return (
              <button
                key={pKey}
                onClick={() => setActivePortal(pKey)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected ? 'ring-2 ring-indigo-500/50 bg-indigo-950/30 border-indigo-500/40' : 'bg-slate-950/40 hover:bg-slate-800/40 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{conf.label}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">{conf.description}</div>
              </button>
            );
          })}
        </div>

        {/* Current Portal Description Banner */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-300 font-medium">
              Active Adapter: <strong className="text-white">{PORTAL_CONFIG[activePortal].label}</strong> — {portalData?.description || 'Reusable XAI Service Adapter'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{explanationsList.length} items explained</span>
        </div>

        {/* Explanations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {explanationsList.length === 0 ? (
            <div className="col-span-2 p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
              No explanation records available for selected portal adapter.
            </div>
          ) : (
            explanationsList.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white truncate max-w-[200px]">
                      {item.target_name || item.target_id || item.prediction}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      {item.confidence_score}% Confidence
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 line-clamp-2">
                    {item.prediction}
                  </p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(item.data_sources_used || []).slice(0, 3).map((src: string, sIdx: number) => (
                      <span key={sIdx} className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {src}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">XAI ID: {item.id}</span>
                  <button
                    onClick={() => openExplanationModal(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white font-semibold text-xs border border-indigo-500/30 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect Explanation
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reusable Audit Modal */}
      <XaiExplainerModal
        explanation={selectedExplanation}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default XaiExplorerConsole;

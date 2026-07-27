import React, { useState } from 'react';
import useMlPipeline from '../hooks/useMlPipeline';
import type { MlFramework } from '../services/mlPipelineService';
import {
  Database, Play, Download, RefreshCw, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Layers, Cpu, BarChart3, FileJson
} from 'lucide-react';

const FRAMEWORKS: { id: MlFramework; label: string; color: string; icon: string }[] = [
  { id: 'tensorflow',   label: 'TensorFlow',   color: 'bg-orange-500/10 border-orange-500/40 text-orange-300', icon: '🔶' },
  { id: 'pytorch',      label: 'PyTorch',       color: 'bg-red-500/10 border-red-500/40 text-red-300',         icon: '🔥' },
  { id: 'scikit-learn', label: 'Scikit-Learn',  color: 'bg-blue-500/10 border-blue-500/40 text-blue-300',       icon: '🔵' },
  { id: 'onnx',         label: 'ONNX',          color: 'bg-purple-500/10 border-purple-500/40 text-purple-300', icon: '🟣' },
];

export const MlPipelineConsole: React.FC = () => {
  const { status, datasets, lastRun, exportData, loading, running, exporting, error, refresh, runPipeline, exportFramework } = useMlPipeline();
  const [showExport, setShowExport] = useState(false);
  const [activeFramework, setActiveFramework] = useState<MlFramework | null>(null);
  const [showCode, setShowCode] = useState(false);

  const handleExport = async (fw: MlFramework) => {
    setActiveFramework(fw);
    setShowExport(true);
    setShowCode(false);
    await exportFramework(fw);
  };

  const getCodeSnippet = () => {
    if (!exportData) return '';
    return (
      exportData.tf_dataset_init_code ||
      exportData.pytorch_dataset_init_code ||
      exportData.sklearn_init_code ||
      exportData.onnx_runtime_init_code ||
      '# No code snippet available'
    );
  };

  const downloadExport = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml_dataset_${activeFramework || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">ML Data Pipeline Console</h3>
            <p className="text-xs text-slate-400 mt-0.5">Automated Dataset Builder · TensorFlow · PyTorch · Scikit-Learn · ONNX</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border ${
            status?.pipeline_status === 'HEALTHY' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status?.pipeline_status === 'HEALTHY' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {status?.pipeline_status || 'Checking...'}
          </span>
          <button onClick={refresh} disabled={loading} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Operational Data Sources Summary */}
        {status && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Database className="w-3.5 h-3.5" /> Operational Data Sources (Read-Only)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: 'Inventory', value: status.operational_sources.inventory_records, color: 'text-blue-400' },
                { label: 'Transactions', value: status.operational_sources.transaction_records, color: 'text-indigo-400' },
                { label: 'Scanner Events', value: status.operational_sources.scan_events, color: 'text-cyan-400' },
                { label: 'Rack States', value: status.operational_sources.rack_records, color: 'text-violet-400' },
                { label: 'Alerts', value: status.operational_sources.alert_records, color: 'text-amber-400' },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
                  <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                  <div className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wide">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline Control */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Play className="w-3.5 h-3.5" /> Pipeline Execution
          </h4>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => runPipeline()}
              disabled={running}
              id="ml-pipeline-run-btn"
              className={`flex-1 flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm border transition-all ${
                running
                  ? 'bg-violet-900/40 border-violet-500/30 text-violet-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-600 to-purple-600 border-violet-500/50 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40'
              }`}
            >
              {running ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Running Pipeline...</>
              ) : (
                <><Play className="w-4 h-4" /> Run ML Data Pipeline</>
              )}
            </button>
          </div>

          {/* Last Run Summary */}
          {lastRun && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-300">Pipeline Completed: {lastRun.dataset_info?.dataset_name}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-900/60 rounded-lg">
                  <div className="text-slate-400">Records Processed</div>
                  <div className="font-bold text-white">{lastRun.cleaning_stats?.total_records_processed}</div>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg">
                  <div className="text-slate-400">Duplicates Removed</div>
                  <div className="font-bold text-amber-400">
                    {(lastRun.cleaning_stats?.inventory_duplicates_removed || 0) +
                     (lastRun.cleaning_stats?.transactions_duplicates_removed || 0) +
                     (lastRun.cleaning_stats?.racks_duplicates_removed || 0) +
                     (lastRun.cleaning_stats?.alerts_duplicates_removed || 0)}
                  </div>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg">
                  <div className="text-slate-400">Dataset Version</div>
                  <div className="font-bold text-white">{lastRun.dataset_info?.version}</div>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg">
                  <div className="text-slate-400">Saved At</div>
                  <div className="font-bold text-white">{lastRun.dataset_info?.saved_at ? new Date(lastRun.dataset_info.saved_at).toLocaleTimeString() : '—'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ML Framework Export Controls */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileJson className="w-3.5 h-3.5" /> Export for ML Framework
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FRAMEWORKS.map(fw => (
              <button
                key={fw.id}
                onClick={() => handleExport(fw.id)}
                disabled={exporting}
                id={`ml-export-${fw.id}-btn`}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${fw.color} ${
                  activeFramework === fw.id && exporting ? 'animate-pulse opacity-70' : ''
                } ${activeFramework === fw.id && !exporting && exportData ? 'ring-2 ring-white/20' : ''}`}
              >
                <span className="text-2xl">{fw.icon}</span>
                <span className="text-xs font-bold">{fw.label}</span>
                {activeFramework === fw.id && exporting && (
                  <RefreshCw className="w-3 h-3 animate-spin mt-0.5" />
                )}
              </button>
            ))}
          </div>

          {/* Export Preview Panel */}
          {showExport && exportData && (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/80 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                <span className="text-sm font-bold text-slate-200">
                  {FRAMEWORKS.find(f => f.id === activeFramework)?.icon} {exportData.framework} Export Preview
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowCode(s => !s)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded bg-slate-800">
                    Code Snippet {showCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button onClick={downloadExport} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 px-3 py-1.5 rounded-lg transition-colors">
                    <Download className="w-3 h-3" /> Download JSON
                  </button>
                </div>
              </div>

              {/* Metadata row */}
              <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-slate-800">
                <div><span className="text-slate-500">Framework: </span><span className="font-mono text-emerald-300">{exportData.framework}</span></div>
                {exportData.shape && <div><span className="text-slate-500">Tensor Shape: </span><span className="font-mono text-blue-300">[{exportData.shape.join(', ')}]</span></div>}
                {exportData.tensors?.features?.shape && <div><span className="text-slate-500">Feature Shape: </span><span className="font-mono text-blue-300">[{exportData.tensors.features.shape.join(', ')}]</span></div>}
                {exportData.feature_names && <div><span className="text-slate-500">Features: </span><span className="font-mono text-purple-300">{exportData.feature_names.length}</span></div>}
                {exportData.tf_version_compatibility && <div><span className="text-slate-500">TF Version: </span><span className="font-mono text-orange-300">{exportData.tf_version_compatibility}</span></div>}
                {exportData.onnx_ir_version && <div><span className="text-slate-500">ONNX IR: </span><span className="font-mono text-purple-300">v{exportData.onnx_ir_version}</span></div>}
              </div>

              {/* Code Snippet */}
              {showCode && (
                <div className="p-4">
                  <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed overflow-x-auto bg-slate-900/80 p-3 rounded-lg border border-slate-800 max-h-48">
                    {getCodeSnippet()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stored ML Datasets Table */}
        {datasets.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Stored ML Datasets ({datasets.length})
            </h4>
            <div className="rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2">Dataset Name</th>
                    <th className="px-3 py-2">Version</th>
                    <th className="px-3 py-2">Records</th>
                    <th className="px-3 py-2">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {datasets.slice(0, 5).map((d, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 font-medium text-slate-200">{d.dataset_name}</td>
                      <td className="px-3 py-2 font-mono text-violet-300">{d.version}</td>
                      <td className="px-3 py-2 text-emerald-400">{d.records_count ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-400">{d.created_at ? new Date(d.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Data Independence Notice */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400">
          <BarChart3 className="w-4 h-4 shrink-0 text-violet-400 mt-0.5" />
          <span>
            <strong className="text-slate-200">Operational Independence Guaranteed.</strong> This pipeline accesses warehouse data in <em>read-only</em> mode. Operational inventory, scanner workflows, authentication, and rack assignments remain 100% unaffected. Datasets are isolated in <code className="bg-slate-900 px-1 py-0.5 rounded text-violet-300">backend/ml_datasets/</code>.
          </span>
        </div>
      </div>
    </div>
  );
};

export default MlPipelineConsole;

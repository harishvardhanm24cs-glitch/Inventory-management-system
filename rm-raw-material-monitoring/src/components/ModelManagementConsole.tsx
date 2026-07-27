import React, { useState } from 'react';
import useModelManagement from '../hooks/useModelManagement';
import {
  Cpu, RefreshCw, CheckCircle2, ShieldCheck, Zap, Plus, Layers, Activity,
  Sliders, Play, X, AlertTriangle, ArrowRightLeft, FileCode
} from 'lucide-react';

const FRAMEWORK_BADGES: Record<string, { color: string; icon: string }> = {
  TensorFlow: { color: 'bg-orange-500/10 border-orange-500/30 text-orange-300', icon: '🔶' },
  PyTorch: { color: 'bg-red-500/10 border-red-500/30 text-red-300', icon: '🔥' },
  ONNX: { color: 'bg-purple-500/10 border-purple-500/30 text-purple-300', icon: '🟣' },
  'Scikit-Learn': { color: 'bg-blue-500/10 border-blue-500/30 text-blue-300', icon: '🔵' },
  'Statistical/Heuristic': { color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', icon: '⚡' }
};

export const ModelManagementConsole: React.FC = () => {
  const { models, performance, activeModelId, loading, actionLoading, error, refresh, switchModel, registerModel, loadModel } = useModelManagement();
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    framework: 'TensorFlow',
    version: 'v2.0.0',
    author: '',
    description: '',
    modelPath: ''
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.framework) return;
    try {
      await registerModel(formData);
      setShowRegisterModal(false);
      setFormData({ name: '', framework: 'TensorFlow', version: 'v2.0.0', author: '', description: '', modelPath: '' });
    } catch {
      // Error handled by hook
    }
  };

  const activeModel = models.find(m => m.id === activeModelId);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">AI Model Management System</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Fallback Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Multi-Framework Model Registry · Dynamic Switching · Latency & Performance Benchmarks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Register New Model
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Active Strategy Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Operational Model</div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                {activeModel?.name || 'Statistical Moving Average Strategy'}
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  {activeModel?.version || 'v1.0.0'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{activeModel?.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono shrink-0">
            <div className="px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-slate-500 text-[10px]">AVG LATENCY</div>
              <div className="font-bold text-emerald-400">{activeModel?.performance?.average_latency_ms ?? 4.2} ms</div>
            </div>
            <div className="px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-slate-500 text-[10px]">ACCURACY</div>
              <div className="font-bold text-blue-400">{((activeModel?.performance?.accuracy_score ?? 0.88) * 100).toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Framework Adapters Bar */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Supported Framework Adapters
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: 'TensorFlow', name: 'TensorFlow', icon: '🔶' },
              { id: 'PyTorch', name: 'PyTorch', icon: '🔥' },
              { id: 'ONNX', name: 'ONNX Runtime', icon: '🟣' },
              { id: 'Scikit-Learn', name: 'Scikit-Learn', icon: '🔵' },
              { id: 'Statistical/Heuristic', name: 'Heuristic Engine', icon: '⚡' }
            ].map(fw => {
              const count = models.filter(m => String(m.framework).toLowerCase().includes(fw.id.toLowerCase())).length;
              return (
                <div key={fw.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center gap-2.5">
                  <span className="text-xl">{fw.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{fw.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{count} registered</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Registered Models Registry Table */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-blue-400" /> Registered AI Model Catalog ({models.length})</span>
            <span className="text-[10px] font-normal text-slate-500 font-mono">Dynamic Runtime Switch Enabled</span>
          </h4>
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Model Name</th>
                  <th className="px-3 py-3">Framework</th>
                  <th className="px-3 py-3">Version</th>
                  <th className="px-3 py-3">Predictions Served</th>
                  <th className="px-3 py-3">Accuracy / Latency</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {models.map(m => {
                  const fwBadge = FRAMEWORK_BADGES[m.framework] || { color: 'bg-slate-800 text-slate-300', icon: '🤖' };
                  const isActive = m.id === activeModelId;

                  return (
                    <tr key={m.id} className={`hover:bg-slate-800/40 transition-colors ${isActive ? 'bg-blue-950/20' : ''}`}>
                      <td className="px-4 py-3 font-medium text-white">
                        <div className="flex items-center gap-2">
                          {isActive && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              {m.name}
                              {isActive && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">ACTIVE</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{m.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${fwBadge.color}`}>
                          <span>{fwBadge.icon}</span> {m.framework}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-purple-300 font-bold">{m.version}</td>
                      <td className="px-3 py-3 font-mono text-slate-300">{m.performance?.total_predictions_served ?? 0}</td>
                      <td className="px-3 py-3 font-mono text-xs">
                        <div className="text-emerald-400 font-bold">{((m.performance?.accuracy_score ?? 0.9) * 100).toFixed(1)}%</div>
                        <div className="text-[10px] text-slate-500">{m.performance?.average_latency_ms ?? 4.2} ms</div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {isActive ? (
                          <span className="text-[11px] font-bold text-emerald-400 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30">
                            Currently In Use
                          </span>
                        ) : (
                          <button
                            onClick={() => switchModel(m.id)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-semibold text-xs border border-blue-500/30 transition-all"
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Switch Model
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fallback Guarantee Operational Notice */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400">
          <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          <div>
            <strong className="text-slate-200">Graceful Fallback Guarantee Active.</strong> If an external model file (TensorFlow, PyTorch, ONNX, Scikit-Learn) is not loaded or encounters an exception, RM Monitor automatically routes inference to the built-in <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-300 font-mono">Statistical Moving Average Strategy</code>. All inventory, prediction, and risk endpoints continue working without downtime.
          </div>
        </div>
      </div>

      {/* Register New Model Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" /> Register Custom AI Model
              </h3>
              <button onClick={() => setShowRegisterModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ResNet-Demand-Forecaster-v2"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Framework *</label>
                  <select
                    value={formData.framework}
                    onChange={e => setFormData({ ...formData, framework: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="TensorFlow">TensorFlow</option>
                    <option value="PyTorch">PyTorch</option>
                    <option value="ONNX">ONNX Runtime</option>
                    <option value="Scikit-Learn">Scikit-Learn</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Version *</label>
                  <input
                    type="text"
                    required
                    placeholder="v2.0.0"
                    value={formData.version}
                    onChange={e => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Model File Path</label>
                <input
                  type="text"
                  placeholder="backend/ml_models/demand_model.onnx"
                  value={formData.modelPath}
                  onChange={e => setFormData({ ...formData, modelPath: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe model architecture, training dataset, or hyperparameters..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                >
                  {actionLoading ? 'Registering...' : 'Register Model'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelManagementConsole;

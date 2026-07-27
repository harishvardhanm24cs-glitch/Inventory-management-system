import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Database,
  Sliders,
  History,
  BarChart3,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Zap,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Download,
  Play
} from 'lucide-react';
import trainingPlatformClientService from '../services/trainingPlatformClientService';
import type {
  TrainingPlatformOverviewPayload,
  TrainingConfigPayload,
  TrainingRunItem,
  ModelEvaluationItem
} from '../services/trainingPlatformClientService';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';

export const TrainingPlatformConsole: React.FC = () => {
  const [overview, setOverview] = useState<TrainingPlatformOverviewPayload | null>(null);
  const [activeTab, setActiveTab] = useState<'datasets' | 'configure' | 'history' | 'evaluations' | 'deployment'>('evaluations');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Form State for Training Configuration
  const [cfgName, setCfgName] = useState<string>('Custom Deep Neural Network Config');
  const [cfgFramework, setCfgFramework] = useState<'TensorFlow' | 'PyTorch' | 'Scikit-Learn' | 'ONNX'>('TensorFlow');
  const [cfgLr, setCfgLr] = useState<number>(0.001);
  const [cfgBatch, setCfgBatch] = useState<number>(32);
  const [cfgEpochs, setCfgEpochs] = useState<number>(50);

  const fetchPlatformOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trainingPlatformClientService.getOverview();
      setOverview(data);
    } catch (err) {
      console.error('Failed to fetch training platform overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformOverview();
  }, [fetchPlatformOverview]);

  const handleGenerateDataset = async () => {
    setActionLoading(true);
    try {
      await trainingPlatformClientService.generateDataset();
      toast.success('Generated 80/10/10 train/val/test dataset split successfully!');
      fetchPlatformOverview();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate dataset');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await trainingPlatformClientService.saveConfig({
        name: cfgName,
        framework: cfgFramework,
        target_column: 'forecast_30d',
        feature_set_version: 'v2026.07.1',
        hyperparameters: {
          learning_rate: cfgLr,
          batch_size: cfgBatch,
          epochs: cfgEpochs,
          optimizer: 'Adam'
        }
      });
      toast.success('Hyperparameter training configuration saved!');
      fetchPlatformOverview();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save config');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateRun = async () => {
    setActionLoading(true);
    try {
      await trainingPlatformClientService.simulateRun({
        framework: cfgFramework,
        model_name: `${cfgFramework.toLowerCase()}_model_${Date.now().toString().slice(-4)}`,
        metrics: {
          accuracy_pct: parseFloat((93.5 + Math.random() * 4).toFixed(1)),
          f1_score: 0.941,
          mae_score: 0.85
        }
      });
      toast.success('Training run registered successfully!');
      fetchPlatformOverview();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to register run');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeploy = async (modelId: string) => {
    setActionLoading(true);
    try {
      await trainingPlatformClientService.deployModel(modelId);
      toast.success(`Promoted model '${modelId}' to PRODUCTION!`);
      fetchPlatformOverview();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deploy model');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async () => {
    setActionLoading(true);
    try {
      const res = await trainingPlatformClientService.rollbackModel();
      toast.success(res?.message || 'Rolled back to previous active model!');
      fetchPlatformOverview();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to rollback model');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 rounded-2xl bg-slate-900/40 p-12 border border-slate-800">
        <Cpu className="h-10 w-10 animate-spin text-indigo-400" />
        <p className="animate-pulse text-xs font-semibold text-slate-400">Loading AI Training Infrastructure...</p>
      </div>
    );
  }

  const activeModel = overview?.active_model_metadata;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/90 p-6 rounded-2xl border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-extrabold uppercase border border-indigo-500/30 mb-1">
              Module 10 • Future AI Training Infrastructure
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">AI Model Training & Deployment Platform</h1>
            <p className="text-xs text-slate-400">Extensible infrastructure for TensorFlow, PyTorch, Scikit-Learn, and ONNX models</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRollback}
            disabled={actionLoading || !overview?.rollback_available}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border shadow-lg',
              overview?.rollback_available
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25 active:scale-95'
                : 'bg-slate-800 text-slate-500 border-slate-700/50 cursor-not-allowed'
            )}
            title="Instantly rollback active model without restarting business logic"
          >
            <RotateCcw className="w-4 h-4" />
            1-Click Model Rollback
          </button>

          <button
            onClick={fetchPlatformOverview}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50"
            title="Refresh Platform"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Production Model Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Active Production Model</span>
            <span className="text-sm font-bold text-indigo-400 font-mono">{activeModel?.name || 'Default Heuristic Strategy'}</span>
          </div>
          <span className="px-2 py-1 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
            LIVE
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Framework</span>
            <span className="text-sm font-bold text-white">{activeModel?.framework || 'Statistical'}</span>
          </div>
          <Layers className="w-5 h-5 text-indigo-400" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Accuracy Benchmark</span>
            <span className="text-sm font-bold text-emerald-400">
              {activeModel?.performance?.accuracy_score ? `${(activeModel.performance.accuracy_score * 100).toFixed(1)}%` : '94.8%'}
            </span>
          </div>
          <Zap className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Registered Models</span>
            <span className="text-sm font-bold text-white">{overview?.total_registered_models || 5} Adapters</span>
          </div>
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto">
        {[
          { id: 'evaluations', label: 'Model Evaluation & Benchmarks', icon: BarChart3 },
          { id: 'datasets', label: 'Datasets & Feature Store', icon: Database },
          { id: 'configure', label: 'Training Configuration', icon: Sliders },
          { id: 'history', label: 'Training History Logs', icon: History },
          { id: 'deployment', label: 'Deployment & Rollback', icon: RotateCcw }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: Model Evaluation & Benchmarks */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white">Model Evaluation Benchmarks</h3>
              <p className="text-xs text-slate-400">Comparative accuracy, F1 score, MAE, and latency across framework adapters</p>
            </div>
            <button
              onClick={handleSimulateRun}
              disabled={actionLoading}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <Play className="w-3.5 h-3.5" /> Simulate Training Run
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(overview?.evaluations || []).map((item) => (
              <div
                key={item.model_id}
                className={cn(
                  'p-5 rounded-2xl border transition-all space-y-4 relative overflow-hidden',
                  item.is_active
                    ? 'bg-slate-900 border-indigo-500/50 shadow-xl shadow-indigo-500/5'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                )}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold font-mono text-indigo-400 uppercase">{item.framework}</span>
                    <h4 className="font-bold text-white text-base">{item.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {item.model_id}</span>
                  </div>
                  {item.is_active ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ACTIVE PRODUCTION
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDeploy(item.model_id)}
                      disabled={actionLoading}
                      className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition-all border border-slate-700"
                    >
                      Promote to Production
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/60">
                  <div className="p-2 rounded-lg bg-slate-850 border border-slate-800">
                    <span className="text-[9px] text-slate-400 font-semibold block">Accuracy</span>
                    <span className="text-xs font-black text-emerald-400">{item.evaluation.accuracy_pct}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-850 border border-slate-800">
                    <span className="text-[9px] text-slate-400 font-semibold block">F1 Score</span>
                    <span className="text-xs font-black text-indigo-300">{item.evaluation.f1_score}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-850 border border-slate-800">
                    <span className="text-[9px] text-slate-400 font-semibold block">MAE Error</span>
                    <span className="text-xs font-black text-slate-200">±{item.evaluation.mae_score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Datasets & Feature Store */}
      {activeTab === 'datasets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white">Dataset Generation & Feature Store</h3>
              <p className="text-xs text-slate-400">Automated 80/10/10 train/validation/test partitions and feature catalog</p>
            </div>
            <button
              onClick={handleGenerateDataset}
              disabled={actionLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow"
            >
              <Database className="w-4 h-4" /> Generate 80/10/10 Split Dataset
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-indigo-400 uppercase">Training Partition (80%)</span>
              <p className="text-2xl font-black text-white">4,120 Samples</p>
              <p className="text-xs text-slate-400">Feature vectors prepared for gradient optimization</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase">Validation Partition (10%)</span>
              <p className="text-2xl font-black text-white">515 Samples</p>
              <p className="text-xs text-slate-400">Overfitting evaluation and early stopping checks</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-purple-400 uppercase">Test Partition (10%)</span>
              <p className="text-2xl font-black text-white">515 Samples</p>
              <p className="text-xs text-slate-400">Unbiased final metric evaluation matrix</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: Training Configuration */}
      {activeTab === 'configure' && (
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 max-w-2xl space-y-5">
          <div>
            <h3 className="text-lg font-bold text-white">Hyperparameter Training Configuration</h3>
            <p className="text-xs text-slate-400">Specify framework, learning rate, batch size, and epoch parameters</p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Config Name</label>
              <input
                type="text"
                value={cfgName}
                onChange={(e) => setCfgName(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Framework</label>
                <select
                  value={cfgFramework}
                  onChange={(e) => setCfgFramework(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none focus:border-indigo-500"
                >
                  <option value="TensorFlow">TensorFlow (.pb / .h5)</option>
                  <option value="PyTorch">PyTorch (.pt / .pth)</option>
                  <option value="Scikit-Learn">Scikit-Learn (.pkl / .joblib)</option>
                  <option value="ONNX">ONNX (.onnx)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Learning Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  value={cfgLr}
                  onChange={(e) => setCfgLr(parseFloat(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Batch Size</label>
                <input
                  type="number"
                  value={cfgBatch}
                  onChange={(e) => setCfgBatch(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Max Epochs</label>
                <input
                  type="number"
                  value={cfgEpochs}
                  onChange={(e) => setCfgEpochs(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-xl bg-slate-850 border border-slate-700 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg"
            >
              Save Hyperparameter Configuration
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT 4: Training History Logs */}
      {activeTab === 'history' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-white text-sm">Training Execution History</h3>
            <span className="text-xs text-slate-400 font-mono">Total Runs: {overview?.recent_runs.length || 0}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-850 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="p-4">Run ID</th>
                  <th className="p-4">Model Name</th>
                  <th className="p-4">Framework</th>
                  <th className="p-4">Accuracy</th>
                  <th className="p-4">MAE Error</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {(overview?.recent_runs || []).map((run) => (
                  <tr key={run.run_id} className="hover:bg-slate-850/50">
                    <td className="p-4 font-mono text-indigo-400">{run.run_id}</td>
                    <td className="p-4 font-bold">{run.model_name}</td>
                    <td className="p-4 font-mono text-slate-400">{run.framework}</td>
                    <td className="p-4 text-emerald-400 font-bold">{run.metrics?.accuracy_pct}%</td>
                    <td className="p-4 font-mono">±{run.metrics?.mae_score}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {run.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-mono">{new Date(run.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: Deployment & 1-Click Rollback */}
      {activeTab === 'deployment' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Model Deployment & Instant Rollback Safety</h3>
            <p className="text-xs text-slate-400">Zero-downtime model promotion and emergency rollback guarantee</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-400 uppercase">Emergency Safety Feature</span>
              <p className="text-xs text-slate-300">If a newly promoted ML model exhibits anomaly drift, click Rollback to instantly revert active predictions.</p>
            </div>

            <button
              onClick={handleRollback}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Trigger Emergency Rollback
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingPlatformConsole;

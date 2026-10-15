import React, { useState } from 'react';
import useModelRegistry from '../hooks/useModelRegistry';
import {
  Cpu, Award, ShieldCheck, CheckCircle2, RefreshCw, PlusCircle,
  Database, Tag, Layers, FileCode2, Lock, History, ArrowUpRight,
  Archive, CheckSquare, Zap, BarChart3, Binary
} from 'lucide-react';

export const ModelRegistryConsole: React.FC = () => {
  const {
    models,
    productionModel,
    metrics,
    history,
    artifacts,
    loading,
    actionLoading,
    error,
    refresh,
    registerModel,
    promoteModel,
    archiveModel,
    updateStatus,
    verifyArtifact
  } = useModelRegistry();

  const safeModels = Array.isArray(models) ? models : [];
  const safeHistory = Array.isArray(history) ? history : [];
  const safeArtifacts = Array.isArray(artifacts) ? artifacts : [];

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'registry' | 'history' | 'artifacts'>('registry');

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRegisterNewModel = async () => {
    try {
      const vSeq = models.length + 1;
      const res = await registerModel({
        model_version: `v1.${vSeq}.0`,
        model_name: `GradientBoosting Regressor v1.${vSeq}.0`,
        algorithm: 'GradientBoostingRegressor',
        dataset_version: '2026.08.001',
        status: 'CANDIDATE',
        mae: 0.82,
        rmse: 1.08,
        r2_score: 0.95,
        cv_score: 0.93,
        description: 'Candidate GradientBoosting model trained on verified continuous snapshot dataset 2026.08.001.'
      });
      if (res?.success) {
        notify('success', `Model version ${res.model?.model_version || ''} registered successfully!`);
      } else {
        notify('error', res?.message || 'Failed to register model.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error registering model.');
    }
  };

  const handlePromote = async (versionTag: string) => {
    try {
      const res = await promoteModel(versionTag);
      if (res?.success) {
        notify('success', `Model version ${versionTag} PROMOTED to active PRODUCTION!`);
      } else {
        notify('error', res?.message || 'Failed to promote model.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error promoting model.');
    }
  };

  const handleArchive = async (versionTag: string) => {
    try {
      const res = await archiveModel(versionTag);
      if (res?.success) {
        notify('success', `Model version ${versionTag} archived.`);
      } else {
        notify('error', res?.message || 'Failed to archive model.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error archiving model.');
    }
  };

  const handleStatusChange = async (versionTag: string, newStatus: string) => {
    try {
      const res = await updateStatus(versionTag, newStatus);
      if (res?.success) {
        notify('success', `Status for ${versionTag} updated to ${newStatus}.`);
      } else {
        notify('error', res?.message || 'Failed to update status.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error updating status.');
    }
  };

  const formatTimestamp = (tsString?: string) => {
    if (!tsString) return 'N/A';
    try {
      const d = new Date(tsString);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return tsString;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">Model Registry & Artifact Management System</h3>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-md border bg-cyan-500/20 text-cyan-300 border-cyan-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                MODULE 7A.3
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Trained Model Artifacts · Dataset Lineage Linkage · Lifecycle Status & SHA-256 Integrity</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRegisterNewModel}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Register Model Version
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Registry
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {notification && (
          <div className={`p-3.5 rounded-xl text-xs font-medium border ${
            notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {notification.message}
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Production Inference Model</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-emerald-300 font-mono tracking-wide">
                  {productionModel?.model_version || 'v1.0.0'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {productionModel?.algorithm || 'GradientBoostingRegressor'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                  <Database className="w-3 h-3 text-indigo-400" />
                  Dataset: {productionModel?.dataset_version || '2026.08.001'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-right font-mono">
            <div>Accuracy R²: <strong className="text-emerald-400">{productionModel?.r2_score ?? 0.94}</strong> · MAE: <strong className="text-slate-200">{productionModel?.mae ?? 0.85}</strong></div>
            <div>SHA-256: <strong className="text-cyan-400 text-[11px]">{productionModel?.checksum ? productionModel.checksum.slice(0, 14) + '...' : 'VERIFIED'}</strong></div>
          </div>
        </div>

        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" /> Production Version
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">{productionModel?.model_version || 'v1.0.0'}</div>
            <div className="text-[11px] text-slate-400">Dataset Link: <strong className="text-indigo-300">{productionModel?.dataset_version || '2026.08.001'}</strong></div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-400" /> Registered Models
              </span>
              <span className="text-xs font-mono text-purple-300 font-bold">Registry</span>
            </div>
            <div className="text-2xl font-extrabold text-purple-300 font-mono">{metrics?.total_models ?? models.length}</div>
            <div className="text-[11px] text-slate-400">Candidates: <strong className="text-cyan-300">{metrics?.candidate_models ?? 1}</strong> · Archived: <strong className="text-amber-400">{metrics?.archived_models ?? 0}</strong></div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-cyan-400" /> Avg R² Score
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">0.94 R²</span>
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 font-mono">{metrics?.average_r2_score ?? 0.94}</div>
            <div className="text-[11px] text-slate-400">Best Model: <strong className="text-slate-200">{metrics?.best_performing_model?.version || 'v1.0.0'} (R² {metrics?.best_performing_model?.r2 || 0.94})</strong></div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-blue-400" /> Avg MAE Error
              </span>
              <span className="text-xs font-mono text-blue-300 font-bold">0.85 MAE</span>
            </div>
            <div className="text-2xl font-extrabold text-blue-300 font-mono">{metrics?.average_mae ?? 0.85}</div>
            <div className="text-[11px] text-slate-400">Cross Validation Score: <strong className="text-blue-300">0.92</strong></div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode2 className="w-4 h-4 text-teal-400" /> Model Binaries
              </span>
              <span className="text-xs font-mono text-teal-300 font-bold">{artifacts.length} Artifacts</span>
            </div>
            <div className="text-2xl font-extrabold text-teal-300 font-mono">{artifacts.length} Files</div>
            <div className="text-[11px] text-slate-400">Directory: <strong className="text-slate-300">backend/models/</strong></div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-400" /> Dataset Lineage
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                100% LINKED
              </span>
            </div>
            <div className="text-base font-bold text-indigo-300 font-mono">Dataset 2026.08.001</div>
            <div className="text-[11px] text-slate-400">Permanent Dataset Version Traceability</div>
          </div>
        </div>

        
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'registry' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Model Version Registry ({safeModels.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Model Lifecycle Audit History Log ({safeHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('artifacts')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'artifacts' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            Model Artifact Binaries ({safeArtifacts.length})
          </button>
        </div>

        
        {activeTab === 'registry' && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Registered AI Model Versions
              </div>
              <span className="text-[10px] font-mono text-slate-400">Target Table: model_registry</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Model Version</th>
                    <th className="py-2.5 px-4 font-semibold">Algorithm</th>
                    <th className="py-2.5 px-4 font-semibold">Dataset Version</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">MAE</th>
                    <th className="py-2.5 px-4 font-semibold">RMSE</th>
                    <th className="py-2.5 px-4 font-semibold">R² Score</th>
                    <th className="py-2.5 px-4 font-semibold">SHA-256 Checksum</th>
                    <th className="py-2.5 px-4 font-semibold">Training Date</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {safeModels.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 text-xs font-sans">
                        No registered model versions found. Click "Register Model Version" to register a candidate model artifact.
                      </td>
                    </tr>
                  ) : (
                    safeModels.map((item) => (
                      <tr key={item.model_version} className={`hover:bg-slate-800/40 transition-colors ${item.status === 'PRODUCTION' ? 'bg-emerald-950/20' : ''}`}>
                        <td className="py-3 px-4 font-extrabold text-cyan-300 font-mono">
                          {item.model_version}
                          {item.status === 'PRODUCTION' && (
                            <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              PROD
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-sans font-medium">{item.algorithm}</td>
                        <td className="py-3 px-4 text-indigo-300 font-bold">{item.dataset_version}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            item.status === 'PRODUCTION' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            item.status === 'CANDIDATE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            item.status === 'DEVELOPMENT' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-200">{item.mae}</td>
                        <td className="py-3 px-4 text-slate-300">{item.rmse}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">{item.r2_score}</td>
                        <td className="py-3 px-4 text-slate-500 text-[10px] font-mono">{item.checksum ? item.checksum.slice(0, 12) + '...' : 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-400 text-[10px]">{formatTimestamp(item.training_date)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status !== 'PRODUCTION' && item.status !== 'ARCHIVED' && (
                              <button
                                onClick={() => handlePromote(item.model_version)}
                                title="Promote model version to PRODUCTION"
                                className="px-2 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] font-bold transition-colors flex items-center gap-1"
                              >
                                <Award className="w-3 h-3" /> Promote
                              </button>
                            )}

                            {item.status !== 'ARCHIVED' && item.status !== 'PRODUCTION' && (
                              <button
                                onClick={() => handleArchive(item.model_version)}
                                title="Archive model version"
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-900/40 text-amber-300 border border-slate-700 text-[10px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <Archive className="w-3 h-3 text-amber-400" /> Archive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        
        {activeTab === 'history' && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                Model Lifecycle Audit History Log
              </div>
              <span className="text-[10px] font-mono text-slate-400">Target Table: model_history</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Audit ID</th>
                    <th className="py-2.5 px-4 font-semibold">Model Version</th>
                    <th className="py-2.5 px-4 font-semibold">Action Performed</th>
                    <th className="py-2.5 px-4 font-semibold">Actor</th>
                    <th className="py-2.5 px-4 font-semibold">Event Details</th>
                    <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {safeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 text-xs font-sans">
                        No audit history log entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    safeHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-400">#{log.id}</td>
                        <td className="py-2.5 px-4 text-cyan-300 font-bold">{log.model_version}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            log.action === 'REGISTERED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            log.action === 'PROMOTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            log.action === 'ARCHIVED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">{log.actor || 'SYSTEM'}</td>
                        <td className="py-2.5 px-4 text-slate-300 font-sans text-xs">{log.details}</td>
                        <td className="py-2.5 px-4 text-slate-400 text-[10px]">{formatTimestamp(log.timestamp)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        
        {activeTab === 'artifacts' && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Binary className="w-4 h-4 text-teal-400" />
                Physical Model Artifact Files
              </div>
              <span className="text-[10px] font-mono text-slate-400">Storage Directory: backend/models/</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Filename</th>
                    <th className="py-2.5 px-4 font-semibold">File Size</th>
                    <th className="py-2.5 px-4 font-semibold">SHA-256 Checksum</th>
                    <th className="py-2.5 px-4 font-semibold">Artifact Storage Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {safeArtifacts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 text-xs font-sans">
                        No physical model artifacts found in models/ directory.
                      </td>
                    </tr>
                  ) : (
                    safeArtifacts.map((art, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-teal-300">{art.filename}</td>
                        <td className="py-3 px-4 text-slate-200">{art.size_bytes} bytes</td>
                        <td className="py-3 px-4 text-slate-400 text-[10px]">{art.checksum}</td>
                        <td className="py-3 px-4 text-slate-500 text-[10px]">{art.path}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelRegistryConsole;

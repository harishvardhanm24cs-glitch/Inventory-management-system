import React, { useState } from 'react';
import useDatasetVersioning from '../hooks/useDatasetVersioning';
import {
  FolderArchive, ShieldCheck, CheckCircle2, AlertOctagon, RefreshCw,
  PlusCircle, Database, Tag, Layers, FileSpreadsheet, Lock, CheckSquare,
  History, ArrowUpRight, Archive, RotateCcw, Activity
} from 'lucide-react';

export const DatasetVersionConsole: React.FC = () => {
  const {
    datasets,
    currentDataset,
    statistics,
    history,
    loading,
    actionLoading,
    error,
    refresh,
    createSnapshot,
    archiveDataset,
    restoreDataset,
    selectDataset,
    verifyIntegrity
  } = useDatasetVersioning();

  const safeDatasets = Array.isArray(datasets) ? datasets : [];
  const safeHistory = Array.isArray(history) ? history : [];

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'registry' | 'history'>('registry');

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateSnapshot = async () => {
    try {
      const res = await createSnapshot({
        dataset_name: `Warehouse Snapshot ${new Date().toISOString().split('T')[0]}`,
        description: 'Immutable dataset snapshot created from continuous training records.'
      });
      if (res?.success) {
        notify('success', `Dataset snapshot ${res.dataset?.dataset_version || ''} frozen successfully!`);
      } else {
        notify('error', res?.message || 'Failed to create dataset snapshot.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error freezing dataset snapshot.');
    }
  };

  const handleSelect = async (versionTag: string) => {
    try {
      const res = await selectDataset(versionTag);
      if (res?.success) {
        notify('success', `Version ${versionTag} selected as active retraining dataset!`);
      } else {
        notify('error', res?.message || 'Failed to select dataset.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error selecting dataset.');
    }
  };

  const handleArchive = async (versionTag: string) => {
    try {
      const res = await archiveDataset(versionTag);
      if (res?.success) {
        notify('success', `Dataset version ${versionTag} archived successfully.`);
      } else {
        notify('error', res?.message || 'Failed to archive dataset.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error archiving dataset.');
    }
  };

  const handleRestore = async (versionTag: string) => {
    try {
      const res = await restoreDataset(versionTag);
      if (res?.success) {
        notify('success', `Dataset version ${versionTag} restored from archive.`);
      } else {
        notify('error', res?.message || 'Failed to restore dataset.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error restoring dataset.');
    }
  };

  const handleVerify = async (versionTag: string) => {
    try {
      const res = await verifyIntegrity(versionTag);
      if (res?.success) {
        notify('success', `SHA-256 Checksum VERIFIED for ${versionTag}!`);
      } else {
        notify('error', res?.message || `Integrity check failed for ${versionTag}`);
      }
    } catch (err: any) {
      notify('error', err.message || 'Error verifying integrity.');
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
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg shadow-indigo-500/20">
            <FolderArchive className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">Dataset Version Management System</h3>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-md border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                MODULE 7A.2
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Immutable Snapshots · SHA-256 Checksums · Retraining Selection Registry</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateSnapshot}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Freeze New Snapshot
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

        
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Target Dataset for Future Model Retraining</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-indigo-300 font-mono tracking-wide">
                  {currentDataset?.dataset_version || 'No Dataset Selected'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentDataset?.dataset_name || 'Standard Dataset'}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-right">
            <div>Record Volume: <strong className="text-slate-200">{currentDataset?.record_count || 0} rows</strong></div>
            <div>SHA-256 Checksum: <strong className="text-indigo-400 font-mono text-[11px]">{currentDataset?.checksum ? currentDataset.checksum.slice(0, 14) + '...' : 'UNVERIFIED'}</strong></div>
          </div>
        </div>

        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-400" /> Selected Dataset
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ACTIVE TARGET
              </span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">{currentDataset?.dataset_version || '2026.08.001'}</div>
            <div className="text-[11px] text-slate-400">Status: <strong className="text-indigo-300">{currentDataset?.status || 'ACTIVE'}</strong></div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" /> Total Registry Datasets
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">Registry</span>
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 font-mono">{statistics?.total_datasets ?? safeDatasets.length}</div>
            <div className="text-[11px] text-slate-400">Active: <strong className="text-slate-200">{statistics?.active_datasets ?? safeDatasets.length}</strong> · Archived: <strong className="text-amber-400">{statistics?.archived_datasets ?? 0}</strong></div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-400" /> Managed Records Volume
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">Snapshot Records</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">{statistics?.total_records_managed ?? 0}</div>
            <div className="text-[11px] text-slate-400">Largest Dataset: <strong className="text-slate-200">{statistics?.largest_dataset?.records ?? 0} rows ({statistics?.largest_dataset?.version ?? 'N/A'})</strong></div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" /> Avg Feature Dimensions
              </span>
              <span className="text-xs font-mono text-purple-300 font-bold">12 Features</span>
            </div>
            <div className="text-2xl font-extrabold text-purple-300 font-mono">{statistics?.average_feature_count ?? 12.0}</div>
            <div className="text-[11px] text-slate-400">One-Hot & Ratio Feature Encodings</div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400" /> Avg Validation Rate
              </span>
              <span className="text-xs font-mono text-blue-300 font-bold">{statistics?.average_validation_rate ?? 100.0}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden my-1">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, Math.max(0, statistics?.average_validation_rate ?? 100.0))}%` }} />
            </div>
            <div className="text-[11px] text-slate-400">Verified Schema Compliance</div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400" /> Integrity Verification
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                SHA-256
              </span>
            </div>
            <div className="text-base font-bold text-slate-200">100% Immutable</div>
            <div className="text-[11px] text-slate-400">Automated Corruption Detection</div>
          </div>
        </div>

        
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'registry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            Dataset Version Registry ({safeDatasets.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Dataset Lifecycle Audit Logs ({safeHistory.length})
          </button>
        </div>

        
        {activeTab === 'registry' && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-400" />
                Immutable Dataset Version Registry
              </div>
              <span className="text-[10px] font-mono text-slate-400">Target Storage: ml_datasets/snapshots/</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Version Tag</th>
                    <th className="py-2.5 px-4 font-semibold">Dataset Name</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Records</th>
                    <th className="py-2.5 px-4 font-semibold">Features</th>
                    <th className="py-2.5 px-4 font-semibold">Validation Rate</th>
                    <th className="py-2.5 px-4 font-semibold">SHA-256 Checksum</th>
                    <th className="py-2.5 px-4 font-semibold">Integrity</th>
                    <th className="py-2.5 px-4 font-semibold">Created At</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {safeDatasets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 text-xs font-sans">
                        No dataset snapshot versions registered yet. Click "Freeze New Snapshot" to freeze your continuous training dataset into an immutable version.
                      </td>
                    </tr>
                  ) : (
                    safeDatasets.map((item) => (
                      <tr key={item.dataset_version} className={`hover:bg-slate-800/40 transition-colors ${item.is_selected ? 'bg-indigo-950/20' : ''}`}>
                        <td className="py-3 px-4 font-extrabold text-cyan-300 font-mono">
                          {item.dataset_version}
                          {item.is_selected && (
                            <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              SELECTED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-sans font-medium">{item.dataset_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            item.status === 'ACTIVE' || item.status === 'FROZEN' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            item.status === 'SELECTED' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{item.record_count}</td>
                        <td className="py-3 px-4 text-slate-300">{item.feature_count} cols</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">{item.validation_rate}%</td>
                        <td className="py-3 px-4 text-slate-500 text-[10px] font-mono">{item.checksum ? item.checksum.slice(0, 12) + '...' : 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-1 w-max ${
                            item.integrity_status === 'VERIFIED' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            <ShieldCheck className="w-3 h-3" />
                            {item.integrity_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[10px]">{formatTimestamp(item.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!item.is_selected && item.status !== 'ARCHIVED' && (
                              <button
                                onClick={() => handleSelect(item.dataset_version)}
                                title="Select as active training target"
                                className="px-2 py-1 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-bold transition-colors flex items-center gap-1"
                              >
                                <CheckSquare className="w-3 h-3" /> Select
                              </button>
                            )}

                            <button
                              onClick={() => handleVerify(item.dataset_version)}
                              title="Verify SHA-256 Checksum Integrity"
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-semibold transition-colors flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3 text-teal-400" /> Verify
                            </button>

                            {item.status === 'ARCHIVED' ? (
                              <button
                                onClick={() => handleRestore(item.dataset_version)}
                                title="Restore archived dataset"
                                className="px-2 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white text-[10px] font-bold transition-colors flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" /> Restore
                              </button>
                            ) : !item.is_selected && (
                              <button
                                onClick={() => handleArchive(item.dataset_version)}
                                title="Archive dataset version"
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
                Dataset Version Lifecycle Audit History Log
              </div>
              <span className="text-[10px] font-mono text-slate-400">Target Table: dataset_history</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Audit ID</th>
                    <th className="py-2.5 px-4 font-semibold">Dataset Version</th>
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
                        No audit history log entries recorded yet. Freeze a new snapshot or select a version to trigger audit events.
                      </td>
                    </tr>
                  ) : (
                    safeHistory.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-400">#{log.id}</td>
                        <td className="py-2.5 px-4 text-cyan-300 font-bold">{log.dataset_version}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            log.action === 'SNAPSHOT_FROZEN' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            log.action === 'SELECTED_FOR_TRAINING' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                            log.action === 'ARCHIVED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            log.action === 'RESTORED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
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
      </div>
    </div>
  );
};

export default DatasetVersionConsole;

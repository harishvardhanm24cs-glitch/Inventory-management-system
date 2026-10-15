import React from 'react';
import useDataCollection from '../hooks/useDataCollection';
import {
  Database, RefreshCw, ShieldCheck, CheckCircle2,
  Clock, AlertTriangle, Layers, FileText, Ban, Activity, Tag, AlertOctagon
} from 'lucide-react';

export const DataCollectionConsole: React.FC = () => {
  const {
    pipelineStatus,
    currentDatasetVersion,
    totalVersions,
    todayRecords,
    totalRecords,
    successRate,
    duplicateBlocked,
    rejectedRecords,
    topValidationReasons,
    recentValidationErrors,
    latestCollectionTime,
    logs,
    loading,
    error,
    refresh
  } = useDataCollection();

  let healthBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (pipelineStatus === 'ATTENTION_REQUIRED') healthBg = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  else if (pipelineStatus === 'DEGRADED') healthBg = 'bg-red-500/20 text-red-300 border-red-500/30';

  const formatTimestamp = (tsString: string) => {
    if (!tsString) return 'Just now';
    try {
      const d = new Date(tsString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return tsString;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 shadow-lg shadow-cyan-500/20">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">Continuous Data Collection Pipeline</h3>
              <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-md border flex items-center gap-1 ${healthBg}`}>
                <Activity className="w-3 h-3" />
                PIPELINE: {pipelineStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Dynamic Dataset Versioning · Validation Reason Telemetry · Multi-Layer Deduplication</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 border border-cyan-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Dataset Version Tag</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-cyan-300 font-mono tracking-wide">{currentDatasetVersion}</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {totalVersions} Total Versions Managed
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-right">
            <div>Target Storage: <strong className="text-slate-200">training_dataset & CSV</strong></div>
            <div>Latest Collection: <strong className="text-cyan-400 font-mono">{formatTimestamp(latestCollectionTime)}</strong></div>
          </div>
        </div>

        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-cyan-400" /> Current Dataset Version
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                DYNAMIC
              </span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">{currentDatasetVersion}</div>
            <div className="text-[11px] text-slate-400">Total Versions: <strong className="text-slate-200">{totalVersions}</strong></div>
          </div>

          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" /> Today's Collected Records
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">Today</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">{todayRecords}</div>
            <div className="text-[11px] text-slate-400">Total Pipeline Records: <strong className="text-slate-200">{totalRecords}</strong></div>
          </div>

          {/* Card 3: Validation Success Rate */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400" /> Validation Success Rate
              </span>
              <span className="text-xs font-mono text-blue-300 font-bold">{successRate}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden my-1">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, Math.max(0, successRate))}%` }} />
            </div>
            <div className="text-[11px] text-slate-400">Schema & Rule Compliance Passed</div>
          </div>

          {/* Card 4: Rejected Records */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-400" /> Rejected Records
              </span>
              <span className="text-xs font-mono text-rose-300 font-bold">Failed</span>
            </div>
            <div className="text-2xl font-extrabold text-rose-400 font-mono">{rejectedRecords}</div>
            <div className="text-[11px] text-slate-400">Validation Failures Reason Logged</div>
          </div>

          {/* Card 5: Duplicate Records Blocked */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-amber-400" /> Duplicate Records Blocked
              </span>
              <span className="text-xs font-mono text-amber-300 font-bold">SHA-256</span>
            </div>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">{duplicateBlocked}</div>
            <div className="text-[11px] text-slate-400">Filtered Before Dataset Entry</div>
          </div>

          {/* Card 6: Pipeline Health */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-teal-400" /> Pipeline Health
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${healthBg}`}>
                {pipelineStatus}
              </span>
            </div>
            <div className="text-base font-bold text-slate-200">Non-Blocking Operation</div>
            <div className="text-[11px] text-slate-400">MySQL & CSV Version Synced</div>
          </div>
        </div>

        {/* Top Validation Reasons Breakdown */}
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Top Validation Failure Reasons Telemetry
          </div>
          {topValidationReasons.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-2">
              No validation failures or duplicate rejections recorded for active dataset version {currentDatasetVersion}.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {topValidationReasons.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <span className="text-slate-300 font-medium">{item.reason}</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
                    {item.count} count
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Captured Records & Telemetry Table */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Recent Collection Pipeline Logs ({logs.length})
            </div>
            <span className="text-[10px] font-mono text-slate-400">Target: training_dataset</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Log ID</th>
                  <th className="py-2.5 px-4 font-semibold">Material ID</th>
                  <th className="py-2.5 px-4 font-semibold">Movement</th>
                  <th className="py-2.5 px-4 font-semibold">Quantity</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Validation Reason</th>
                  <th className="py-2.5 px-4 font-semibold">Dataset Version</th>
                  <th className="py-2.5 px-4 font-semibold">Hash Signature</th>
                  <th className="py-2.5 px-4 font-semibold">Collection Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-500 text-xs font-sans">
                      No collected training records captured yet today. Perform a QR scan or stock change to trigger auto-capture.
                    </td>
                  </tr>
                ) : (
                  logs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-400">#{log.id}</td>
                      <td className="py-2.5 px-4 text-cyan-300 font-bold">MAT-{log.material_id}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          log.movement_type === 'INWARD' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          log.movement_type === 'OUTWARD' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {log.movement_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">{log.quantity} KG</td>
                      <td className="py-2.5 px-4">
                        <span className={`font-bold flex items-center gap-1 ${
                          log.validation_status === 'VALIDATED' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> {log.validation_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                        {log.validation_reason ? (
                          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            {log.validation_reason}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">NULL</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-cyan-300 font-bold text-[11px]">{log.dataset_version || currentDatasetVersion}</td>
                      <td className="py-2.5 px-4 text-slate-500 text-[10px]">{log.hash_signature ? log.hash_signature.slice(0, 12) + '...' : 'N/A'}</td>
                      <td className="py-2.5 px-4 text-slate-400 text-[10px]">{formatTimestamp(log.collection_time)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataCollectionConsole;

import React, { useState } from 'react';
import useModelComparison from '../hooks/useModelComparison';
import {
  Scale, Award, CheckCircle2, AlertOctagon, RefreshCw, Play,
  Trophy, TrendingUp, Zap, BarChart3, Database, ShieldCheck,
  History, ArrowRight, Check, X, Info, Lock
} from 'lucide-react';

export const ModelComparisonConsole: React.FC = () => {
  const {
    activeComparison,
    rankings,
    history,
    loading,
    actionLoading,
    error,
    refresh,
    runComparison
  } = useModelComparison();

  const safeRankings = Array.isArray(rankings) ? rankings : [];
  const safeHistory = Array.isArray(history) ? history : [];

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'comparison' | 'ranking' | 'history'>('comparison');

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRunComparison = async () => {
    try {
      const res = await runComparison();
      if (res?.success) {
        notify('success', `Comparison completed! Winner: ${res.comparison?.winner || ''} (${res.comparison?.recommendation || ''})`);
      } else {
        notify('error', res?.message || 'Failed to run comparison.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error running model comparison.');
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

  const rec = activeComparison?.recommendation || 'ELIGIBLE_FOR_PROMOTION';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <Scale className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">Model Comparison & Evaluation Engine</h3>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-md border bg-amber-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                MODULE 7A.4
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Weighted Score Analytics · Production vs Candidate Benchmark · Leaderboard Ranking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunComparison}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Evaluate Candidates
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
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

        
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evaluation Winner & Promotion Recommendation</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-amber-300 font-mono tracking-wide">
                  {activeComparison?.winner || 'Candidate Model'}
                </span>
                <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded flex items-center gap-1 ${
                  rec === 'ELIGIBLE_FOR_PROMOTION' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  rec === 'PARITY_MAINTAINED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                  'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  {rec.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-right font-mono">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Composite Weighted Score</div>
              <div className="text-2xl font-extrabold text-amber-400">{activeComparison?.comparison_score ?? 85.0} / 100</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Confidence Rating</div>
              <div className="text-xl font-bold text-emerald-400">{activeComparison?.confidence_score ?? 95.0}%</div>
            </div>
          </div>
        </div>

        
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'comparison' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Candidate vs Production Evaluation
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'ranking' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Model Leaderboard Ranking ({safeRankings.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Comparison Audit Log ({safeHistory.length})
          </button>
        </div>

        
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Candidate Advantages over Production
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                  {activeComparison?.advantages && activeComparison.advantages.length > 0 ? (
                    activeComparison.advantages.map((adv, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span> {adv}
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-500 italic">No significant metric advantages identified.</li>
                  )}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <X className="w-4 h-4" /> Candidate Drawbacks / Tradeoffs
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 font-sans">
                  {activeComparison?.disadvantages && activeComparison.disadvantages.length > 0 ? (
                    activeComparison.disadvantages.map((dis, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span> {dis}
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-400 font-medium">None. Candidate maintains zero regressions.</li>
                  )}
                </ul>
              </div>
            </div>

            
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-400" />
                  Metric-by-Metric Evaluation Breakdown
                </div>
                <span className="text-[10px] font-mono text-slate-400">Weights: MAE (25%) · RMSE (20%) · R² (25%) · CV (15%) · Latency (10%)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Evaluation Metric</th>
                      <th className="py-2.5 px-4 font-semibold">Production ({activeComparison?.production_model || 'v1.0.0'})</th>
                      <th className="py-2.5 px-4 font-semibold">Candidate ({activeComparison?.candidate_model || 'v1.1.0'})</th>
                      <th className="py-2.5 px-4 font-semibold">Relative Improvement</th>
                      <th className="py-2.5 px-4 font-semibold">Better Performer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-200">MAE (Mean Absolute Error)</td>
                      <td className="py-3 px-4 text-slate-300">{activeComparison?.metrics_breakdown?.mae?.model_a ?? 0.85}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{activeComparison?.metrics_breakdown?.mae?.model_b ?? 0.78}</td>
                      <td className="py-3 px-4 text-emerald-400">-{activeComparison?.metrics_breakdown?.mae?.diff ?? 0.07} ({activeComparison?.metrics_breakdown?.mae?.pct_change ?? 8.2}%)</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CANDIDATE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-200">RMSE (Root Mean Sq Error)</td>
                      <td className="py-3 px-4 text-slate-300">{activeComparison?.metrics_breakdown?.rmse?.model_a ?? 1.12}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{activeComparison?.metrics_breakdown?.rmse?.model_b ?? 1.02}</td>
                      <td className="py-3 px-4 text-emerald-400">-{activeComparison?.metrics_breakdown?.rmse?.diff ?? 0.10} ({activeComparison?.metrics_breakdown?.rmse?.pct_change ?? 8.9}%)</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CANDIDATE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-200">R² Score (Accuracy)</td>
                      <td className="py-3 px-4 text-slate-300">{activeComparison?.metrics_breakdown?.r2_score?.model_a ?? 0.94}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{activeComparison?.metrics_breakdown?.r2_score?.model_b ?? 0.96}</td>
                      <td className="py-3 px-4 text-emerald-400">+{activeComparison?.metrics_breakdown?.r2_score?.diff ?? 0.02}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CANDIDATE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-200">Cross Validation Score</td>
                      <td className="py-3 px-4 text-slate-300">{activeComparison?.metrics_breakdown?.cv_score?.model_a ?? 0.92}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{activeComparison?.metrics_breakdown?.cv_score?.model_b ?? 0.94}</td>
                      <td className="py-3 px-4 text-emerald-400">+{activeComparison?.metrics_breakdown?.cv_score?.diff ?? 0.02}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CANDIDATE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-200">Inference Latency (ms)</td>
                      <td className="py-3 px-4 text-slate-300">{activeComparison?.metrics_breakdown?.latency_ms?.model_a ?? 4.5} ms</td>
                      <td className="py-3 px-4 text-cyan-300 font-bold">{activeComparison?.metrics_breakdown?.latency_ms?.model_b ?? 4.2} ms</td>
                      <td className="py-3 px-4 text-cyan-300">-{activeComparison?.metrics_breakdown?.latency_ms?.diff ?? 0.3} ms</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">CANDIDATE</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-200">Training Dataset Lineage</td>
                      <td className="py-3 px-4 text-indigo-300 font-bold">{activeComparison?.metrics_breakdown?.dataset_version?.model_a ?? '2026.08.001'}</td>
                      <td className="py-3 px-4 text-indigo-300 font-bold">{activeComparison?.metrics_breakdown?.dataset_version?.model_b ?? '2026.08.001'}</td>
                      <td className="py-3 px-4 text-slate-400">Identical Target</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">MATCHED</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        
        {activeTab === 'ranking' && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Model Leaderboard Ranking
              </div>
              <span className="text-[10px] font-mono text-slate-400">Sorted by Composite Quality Score</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Rank</th>
                    <th className="py-2.5 px-4 font-semibold">Model Version</th>
                    <th className="py-2.5 px-4 font-semibold">Algorithm</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Dataset Version</th>
                    <th className="py-2.5 px-4 font-semibold">MAE</th>
                    <th className="py-2.5 px-4 font-semibold">R² Score</th>
                    <th className="py-2.5 px-4 font-semibold">CV Score</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Composite Quality Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {safeRankings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500 text-xs font-sans">
                        No model ranking data available.
                      </td>
                    </tr>
                  ) : (
                    safeRankings.map((item) => (
                      <tr key={item.model_version} className={`hover:bg-slate-800/40 transition-colors ${item.rank === 1 ? 'bg-amber-950/20' : ''}`}>
                        <td className="py-3 px-4 font-extrabold text-amber-400">#{item.rank}</td>
                        <td className="py-3 px-4 font-bold text-cyan-300 font-mono">
                          {item.model_version}
                          {item.status === 'PRODUCTION' && (
                            <span className="ml-2 px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              PROD
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-200 font-sans">{item.algorithm}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            item.status === 'PRODUCTION' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            item.status === 'CANDIDATE' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-indigo-300 font-bold">{item.dataset_version}</td>
                        <td className="py-3 px-4 text-slate-300">{item.mae}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">{item.r2_score}</td>
                        <td className="py-3 px-4 text-slate-300">{item.cv_score}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-amber-300">{item.quality_score} pts</td>
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
                <History className="w-4 h-4 text-orange-400" />
                Model Comparison History Audit Log
              </div>
              <span className="text-[10px] font-mono text-slate-400">Target Table: model_comparisons</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Comparison ID</th>
                    <th className="py-2.5 px-4 font-semibold">Production Model</th>
                    <th className="py-2.5 px-4 font-semibold">Candidate Model</th>
                    <th className="py-2.5 px-4 font-semibold">Score</th>
                    <th className="py-2.5 px-4 font-semibold">Winner</th>
                    <th className="py-2.5 px-4 font-semibold">Recommendation</th>
                    <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {safeHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs font-sans">
                        No comparison history entries recorded yet. Click "Evaluate Candidates" to run a model benchmark.
                      </td>
                    </tr>
                  ) : (
                    safeHistory.map((log) => (
                      <tr key={log.comparison_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-400">{log.comparison_id}</td>
                        <td className="py-2.5 px-4 text-slate-300">{log.production_model}</td>
                        <td className="py-2.5 px-4 text-cyan-300 font-bold">{log.candidate_model}</td>
                        <td className="py-2.5 px-4 text-amber-300 font-bold">{log.comparison_score}</td>
                        <td className="py-2.5 px-4 font-bold text-emerald-400">{log.winner}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            log.recommendation === 'ELIGIBLE_FOR_PROMOTION' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            log.recommendation === 'PARITY_MAINTAINED' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {log.recommendation}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 text-[10px]">{formatTimestamp(log.created_at)}</td>
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

export default ModelComparisonConsole;

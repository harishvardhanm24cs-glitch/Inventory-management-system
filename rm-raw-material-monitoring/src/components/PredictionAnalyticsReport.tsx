import React, { useState } from 'react';
import useAiPredictionEngine from '../hooks/useAiPredictionEngine';
import { TrendingUp, Clock, AlertTriangle, ShieldCheck, Cpu, RefreshCw, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export const PredictionAnalyticsReport: React.FC = () => {
  const { data, loading, error, refresh, demand, depletion, consumptionTrend, strategyName } = useAiPredictionEngine();
  const [activeTab, setActiveTab] = useState<'demand' | 'depletion' | 'trends'>('depletion');

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <Cpu className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
        <p className="font-medium text-sm">Synthesizing AI Prediction Engine Analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-slate-300">
        <p className="text-sm font-semibold text-red-400">Prediction Analytics Engine Unavailable</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl text-slate-100">
      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">AI Prediction Analytics Engine</h3>
            <span className="text-xs bg-blue-500/10 text-blue-400 font-mono px-2 py-0.5 rounded border border-blue-500/20">
              {strategyName}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Multi-horizon predictive forecasting and automated depletion risk scheduling</p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('depletion')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'depletion' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Depletion Schedule ({depletion.length})
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'demand' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Demand Forecast ({demand.length})
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'trends' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Consumption Trends ({consumptionTrend.length})
          </button>
          <button
            onClick={refresh}
            title="Refresh Predictions"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab 1: Depletion Schedule */}
      {activeTab === 'depletion' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3 rounded-l-lg">Material</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">Threshold Limit</th>
                <th className="p-3">Daily Velocity</th>
                <th className="p-3">Est. Depletion</th>
                <th className="p-3 rounded-r-lg">Depletion Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {depletion.map((item, idx) => {
                const isCrit = item.depletion_status === 'DEPLETED' || item.depletion_status === 'BELOW_THRESHOLD' || (item.days_until_depletion !== null && item.days_until_depletion <= 14);

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-sans font-medium text-white">{item.material_name}</td>
                    <td className="p-3">{item.current_stock} {item.unit}</td>
                    <td className="p-3 text-slate-400">{item.threshold_limit} {item.unit}</td>
                    <td className="p-3 text-blue-400">{item.avg_daily_usage} {item.unit}/day</td>
                    <td className="p-3 text-slate-300">
                      {item.days_until_depletion !== null ? `~${item.days_until_depletion} days (${item.predicted_depletion_date})` : 'N/A'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                        isCrit ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {item.depletion_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Demand Forecast */}
      {activeTab === 'demand' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3 rounded-l-lg">Material</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">7-Day Forecast</th>
                <th className="p-3">14-Day Forecast</th>
                <th className="p-3">30-Day Forecast</th>
                <th className="p-3 rounded-r-lg">Confidence Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {demand.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-sans font-medium text-white">{item.material_name}</td>
                  <td className="p-3 text-slate-300">{item.current_stock} {item.unit}</td>
                  <td className="p-3 text-blue-400">{item.forecast_7d} {item.unit}</td>
                  <td className="p-3 text-indigo-400">{item.forecast_14d} {item.unit}</td>
                  <td className="p-3 font-bold text-purple-400">{item.forecast_30d} {item.unit}</td>
                  <td className="p-3 font-sans">
                    <span className="text-emerald-400 font-semibold">{item.confidence_score}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Consumption Trends */}
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {consumptionTrend.map((item, idx) => {
            const isUp = item.trend_direction === 'INCREASING';
            const isDown = item.trend_direction === 'DECREASING';

            return (
              <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-white mb-1">{item.material_name}</h4>
                  <div className="text-xs text-slate-400 font-mono">
                    Avg Usage: <span className="text-slate-200">{item.avg_daily_usage} KG/day</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${
                    isUp ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                    isDown ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {isUp && <ArrowUpRight className="w-3.5 h-3.5" />}
                    {isDown && <ArrowDownRight className="w-3.5 h-3.5" />}
                    {!isUp && !isDown && <Minus className="w-3.5 h-3.5" />}
                    <span>{item.trend_direction} ({item.trend_slope_pct > 0 ? `+${item.trend_slope_pct}%` : `${item.trend_slope_pct}%`})</span>
                  </div>
                  {item.anomaly_detected && (
                    <div className="text-[10px] text-amber-400 font-semibold mt-1">Usage Anomaly Flagged</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PredictionAnalyticsReport;

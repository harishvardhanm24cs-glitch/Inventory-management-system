import React, { useState } from 'react';
import useFeatureEngineering from '../hooks/useFeatureEngineering';
import {
  Layers, RefreshCw, Cpu, Activity, TrendingUp, Package, Clock, ShieldAlert,
  Sliders, Search, Info, CheckCircle2, ChevronRight
} from 'lucide-react';

export const FeatureEngineeringExplorer: React.FC = () => {
  const { data, catalog, loading, error, refresh } = useFeatureEngineering();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'catalog' | 'materials' | 'racks' | 'consumers'>('all');

  const materialFeatures = data?.material_features || [];
  const rackFeatures = data?.rack_features?.racks || [];
  const warehouseFeatures = data?.warehouse_features;

  const filteredMaterials = materialFeatures.filter(m =>
    m.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 shadow-lg shadow-indigo-500/20">
            <Sliders className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">Feature Engineering Console</h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md">
                {data?.metadata?.version || 'v1.0.0'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">10 Reusable, Model-Independent AI Features · Prediction Engine · Dashboard · Reports · Digital Twin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Features
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Feature KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Warehouse Utilization</span>
              <Package className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {warehouseFeatures?.warehouse_utilization?.warehouse_utilization_percentage ?? 0}%
            </div>
            <div className="text-[10px] font-mono text-cyan-300 mt-1">
              {warehouseFeatures?.warehouse_utilization?.utilization_status || 'NOMINAL'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Average Scan Interval</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {warehouseFeatures?.average_scan_time?.avg_scan_interval_formatted ?? '—'}
            </div>
            <div className="text-[10px] font-mono text-indigo-300 mt-1">
              Rating: {warehouseFeatures?.average_scan_time?.scan_efficiency_rating || 'NORMAL'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Active Racks Monitored</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{rackFeatures.length}</div>
            <div className="text-[10px] font-mono text-purple-300 mt-1">
              Overloaded: {rackFeatures.filter(r => r.status_flag === 'OVERLOADED').length}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Material Features</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{materialFeatures.length}</div>
            <div className="text-[10px] font-mono text-emerald-300 mt-1">
              Depleted/Risk: {materialFeatures.filter(m => m.risk_flag !== 'SAFE').length}
            </div>
          </div>
        </div>

        {/* Tab Navigation & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'all', label: 'Overview' },
              { id: 'catalog', label: 'Feature Catalog (10)' },
              { id: 'materials', label: 'Material Vectors' },
              { id: 'racks', label: 'Rack Features' },
              { id: 'consumers', label: 'Consuming Services' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(activeTab === 'materials' || activeTab === 'all') && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search material features..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-60"
              />
            </div>
          )}
        </div>

        {/* TAB 1: Catalog */}
        {(activeTab === 'catalog' || activeTab === 'all') && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" /> 10 Reusable Feature Specifications
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {catalog.map((feat, idx) => (
                <div key={feat.id || idx} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono text-[10px] flex items-center justify-center font-bold">
                        F{idx + 1}
                      </span>
                      {feat.name}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                      {feat.unit}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-emerald-300 bg-slate-950 p-2 rounded-lg border border-slate-800/80 mb-2">
                    {feat.formula}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Version: <strong className="text-slate-200">{feat.version}</strong></span>
                    <span className="truncate max-w-[200px]">Consumers: <strong className="text-indigo-300">{feat.consumed_by?.join(', ')}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Material Feature Vectors */}
        {(activeTab === 'materials' || activeTab === 'all') && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Material Feature Vectors ({filteredMaterials.length})
            </h4>
            <div className="rounded-xl border border-slate-800 overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Material</th>
                    <th className="px-3 py-2.5">Daily (24h)</th>
                    <th className="px-3 py-2.5">Weekly (7d)</th>
                    <th className="px-3 py-2.5">Monthly (30d)</th>
                    <th className="px-3 py-2.5">Turnover</th>
                    <th className="px-3 py-2.5">Movement Freq (30d)</th>
                    <th className="px-3 py-2.5">Activity Score</th>
                    <th className="px-3 py-2.5">Threshold Distance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {filteredMaterials.map((m, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 font-sans font-medium text-slate-200">
                        <div>{m.material_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{m.barcode}</div>
                      </td>
                      <td className="px-3 py-2 text-indigo-300">{m.daily_consumption} {m.unit}</td>
                      <td className="px-3 py-2 text-indigo-300">{m.weekly_consumption} {m.unit}</td>
                      <td className="px-3 py-2 text-indigo-300">{m.monthly_consumption} {m.unit}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.turnover_category === 'HIGH_TURNOVER' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {m.turnover_ratio}x ({m.turnover_category})
                        </span>
                      </td>
                      <td className="px-3 py-2 text-purple-300">{m.movement_events_30d} events</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full" style={{ width: `${m.activity_score}%` }} />
                          </div>
                          <span className="font-bold text-white">{m.activity_score}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.risk_flag === 'SAFE' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                        }`}>
                          {m.threshold_distance} {m.unit} ({m.risk_flag})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Rack Features */}
        {activeTab === 'racks' && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-purple-400" /> Rack Occupancy & Spatial Load Features
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {rackFeatures.map(r => (
                <div key={r.rack_code} className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white font-mono">{r.rack_code}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                      r.status_flag === 'OVERLOADED' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {r.status_flag}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mb-2 truncate">{r.material_name}</div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden mb-2 border border-slate-800">
                    <div
                      className={`h-full transition-all ${
                        r.occupancy_percentage >= 85 ? 'bg-red-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, r.occupancy_percentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Capacity: {r.current_capacity} / {r.max_capacity}</span>
                    <span className="font-bold text-white">{r.occupancy_percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Consuming Services Mapping */}
        {activeTab === 'consumers' && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Integrated Consumer Services
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'Prediction Engine', icon: Activity, desc: 'Consumes Daily/Weekly/Monthly Consumption, Turnover, and Activity Scores as feature tensors for predictive models.' },
                { name: 'Dashboard', icon: TrendingUp, desc: 'Displays real-time Warehouse Utilization, Average Scan Time, and Threshold Distance KPIs for operational control.' },
                { name: 'Reports', icon: Info, desc: 'Extracts Inventory Turnover, Monthly Consumption summaries, and Scan Efficiency metrics for audit reporting.' },
                { name: 'Digital Twin', icon: Layers, desc: 'Subscribes to live Rack Occupancy percentages and spatial load metrics to render 3D warehouse capacity overlays.' }
              ].map(c => (
                <div key={c.name} className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
                    <c.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white mb-1">{c.name}</h5>
                    <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeatureEngineeringExplorer;

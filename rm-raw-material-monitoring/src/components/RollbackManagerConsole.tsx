import React, { useState, useEffect, useCallback, type JSX } from 'react';
import {
  RotateCcw, ShieldCheck, ShieldAlert, Play, CheckCircle2, XCircle,
  Clock, RefreshCw, ChevronRight, AlertTriangle, History, UserCheck,
  Lock, Check, X, Database, FileCode2, Cpu, ArrowLeft
} from 'lucide-react';
import rollbackManagerService from '../services/rollbackManagerService';
import type {
  RollbackPlan, RollbackTarget, SimulationResult, RollbackHistoryEntry
} from '../services/rollbackManagerService';

// ─── Sub-components ────────────────────────────────────────────────────────

const Badge = ({ label, variant }: { label: string; variant: 'green' | 'rose' | 'yellow' | 'purple' | 'slate' | 'cyan' | 'indigo' }) => {
  const colors = {
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    yellow: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    slate: 'bg-slate-700/60 text-slate-400 border-slate-600',
    cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${colors[variant]}`}>
      {label}
    </span>
  );
};

const statusBadge = (status?: string): JSX.Element => {
  const s = (status || 'PENDING').toUpperCase();
  if (s === 'APPROVED') return <Badge label="APPROVED" variant="green" />;
  if (s === 'REJECTED') return <Badge label="REJECTED" variant="rose" />;
  if (s === 'SIMULATION_PASSED') return <Badge label="SIM PASSED" variant="green" />;
  if (s === 'SIMULATION_FAILED') return <Badge label="SIM FAILED" variant="rose" />;
  if (s === 'SIMULATED') return <Badge label="SIMULATED" variant="cyan" />;
  if (s === 'MANUAL_OVERRIDE') return <Badge label="OVERRIDE" variant="purple" />;
  if (s === 'PASS') return <Badge label="PASS" variant="green" />;
  if (s === 'FAIL') return <Badge label="FAIL" variant="rose" />;
  if (s === 'VERIFIED') return <Badge label="VERIFIED" variant="green" />;
  if (s === 'MISSING') return <Badge label="MISSING" variant="rose" />;
  if (s === 'MISMATCH') return <Badge label="MISMATCH" variant="rose" />;
  return <Badge label={s} variant="slate" />;
};

const MetricCard = ({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</div>
    <div className="text-lg font-extrabold font-mono text-slate-100">{value}<span className="text-xs text-slate-400 ml-1">{unit}</span></div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────

type ConsoleTab = 'eligible' | 'plan' | 'simulation' | 'history';

const RollbackManagerConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConsoleTab>('eligible');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data state
  const [eligibleTargets, setEligibleTargets] = useState<RollbackTarget[]>([]);
  const [productionModel, setProductionModel] = useState<string>('');
  const [productionModelName, setProductionModelName] = useState<string>('');
  const [activePlan, setActivePlan] = useState<RollbackPlan | null>(null);
  const [activeSimulation, setActiveSimulation] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<RollbackHistoryEntry[]>([]);

  // Override modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAction, setOverrideAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [overrideReviewer, setOverrideReviewer] = useState('ADMIN_MANAGER');
  const [overrideReason, setOverrideReason] = useState('Manual review confirmed rollback target stability.');

  // Request form
  const [requestReason, setRequestReason] = useState('Performance regression detected in production. Initiating rollback to stable baseline.');
  const [selectedTarget, setSelectedTarget] = useState<string>('');

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadEligible = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rollbackManagerService.getEligibleTargets();
      setEligibleTargets(res.eligible_targets);
      setProductionModel(res.production_model);
      setProductionModelName(res.production_model_name);
      if (res.eligible_targets.length > 0 && !selectedTarget) {
        setSelectedTarget(res.eligible_targets[0].model_version);
      }
    } catch {
      notify('error', 'Failed to fetch eligible rollback targets.');
    } finally {
      setLoading(false);
    }
  }, [selectedTarget]);

  const loadHistory = useCallback(async () => {
    try {
      const h = await rollbackManagerService.getHistory();
      setHistory(h);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadEligible();
    loadHistory();
  }, [loadEligible, loadHistory]);

  const handleRequestRollback = async () => {
    if (!selectedTarget) { notify('error', 'Please select a rollback target.'); return; }
    setActionLoading(true);
    try {
      const res = await rollbackManagerService.requestRollback({
        target_version: selectedTarget,
        reason: requestReason,
        requested_by: 'WAREHOUSE_MANAGER'
      });
      if (res.rollback_plan) {
        setActivePlan(res.rollback_plan);
        notify('success', `Rollback plan '${res.rollback_plan.rollback_id}' created. Validation: ${res.rollback_plan.validation_result}`);
        setActiveTab('plan');
        loadHistory();
      } else {
        notify('error', res.message || 'Failed to create rollback plan.');
      }
    } catch (e: any) {
      notify('error', e.message || 'Request failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulate = async () => {
    setActionLoading(true);
    try {
      const payload: any = activePlan?.rollback_id
        ? { rollback_id: activePlan.rollback_id }
        : { target_version: selectedTarget };
      const res = await rollbackManagerService.simulate({ ...payload, requested_by: 'SYSTEM' });
      if (res.simulation) {
        setActiveSimulation(res.simulation);
        if (res.rollback_plan) setActivePlan(res.rollback_plan);
        notify(res.simulation.passed ? 'success' : 'error',
          `Simulation ${res.simulation.passed ? 'PASSED' : 'FAILED'}: ${res.simulation.steps_passed}/${res.simulation.steps_total} checks passed.`);
        setActiveTab('simulation');
        loadHistory();
      } else {
        notify('error', res.message || 'Simulation failed.');
      }
    } catch (e: any) {
      notify('error', e.message || 'Simulation error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!activePlan?.rollback_id) { notify('error', 'No active rollback plan to approve.'); return; }
    setActionLoading(true);
    try {
      const res = await rollbackManagerService.approve({
        rollback_id: activePlan.rollback_id,
        reviewer: 'WAREHOUSE_MANAGER',
        reason: 'Plan reviewed and approved after simulation verification.'
      });
      if (res.rollback_plan) {
        setActivePlan(res.rollback_plan);
        notify('success', `Rollback plan APPROVED. Plan ID: ${res.rollback_plan.rollback_id}`);
        loadHistory();
      } else {
        notify('error', res.message || 'Approval failed.');
      }
    } catch (e: any) {
      notify('error', e.message || 'Approval error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!activePlan?.rollback_id) { notify('error', 'No active rollback plan to reject.'); return; }
    setActionLoading(true);
    try {
      const res = await rollbackManagerService.reject({
        rollback_id: activePlan.rollback_id,
        reviewer: 'WAREHOUSE_MANAGER',
        reason: 'Rollback plan rejected after review.'
      });
      if (res.rollback_plan) {
        setActivePlan(res.rollback_plan);
        notify('error', `Rollback plan REJECTED.`);
        loadHistory();
      }
    } catch (e: any) {
      notify('error', e.message || 'Rejection error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOverrideSubmit = async () => {
    if (!activePlan?.rollback_id) { notify('error', 'No active plan.'); return; }
    setActionLoading(true);
    try {
      const callFn = overrideAction === 'APPROVE' ? rollbackManagerService.approve.bind(rollbackManagerService) : rollbackManagerService.reject.bind(rollbackManagerService);
      const result = await callFn({ rollback_id: activePlan.rollback_id, reviewer: overrideReviewer, reason: overrideReason });
      if (result.rollback_plan) {
        setActivePlan(result.rollback_plan);
        notify('success', `Manual override applied: ${overrideAction}`);
        setShowOverrideModal(false);
        loadHistory();
      } else {
        notify('error', 'Override failed — no plan returned.');
      }
    } catch (e: any) {
      notify('error', e.message || 'Override failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const planApproved = activePlan?.approval_status === 'APPROVED';
  const planRejected = activePlan?.approval_status === 'REJECTED';
  const simPassed = activeSimulation?.passed === true;
  const validationOk = activePlan?.validation_result === 'PASS';

  const tabs: { id: ConsoleTab; label: string; icon: JSX.Element; count?: number }[] = [
    { id: 'eligible', label: 'Eligible Targets', icon: <Database className="w-3.5 h-3.5" />, count: eligibleTargets.length },
    { id: 'plan', label: 'Rollback Plan', icon: <FileCode2 className="w-3.5 h-3.5" /> },
    { id: 'simulation', label: 'Simulation Results', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'Audit History', icon: <History className="w-3.5 h-3.5" />, count: history.length },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
            <RotateCcw className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">Rollback Manager</h3>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-md border bg-rose-500/20 text-rose-300 border-rose-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" /> MODULE 7A.6
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded border bg-amber-500/10 text-amber-400 border-amber-500/30">
                READ-ONLY PLANNING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Eligibility Validation · Dry-Run Simulation · Approval Workflow · Audit Logging · Non-Modifying
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulate}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : 'fill-current'}`} />
            Run Simulation
          </button>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/50 text-xs font-bold transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-400" /> Manual Override
          </button>
          <button
            onClick={() => { loadEligible(); loadHistory(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Notification */}
        {notification && (
          <div className={`p-3.5 rounded-xl text-xs font-medium border ${notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
            {notification.message}
          </div>
        )}

        {/* Current Production Status Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-rose-950/10 to-slate-950 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active Production Model</div>
              <div className="text-lg font-extrabold font-mono text-white">{productionModel || 'v1.0.0'}</div>
              <div className="text-xs text-slate-400">{productionModelName || 'Production Model'}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase">Eligible Targets</div>
              <div className="text-xl font-extrabold font-mono text-rose-400">{eligibleTargets.length}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
            {activePlan && (
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase">Active Plan</div>
                <div className="text-sm font-bold font-mono text-amber-400">{activePlan.rollback_id}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${activeTab === tab.id
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab 1: Eligible Targets ──────────────────────────────────────── */}
        {activeTab === 'eligible' && (
          <div className="space-y-4">
            {/* Request form */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" /> Request New Rollback Plan
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Target Model Version</label>
                  <select
                    value={selectedTarget}
                    onChange={e => setSelectedTarget(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                  >
                    <option value="">-- Select eligible target --</option>
                    {eligibleTargets.map(t => (
                      <option key={t.model_version} value={t.model_version}>
                        {t.model_version} · {t.model_name} [{t.status}]
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">Rollback Reason</label>
                  <input
                    type="text"
                    value={requestReason}
                    onChange={e => setRequestReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-sans text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
              <button
                onClick={handleRequestRollback}
                disabled={actionLoading || !selectedTarget}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                Generate Rollback Plan
              </button>
            </div>

            {/* Eligible target cards */}
            {eligibleTargets.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                {loading ? 'Loading eligible targets…' : 'No eligible rollback targets found.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eligibleTargets.map(target => {
                  const elig = target._eligibility;
                  return (
                    <div
                      key={target.model_version}
                      onClick={() => setSelectedTarget(target.model_version)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTarget === target.model_version
                        ? 'border-rose-500/60 bg-rose-950/20 shadow-lg shadow-rose-500/10'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-xs font-bold text-white font-mono">{target.model_version}</div>
                          <div className="text-[11px] text-slate-400">{target.model_name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(target.status)}
                          {elig?.eligible
                            ? <Badge label="ELIGIBLE" variant="green" />
                            : <Badge label="INELIGIBLE" variant="rose" />
                          }
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono border-t border-slate-800 pt-3">
                        <div><div className="text-slate-400">MAE</div><div className="text-emerald-400 font-bold">{target.mae}</div></div>
                        <div><div className="text-slate-400">RMSE</div><div className="text-cyan-400 font-bold">{target.rmse}</div></div>
                        <div><div className="text-slate-400">R²</div><div className="text-indigo-400 font-bold">{target.r2_score}</div></div>
                        <div><div className="text-slate-400">Dataset</div><div className="text-slate-300 font-bold">{target.dataset_version || 'N/A'}</div></div>
                      </div>
                      {elig && (
                        <div className="mt-3 space-y-1">
                          {elig.checks.map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-400">{c.check}</span>
                              {c.passed
                                ? <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> {c.actual}</span>
                                : <span className="text-rose-400 flex items-center gap-1"><X className="w-3 h-3" /> {c.actual}</span>
                              }
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Rollback Plan ─────────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="space-y-5">
            {!activePlan ? (
              <div className="text-center py-16 text-slate-500 text-sm space-y-3">
                <FileCode2 className="w-10 h-10 mx-auto text-slate-700" />
                <p>No rollback plan generated yet.</p>
                <button
                  onClick={() => setActiveTab('eligible')}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Select a Target
                </button>
              </div>
            ) : (
              <>
                {/* Plan summary card */}
                <div className={`p-5 rounded-xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${planApproved
                  ? 'bg-gradient-to-r from-slate-950 via-emerald-950/15 to-slate-950 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                  : planRejected
                    ? 'bg-gradient-to-r from-slate-950 via-rose-950/15 to-slate-950 border-rose-500/40'
                    : 'bg-gradient-to-r from-slate-950 via-rose-950/10 to-slate-950 border-rose-500/30'
                  }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl border ${planApproved ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      }`}>
                      {planApproved ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-slate-400">Plan ID: <span className="text-rose-300 font-bold">{activePlan.rollback_id}</span></span>
                        {statusBadge(activePlan.approval_status || 'PENDING')}
                        {activePlan.manual_override && <Badge label="MANUAL OVERRIDE" variant="purple" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-extrabold font-mono text-white">{activePlan.approval_status || 'PENDING'}</h4>
                        {statusBadge(activePlan.validation_result)}
                      </div>
                      <p className="text-xs text-slate-300 max-w-lg">{activePlan.reason}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-right border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6 w-full lg:w-auto">
                    <div><div className="text-[10px] text-slate-400 uppercase">Production</div><div className="text-sm font-bold text-slate-200">{activePlan.current_production_model}</div></div>
                    <div><div className="text-[10px] text-slate-400 uppercase">Target</div><div className="text-sm font-bold text-rose-300">{activePlan.target_model}</div></div>
                    <div><div className="text-[10px] text-slate-400 uppercase">Validation</div><div className={`text-sm font-extrabold ${validationOk ? 'text-emerald-400' : 'text-rose-400'}`}>{activePlan.validation_result}</div></div>
                  </div>
                </div>

                {/* Verification grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Artifact Status', value: activePlan.artifact_status, icon: <Database className="w-4 h-4" /> },
                    { label: 'Checksum (SHA-256)', value: activePlan.checksum_status, icon: <ShieldCheck className="w-4 h-4" /> },
                    { label: 'Dataset Linkage', value: activePlan.dataset_status, icon: <FileCode2 className="w-4 h-4" /> },
                  ].map(item => (
                    <div key={item.label} className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${item.value === 'VERIFIED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">{item.label}</div>
                        <div className="font-bold text-xs font-mono">{statusBadge(item.value)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Performance delta */}
                {activePlan.performance_delta && (
                  <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Performance Delta (Target vs Production)</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <MetricCard label="MAE (Target)" value={activePlan.target_metrics?.mae?.toFixed(4) || 'N/A'} />
                      <MetricCard label="R² (Target)" value={activePlan.target_metrics?.r2_score?.toFixed(4) || 'N/A'} />
                      <MetricCard label="RMSE (Target)" value={activePlan.target_metrics?.rmse?.toFixed(4) || 'N/A'} />
                      <MetricCard
                        label="MAE Δ"
                        value={activePlan.performance_delta.mae_delta >= 0
                          ? `+${activePlan.performance_delta.mae_delta.toFixed(4)}`
                          : activePlan.performance_delta.mae_delta.toFixed(4)}
                      />
                    </div>
                  </div>
                )}

                {/* Eligibility checklist */}
                {activePlan.eligibility_result && (
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                      Eligibility Checklist ({activePlan.eligibility_result.passed_count}/{activePlan.eligibility_result.total_checks} passed)
                    </div>
                    <div className="divide-y divide-slate-800/60">
                      {activePlan.eligibility_result.checks.map((c, i) => (
                        <div key={i} className="p-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-200">{c.check}</div>
                            <div className="text-slate-500 font-mono text-[10px]">Expected: {c.expected}</div>
                          </div>
                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            <span className="text-slate-400">{c.actual}</span>
                            {c.passed
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              : <XCircle className="w-4 h-4 text-rose-400" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approve / Reject actions */}
                {!planApproved && !planRejected && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Rollback Plan
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> Reject Plan
                    </button>
                    <button
                      onClick={handleSimulate}
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5" /> Re-simulate
                    </button>
                  </div>
                )}
                {planApproved && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 font-mono flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Plan APPROVED by {activePlan.reviewed_by || 'Manager'} at {activePlan.approved_at ? new Date(activePlan.approved_at).toLocaleString() : 'N/A'}.
                    Production model has NOT been changed. This is a planning-only approval.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tab 3: Simulation Results ─────────────────────────────────────── */}
        {activeTab === 'simulation' && (
          <div className="space-y-5">
            {!activeSimulation ? (
              <div className="text-center py-16 text-slate-500 text-sm space-y-3">
                <Cpu className="w-10 h-10 mx-auto text-slate-700" />
                <p>No simulation executed yet.</p>
                <button
                  onClick={handleSimulate}
                  disabled={actionLoading}
                  className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Run Simulation
                </button>
              </div>
            ) : (
              <>
                {/* Sim summary */}
                <div className={`p-5 rounded-xl border ${simPassed ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-rose-500/40 bg-rose-950/10'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl border ${simPassed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                        {simPassed ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="text-xs font-mono text-slate-400">Simulation ID: <span className="text-cyan-300">{activeSimulation.simulation_id}</span></div>
                        <div className="text-xl font-extrabold font-mono text-white">{activeSimulation.status}</div>
                        <div className="text-xs text-slate-400">{activeSimulation.note}</div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-[10px] text-slate-400">Steps Passed</div>
                      <div className={`text-3xl font-extrabold ${simPassed ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {activeSimulation.steps_passed}<span className="text-slate-600 text-lg">/{activeSimulation.steps_total}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{activeSimulation.duration_ms}ms</div>
                    </div>
                  </div>
                  {activeSimulation.errors.length > 0 && (
                    <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-xs text-rose-300 font-mono space-y-1">
                      {activeSimulation.errors.map((e, i) => (
                        <div key={i} className="flex items-center gap-2"><AlertTriangle className="w-3 h-3 shrink-0" />{e}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step-by-step results */}
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Dry-Run Verification Steps
                  </div>
                  <div className="divide-y divide-slate-800/60">
                    {activeSimulation.steps.map(step => (
                      <div key={step.step} className="p-4 flex items-start gap-4">
                        <div className={`mt-0.5 w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0 ${step.passed ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          }`}>{step.step}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-200">{step.name}</span>
                            {step.passed
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              : <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            }
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">{step.description}</p>
                          <p className={`text-[11px] font-mono mt-1 ${step.passed ? 'text-emerald-400' : 'text-rose-400'}`}>{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Tab 4: Audit History ──────────────────────────────────────────── */}
        {activeTab === 'history' && (
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-rose-400" /> Rollback Audit Trail
              </div>
              <span className="text-[10px] font-mono text-slate-400">Table: rollback_history</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Rollback ID</th>
                    <th className="py-2.5 px-4 font-semibold">From</th>
                    <th className="py-2.5 px-4 font-semibold">Target</th>
                    <th className="py-2.5 px-4 font-semibold">Decision</th>
                    <th className="py-2.5 px-4 font-semibold">Artifact</th>
                    <th className="py-2.5 px-4 font-semibold">Reviewer</th>
                    <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500 text-xs font-sans">
                        No rollback events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((row, idx) => (
                      <tr key={`${row.rollback_id}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-rose-300">{row.rollback_id}</td>
                        <td className="py-2.5 px-4 text-slate-300">{row.current_production_model || row.current_model || 'N/A'}</td>
                        <td className="py-2.5 px-4 text-cyan-300 font-bold">{row.target_model}</td>
                        <td className="py-2.5 px-4">{statusBadge(row.decision || row.event_type)}</td>
                        <td className="py-2.5 px-4">{statusBadge(row.artifact_status || 'UNKNOWN')}</td>
                        <td className="py-2.5 px-4 text-slate-300">{row.reviewed_by}</td>
                        <td className="py-2.5 px-4 text-slate-400 text-[10px]">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                            : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Manual Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserCheck className="w-4 h-4 text-purple-400" /> Manual Rollback Override
              </div>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs font-sans">
              {!activePlan && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Generate a rollback plan first from the Eligible Targets tab.
                </div>
              )}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Override Decision</label>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  {(['APPROVE', 'REJECT'] as const).map(action => (
                    <button
                      key={action}
                      onClick={() => setOverrideAction(action)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${overrideAction === action
                        ? action === 'APPROVE'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                          : 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/20'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800'
                        }`}
                    >
                      FORCE {action}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Reviewer / Role</label>
                <input
                  type="text"
                  value={overrideReviewer}
                  onChange={e => setOverrideReviewer(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Justification</label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-sans text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleOverrideSubmit}
                disabled={actionLoading || !activePlan}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirm Override
              </button>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RollbackManagerConsole;

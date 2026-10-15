import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Play,
  Settings, History, AlertTriangle, ArrowRight, UserCheck, Check,
  X, Lock, FileText, Sliders, Cpu, Scale
} from 'lucide-react';
import deploymentDecisionService from '../services/deploymentDecisionService';
import type { DeploymentDecision, PolicyConfigMap, RuleItem } from '../services/deploymentDecisionService';

export const DeploymentDecisionConsole: React.FC = () => {
  const [activeDecision, setActiveDecision] = useState<DeploymentDecision | null>(null);
  const [history, setHistory] = useState<DeploymentDecision[]>([]);
  const [policies, setPolicies] = useState<PolicyConfigMap | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [overrideLoading, setOverrideLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'decision' | 'history' | 'policies'>('decision');
  
  
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideAction, setOverrideAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewerName, setReviewerName] = useState<string>('ADMIN_MANAGER');
  const [overrideReason, setOverrideReason] = useState<string>('Validated candidate stability in staging environment');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dec = await deploymentDecisionService.getDecision();
      if (dec) setActiveDecision(dec);

      const hist = await deploymentDecisionService.getHistory();
      if (hist && Array.isArray(hist)) setHistory(hist);

      const pols = await deploymentDecisionService.getPolicies();
      if (pols) setPolicies(pols);
    } catch (err: any) {
      console.error('[DeploymentDecisionConsole] loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await deploymentDecisionService.evaluateCandidate();
      if (res?.status === 'SUCCESS' && res?.decision) {
        setActiveDecision(res.decision);
        notify('success', `Evaluation Complete! Decision: ${res.decision.decision} (${res.decision.confidence}% confidence)`);
        loadData();
      } else {
        notify('error', res?.message || 'Failed to evaluate candidate deployment.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error executing deployment evaluation.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!activeDecision?.decision_id) {
      notify('error', 'No active decision available to override.');
      return;
    }
    setOverrideLoading(true);
    try {
      const res = await deploymentDecisionService.overrideDecision({
        decision_id: activeDecision.decision_id,
        override_action: overrideAction,
        reviewer: reviewerName,
        reason: overrideReason
      });
      if (res?.status === 'SUCCESS' && res?.decision) {
        setActiveDecision(res.decision);
        notify('success', `Manual Override Applied: ${res.decision.decision}`);
        setShowOverrideModal(false);
        loadData();
      } else {
        notify('error', res?.message || 'Failed to apply manual override.');
      }
    } catch (err: any) {
      notify('error', err.message || 'Error applying manual override.');
    } finally {
      setOverrideLoading(false);
    }
  };

  const handlePolicyToggle = async (ruleKey: string, currentEnabled: boolean) => {
    if (!policies) return;
    const updatedPolicies = {
      ...policies,
      [ruleKey]: {
        ...policies[ruleKey],
        enabled: !currentEnabled
      }
    };
    setPolicies(updatedPolicies);
    try {
      const res = await deploymentDecisionService.savePolicies(updatedPolicies);
      if (res?.status === 'SUCCESS') {
        notify('success', `Policy rule '${ruleKey}' updated.`);
      }
    } catch (err: any) {
      notify('error', 'Failed to update policy.');
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

  const isApproved = activeDecision?.decision === 'APPROVED';
  const isRejected = activeDecision?.decision === 'REJECTED';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">Deployment Decision Engine</h3>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-md border bg-indigo-500/20 text-indigo-300 border-indigo-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                MODULE 7A.5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Policy-Based Deployment Evaluation · Approval Workflow · Audit Log · Non-Modifying Decision Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${evaluating ? 'animate-spin' : 'fill-current'}`} />
            Evaluate Candidate
          </button>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/50 text-xs font-bold transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-400" />
            Manual Override
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync
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

        
        <div className={`p-5 rounded-xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${
          isApproved
            ? 'bg-gradient-to-r from-slate-950 via-emerald-950/20 to-slate-950 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : isRejected
            ? 'bg-gradient-to-r from-slate-950 via-rose-950/20 to-slate-950 border-rose-500/40 shadow-lg shadow-rose-500/10'
            : 'bg-gradient-to-r from-slate-950 via-purple-950/20 to-slate-950 border-purple-500/40'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border ${
              isApproved
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {isApproved ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">Decision ID: <span className="text-slate-200 font-bold">{activeDecision?.decision_id || 'DEC-20260728-0001'}</span></span>
                {activeDecision?.manual_override && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    MANUAL OVERRIDE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <h4 className="text-2xl font-extrabold tracking-tight text-white font-mono">
                  {activeDecision?.decision || 'EVALUATION PENDING'}
                </h4>
                <span className={`px-3 py-1 text-xs font-mono font-bold rounded-lg border ${
                  isApproved ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  {isApproved ? 'ELIGIBLE FOR PROMOTION' : 'PROMOTION REJECTED'}
                </span>
              </div>

              <p className="text-xs text-slate-300 max-w-xl">
                {activeDecision?.reason || 'Evaluation ready for candidate model review.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-right border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6 w-full lg:w-auto">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Production Model</div>
              <div className="text-sm font-bold text-slate-200">{activeDecision?.production_model || 'v1.0.0'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Candidate Model</div>
              <div className="text-sm font-bold text-cyan-300">{activeDecision?.candidate_model || 'v1.1.0'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Policy Confidence</div>
              <div className="text-sm font-extrabold text-emerald-400">{activeDecision?.confidence ?? 100}%</div>
            </div>
          </div>
        </div>

        
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('decision')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'decision' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Passed & Failed Rules Breakdown
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Decision History Log ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'policies' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Configurable Deployment Policies
          </button>
        </div>

        
        {activeTab === 'decision' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="border border-emerald-500/30 rounded-xl overflow-hidden bg-slate-950/50">
              <div className="p-4 bg-emerald-950/30 border-b border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  Passed Policy Rules ({activeDecision?.passed_rules?.length || 0})
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-300">
                  PASSED
                </span>
              </div>
              <div className="p-4 space-y-3">
                {activeDecision?.passed_rules && activeDecision.passed_rules.length > 0 ? (
                  activeDecision.passed_rules.map((rule, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{rule.name}</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> VERIFIED
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400">{rule.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs italic">
                    No rules evaluated or no passed rules recorded.
                  </div>
                )}
              </div>
            </div>

            
            <div className="border border-rose-500/30 rounded-xl overflow-hidden bg-slate-950/50">
              <div className="p-4 bg-rose-950/30 border-b border-rose-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <XCircle className="w-4 h-4" />
                  Failed Policy Rules ({activeDecision?.failed_rules?.length || 0})
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-rose-500/20 text-rose-300">
                  {activeDecision?.failed_rules?.length ? 'VIOLATIONS DETECTED' : 'ZERO VIOLATIONS'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                {activeDecision?.failed_rules && activeDecision.failed_rules.length > 0 ? (
                  activeDecision.failed_rules.map((rule, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-900/80 border border-rose-900/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-300">{rule.name}</span>
                        <span className="text-[10px] font-mono text-rose-400 font-bold flex items-center gap-1">
                          <X className="w-3 h-3" /> FAILED
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-300">{rule.detail}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-emerald-400/80 text-xs font-medium flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    Candidate model satisfies all configured deployment safety standards.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        
        {activeTab === 'history' && (
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                Deployment Evaluation Audit Trail
              </div>
              <span className="text-[10px] font-mono text-slate-400">Table: deployment_decisions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Decision ID</th>
                    <th className="py-2.5 px-4 font-semibold">Production Model</th>
                    <th className="py-2.5 px-4 font-semibold">Candidate Model</th>
                    <th className="py-2.5 px-4 font-semibold">Decision</th>
                    <th className="py-2.5 px-4 font-semibold">Confidence</th>
                    <th className="py-2.5 px-4 font-semibold">Reviewer</th>
                    <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs font-sans">
                        No evaluation history entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((row) => (
                      <tr key={row.decision_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-indigo-300">{row.decision_id}</td>
                        <td className="py-2.5 px-4 text-slate-300">{row.production_model}</td>
                        <td className="py-2.5 px-4 text-cyan-300 font-bold">{row.candidate_model}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            row.decision === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            row.decision === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}>
                            {row.decision}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-emerald-400 font-bold">{row.confidence}%</td>
                        <td className="py-2.5 px-4 text-slate-300">{row.reviewed_by}</td>
                        <td className="py-2.5 px-4 text-slate-400 text-[10px]">{formatTimestamp(row.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        
        {activeTab === 'policies' && policies && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" /> Policy Rule Registry Configuration
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Enable or disable deployment rules for automated policy evaluation.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(policies).map(([key, config]) => (
                <div key={key} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white font-mono">{config.name}</div>
                    <p className="text-[11px] text-slate-400 font-sans">{config.description}</p>
                  </div>
                  <button
                    onClick={() => handlePolicyToggle(key, config.enabled)}
                    className={`px-3 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                      config.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {config.enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserCheck className="w-4 h-4 text-purple-400" />
                Apply Manual Decision Override
              </div>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Override Decision</label>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <button
                    onClick={() => setOverrideAction('APPROVE')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      overrideAction === 'APPROVE'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    FORCE APPROVE
                  </button>
                  <button
                    onClick={() => setOverrideAction('REJECT')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      overrideAction === 'REJECT'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-500/20'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800'
                    }`}
                  >
                    FORCE REJECT
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Reviewer Name / Role</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Audit Reason / Justification</label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-sans text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleApplyOverride}
                disabled={overrideLoading}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                {overrideLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Confirm Override Audit
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

export default DeploymentDecisionConsole;

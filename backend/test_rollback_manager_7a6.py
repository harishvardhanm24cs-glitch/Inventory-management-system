"""
test_rollback_manager_7a6.py
End-to-end test suite for Module 7A.6 Rollback Manager.
Validates all core workflows without modifying production.
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
INFO = "\033[94m[INFO]\033[0m"

results = []

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    print(f"  {status} {label}" + (f" — {detail}" if detail else ""))
    results.append((label, condition))

print("\n" + "="*65)
print("  MODULE 7A.6 – ROLLBACK MANAGER  |  End-to-End Test Suite")
print("="*65)

print("\n[1] EligibilityValidator")
try:
    from ai.rollback_manager import EligibilityValidator
    v = EligibilityValidator()

    valid_model = {
        "model_version": "v0.9.0", "model_name": "Test Model",
        "status": "ARCHIVED", "dataset_version": "2026.07.001",
        "model_id": "mod_test", "algorithm": "GradientBoostingRegressor",
        "mae": 0.90, "r2_score": 0.92,
        "checksum": "abc123def456abc123def456abc123def456abc123def456abc123def456abc123",
        "artifact_path": ""
    }
    result = v.validate(valid_model)
    check("EligibilityValidator imports", True)
    check("Status check (ARCHIVED passes)", any(c["check"] == "Status Eligibility" and c["passed"] for c in result["checks"]))
    check("Dataset check runs", any(c["check"] == "Dataset Linkage" for c in result["checks"]))
    check("Metadata check runs", any(c["check"] == "Metadata Completeness" for c in result["checks"]))
    check("Returns eligible bool", isinstance(result["eligible"], bool))

    prod_model = {**valid_model, "status": "PRODUCTION"}
    prod_result = v.validate(prod_model)
    check("PRODUCTION status correctly ineligible",
          not any(c["passed"] for c in prod_result["checks"] if c["check"] == "Status Eligibility"),
          f"eligible={prod_result['eligible']}")
except Exception as e:
    check("EligibilityValidator import FAILED", False, str(e))

print("\n[2] RollbackPlanner")
try:
    from ai.rollback_manager import RollbackPlanner
    planner = RollbackPlanner()

    prod = {"model_version": "v1.0.0", "model_name": "Production v1", "algorithm": "GBR",
            "mae": 0.85, "rmse": 1.12, "r2_score": 0.94, "cv_score": 0.92}
    target = {"model_version": "v0.9.0", "model_name": "Archived v0.9", "algorithm": "GBR",
              "status": "ARCHIVED", "dataset_version": "2026.07.001",
              "model_id": "mod_v090", "mae": 0.90, "rmse": 1.18, "r2_score": 0.92, "cv_score": 0.90,
              "checksum": "abc123def456abc123def456abc123def456abc123def456abc123def456abc123"}

    plan = planner.generate_plan(prod, target, "Test reason", "TEST_ENGINEER")
    check("Plan generated", plan is not None)
    check("Plan has rollback_id", bool(plan.get("rollback_id", "").startswith("RB-")))
    check("Plan has current_production_model", plan.get("current_production_model") == "v1.0.0")
    check("Plan has target_model", plan.get("target_model") == "v0.9.0")
    check("Plan has eligibility_result", "eligibility_result" in plan)
    check("Plan has performance_delta", "performance_delta" in plan)
    check("Plan has artifact_status", "artifact_status" in plan)
    check("Plan has checksum_status", "checksum_status" in plan)
    check("Plan has dataset_status", "dataset_status" in plan)
    check("Plan validation_result is string", isinstance(plan.get("validation_result"), str))
    stored_plan = plan
except Exception as e:
    check("RollbackPlanner FAILED", False, str(e))
    stored_plan = None

print("\n[3] SimulationEngine")
try:
    from ai.rollback_manager import SimulationEngine
    engine = SimulationEngine()
    plan_for_sim = stored_plan or {
        "rollback_id": "RB-TEST", "target_model": "v0.9.0",
        "current_production_model": "v1.0.0", "artifact_path": "",
        "target_dataset_version": "2026.07.001"
    }
    sim = engine.run(plan_for_sim, [])
    check("Simulation runs without crash", sim is not None)
    check("Simulation has steps", len(sim.get("steps", [])) == 5)
    check("Simulation has passed bool", isinstance(sim.get("passed"), bool))
    check("Simulation has errors list", isinstance(sim.get("errors"), list))
    check("Simulation has duration_ms", isinstance(sim.get("duration_ms"), int))
    check("Note says DRY RUN", "DRY RUN" in sim.get("note", ""))
    check("Steps have name/detail fields", all("name" in s and "detail" in s for s in sim["steps"]))
except Exception as e:
    check("SimulationEngine FAILED", False, str(e))

print("\n[4] ApprovalManager")
try:
    from ai.rollback_manager import ApprovalManager
    mgr = ApprovalManager()

    plan_a = {"rollback_id": "RB-TEST-APPROVE", "validation_result": "PASS", "approval_status": "PENDING"}

    ok, msg, updated = mgr.approve(plan_a, "TEST_MANAGER", "Test approval")
    check("Approve (PASS plan) succeeds", ok, msg)
    check("Updated plan has APPROVED status", updated.get("approval_status") == "APPROVED")
    check("Updated plan has reviewer", updated.get("reviewed_by") == "TEST_MANAGER")

    ok2, msg2, _ = mgr.approve(updated, "TEST_MANAGER", "Retry")
    check("Double-approve returns False", not ok2, msg2)

    plan_fail = {"rollback_id": "RB-TEST-FAIL", "validation_result": "FAIL", "approval_status": "PENDING"}
    ok_fail, msg_fail, _ = mgr.approve(plan_fail, "TEST_MANAGER", "Should block")
    check("Approve (FAIL plan) correctly blocked", not ok_fail, msg_fail)

    plan_r = {"rollback_id": "RB-TEST-REJECT", "validation_result": "FAIL", "approval_status": "PENDING"}
    ok3, msg3, updated3 = mgr.reject(plan_r, "TEST_MANAGER", "Test rejection")
    check("Reject returns success", ok3, msg3)
    check("Updated plan has REJECTED status", updated3.get("approval_status") == "REJECTED")

    plan_o = {"rollback_id": "RB-TEST-OVR", "validation_result": "FAIL"}
    ok4, msg4, updated4 = mgr.manual_override(plan_o, "APPROVE", "ADMIN", "Override test")
    check("Manual override APPROVE works", ok4 and updated4.get("manual_override") is True, msg4)

    ok5, msg5, _ = mgr.manual_override(plan_o, "INVALID_ACTION", "ADMIN", "Bad action")
    check("Invalid override action rejected", not ok5, msg5)
except Exception as e:
    check("ApprovalManager FAILED", False, str(e))

print("\n[5] RollbackHistory")
try:
    from ai.rollback_manager import RollbackHistory
    hist = RollbackHistory()
    entry = hist.log_event("RB-TEST-001", "REQUESTED", "TEST_ACTOR", "Unit test", "v1.0.0", "v0.9.0")
    check("History logs event", entry is not None)
    check("Entry has rollback_id", entry.get("rollback_id") == "RB-TEST-001")
    check("Entry has timestamp", "timestamp" in entry)

    all_hist = hist.get_history()
    check("Get history returns list", isinstance(all_hist, list))
    check("Event appears in history", any(e.get("rollback_id") == "RB-TEST-001" for e in all_hist))

    by_id = hist.get_by_rollback_id("RB-TEST-001")
    check("Get by rollback_id works", len(by_id) >= 1)

    filtered = hist.get_history("REQUESTED")
    check("Filter by event_type works", all(e.get("event_type") == "REQUESTED" or e.get("decision") == "REQUESTED" for e in filtered))
except Exception as e:
    check("RollbackHistory FAILED", False, str(e))

print("\n[6] RollbackManager (Orchestrator)")
try:
    from ai.rollback_manager import RollbackManager
    manager = RollbackManager()

    elig = manager.get_eligible_targets()
    check("get_eligible_targets returns SUCCESS", elig.get("status") == "SUCCESS")
    check("eligible_targets is list", isinstance(elig.get("eligible_targets"), list))
    check("production_model is present", bool(elig.get("production_model")))

    req = manager.request_rollback(reason="7A.6 integration test", requested_by="TEST")
    check("request_rollback returns SUCCESS", req.get("status") == "SUCCESS")
    plan = req.get("rollback_plan")
    check("rollback_plan in response", plan is not None)
    rb_id = plan["rollback_id"] if plan else None

    if rb_id:
        sim_res = manager.simulate_rollback(rb_id, requested_by="TEST")
        check("simulate_rollback returns SUCCESS", sim_res.get("status") == "SUCCESS")
        sim = sim_res.get("simulation")
        check("simulation result present", sim is not None)
        check("simulation has steps", len((sim or {}).get("steps", [])) > 0)

    if rb_id:
        app_res = manager.approve_rollback(rb_id, "TEST_MANAGER", "Integration test approval")
        check("approve_rollback returns SUCCESS", app_res.get("status") == "SUCCESS")
        check("Plan status is APPROVED", (app_res.get("rollback_plan") or {}).get("approval_status") == "APPROVED")

    if rb_id:
        ov_res = manager.manual_override(rb_id, "REJECT", "ADMIN", "Override test")
        check("manual_override returns SUCCESS", ov_res.get("status") == "SUCCESS")
        check("Manual override sets manual_override=True", (ov_res.get("rollback_plan") or {}).get("manual_override") is True)

    hist_res = manager.get_history()
    check("get_history returns list", isinstance(hist_res, list))
except Exception as e:
    check("RollbackManager FAILED", False, str(e))
    import traceback; traceback.print_exc()

print("\n[7] AI Bridge Action Routing")
try:
    from ai.rollback_manager import RollbackManager as RM2
    m = RM2()
    actions = [
        ("rollback_eligible",  lambda: m.get_eligible_targets()),
        ("rollback_request",   lambda: m.request_rollback()),
        ("rollback_history",   lambda: {"status": "SUCCESS", "history": m.get_history()}),
        ("rollback_latest",    lambda: m.get_latest_plan()),
    ]
    for name, fn in actions:
        try:
            res = fn()
            check(f"Action '{name}' executes", res is not None and res.get("status") == "SUCCESS", f"status={res.get('status')}")
        except Exception as ae:
            check(f"Action '{name}' executes", False, str(ae))
except Exception as e:
    check("Bridge routing test FAILED", False, str(e))

print("\n[8] Production Safety Checks")
try:
    from ai.model_registry import ModelRegistry
    reg = ModelRegistry()
    prod_before = (reg.get_current_production_model() or {}).get("model_version", "")

    from ai.rollback_manager import RollbackManager as RM3
    m3 = RM3()
    m3.request_rollback(reason="Safety check test")
    m3.simulate_rollback(requested_by="SAFETY_TEST")

    prod_after = (reg.get_current_production_model() or {}).get("model_version", "")
    check("Production model unchanged after rollback ops", prod_before == prod_after,
          f"before={prod_before} after={prod_after}")
except Exception as e:
    check("Safety check FAILED", False, str(e))

print("\n" + "="*65)
total = len(results)
passed = sum(1 for _, ok in results if ok)
failed = total - passed
print(f"  RESULTS: {passed}/{total} passed  |  {failed} failed")
print("="*65 + "\n")
if failed > 0:
    print("Failed tests:")
    for label, ok in results:
        if not ok:
            print(f"  X {label}")
    print()

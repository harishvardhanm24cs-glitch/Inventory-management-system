import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.join(__dirname, '..');

export const aiBridgeService = {
  executeAction(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const pythonScript = `
import sys
import json
import os

base_dir = r"${backendDir}"
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from ai.AIService import ai_service

action = r"${action}"
raw_payload = """${JSON.stringify(payload).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"""
data = json.loads(raw_payload) if raw_payload else {}

try:
    if action == "predict":
        res = ai_service.predict(data)
    elif action == "predict_batch":
        res = ai_service.predictBatch(data)
    elif action == "status":
        res = ai_service.getModelStatus()
    elif action == "validate":
        valid = ai_service.validateInput(data)
        res = {"valid": True, "message": "Payload is valid."}
    elif action == "features":
        res = {
            "feature_columns": ai_service.feature_columns,
            "feature_count": len(ai_service.feature_columns),
            "required_fields": ["current_stock", "quantity", "movement_type"],
            "supported_types": ["INWARD", "OUTWARD", "TRANSFER"]
        }
    elif action.startswith("data_collection_"):
        from ai.data_collection import DataCollector
        collector = DataCollector()
        if action == "data_collection_status":
            res = collector.get_status()
        elif action == "data_collection_collect":
            success, msg, payload_out = collector.process_transaction(data)
            res = {"success": success, "message": msg, "payload": payload_out}
        elif action == "data_collection_statistics":
            res = collector.logger.get_statistics()
        elif action == "data_collection_logs":
            res = {"status": "SUCCESS", "logs_file": collector.logger.log_file, "stats": collector.logger.get_statistics()}
        else:
            res = {"error": f"Unknown data collection action {action}"}
    elif action.startswith("dataset_"):
        from ai.dataset_versioning import DatasetRegistry
        registry = DatasetRegistry()
        if action == "dataset_list":
            res = {"status": "SUCCESS", "datasets": registry.list_datasets()}
        elif action == "dataset_current":
            res = {"status": "SUCCESS", "dataset": registry.get_current_dataset()}
        elif action == "dataset_create":
            res = {"status": "SUCCESS", "dataset": registry.create_snapshot(data.get("source_csv"), data.get("version_tag"), data.get("dataset_name"), data.get("description"), data.get("created_by"))}
        elif action == "dataset_verify":
            ok, msg, meta = registry.verify_integrity(data.get("version_tag"))
            res = {"status": "SUCCESS" if ok else "FAIL", "message": msg, "verification": meta}
        elif action == "dataset_archive":
            ok, msg, meta = registry.archive_dataset(data.get("version_tag"))
            res = {"status": "SUCCESS" if ok else "FAIL", "message": msg, "dataset": meta}
        elif action == "dataset_restore":
            ok, msg, meta = registry.restore_dataset(data.get("version_tag"))
            res = {"status": "SUCCESS" if ok else "FAIL", "message": msg, "dataset": meta}
        elif action == "dataset_select":
            ok, msg, meta = registry.select_dataset(data.get("version_tag"))
            res = {"status": "SUCCESS" if ok else "FAIL", "message": msg, "dataset": meta}
        elif action == "dataset_statistics":
            res = {"status": "SUCCESS", "statistics": registry.get_statistics()}
        else:
            res = {"error": f"Unknown dataset action {action}"}
    elif action.startswith("model_reg_"):
        from ai.model_registry import ModelRegistry
        registry = ModelRegistry()
        if action == "model_reg_list":
            res = {"status": "SUCCESS", "models": registry.list_models()}
        elif action == "model_reg_current":
            res = {"status": "SUCCESS", "model": registry.get_current_production_model()}
        elif action == "model_reg_register":
            res = {"status": "SUCCESS", "model": registry.register_model(data)}
        elif action == "model_reg_promote":
            res = {"status": "SUCCESS", "model": registry.promote_model(data.get("model_version"), data.get("actor", "SYSTEM"))}
        elif action == "model_reg_archive":
            res = {"status": "SUCCESS", "model": registry.archive_model(data.get("model_version"), data.get("actor", "SYSTEM"))}
        elif action == "model_reg_status":
            res = {"status": "SUCCESS", "model": registry.update_status(data.get("model_version"), data.get("status"), data.get("actor", "SYSTEM"))}
        elif action == "model_reg_verify":
            ok, msg, meta = registry.verify_artifact(data.get("model_version"))
            res = {"status": "SUCCESS" if ok else "FAIL", "message": msg, "verification": meta}
        elif action == "model_reg_artifacts":
            res = {"status": "SUCCESS", "artifacts": registry.artifact_manager.list_artifacts()}
        elif action == "model_reg_history":
            res = {"status": "SUCCESS", "history": registry.history_manager.get_history()}
        else:
            res = {"error": f"Unknown model registry action {action}"}
    elif action.startswith("model_comp_"):
        from ai.model_comparison import ComparisonEngine
        engine = ComparisonEngine()
        if action == "model_comp_run":
            res = engine.compare_models(data.get("production_model"), data.get("candidate_model"), data.get("weights"))
        elif action == "model_comp_ranking":
            res = {"status": "SUCCESS", "rankings": engine.get_ranking()}
        elif action == "model_comp_recommendation":
            res = {"status": "SUCCESS", "recommendation": engine.get_recommendation(data.get("production_model"), data.get("candidate_model"))}
        elif action == "model_comp_history":
            res = {"status": "SUCCESS", "history": engine.get_history()}
        else:
            res = {"error": f"Unknown model comparison action {action}"}
    elif action.startswith("deployment_"):
        from ai.deployment_decision import DecisionEngine
        engine = DecisionEngine()
        if action == "deployment_evaluate":
            res = engine.evaluate_candidate(data.get("candidate_model"), data.get("production_model"), data.get("reviewer", "SYSTEM"), data.get("policies"))
        elif action == "deployment_decision":
            res = engine.get_latest_decision(data.get("decision_id"))
        elif action == "deployment_history":
            res = {"status": "SUCCESS", "history": engine.get_history(data.get("filter_type"))}
        elif action == "deployment_override":
            res = engine.manual_override(data.get("decision_id"), data.get("override_action"), data.get("reviewer", "MANAGER"), data.get("reason"))
        elif action == "deployment_policies_get":
            res = engine.get_policies()
        elif action == "deployment_policies_save":
            res = engine.save_policies(data.get("policies"))
        else:
            res = {"error": f"Unknown deployment decision action {action}"}
    elif action.startswith("rollback_"):
        from ai.rollback_manager import RollbackManager
        manager = RollbackManager()
        if action == "rollback_eligible":
            res = manager.get_eligible_targets()
        elif action == "rollback_request":
            res = manager.request_rollback(
                data.get("target_version"),
                data.get("reason", ""),
                data.get("requested_by", "SYSTEM")
            )
        elif action == "rollback_simulate":
            res = manager.simulate_rollback(
                data.get("rollback_id"),
                data.get("target_version"),
                data.get("requested_by", "SYSTEM")
            )
        elif action == "rollback_approve":
            res = manager.approve_rollback(
                data.get("rollback_id", ""),
                data.get("reviewer", "MANAGER"),
                data.get("reason", "")
            )
        elif action == "rollback_reject":
            res = manager.reject_rollback(
                data.get("rollback_id", ""),
                data.get("reviewer", "MANAGER"),
                data.get("reason", "")
            )
        elif action == "rollback_override":
            res = manager.manual_override(
                data.get("rollback_id", ""),
                data.get("override_action", "REJECT"),
                data.get("reviewer", "ADMIN"),
                data.get("reason", "")
            )
        elif action == "rollback_history":
            history = manager.get_history(data.get("filter_type"))
            res = {"status": "SUCCESS", "history": history}
        elif action == "rollback_latest":
            res = manager.get_latest_plan()
        else:
            res = {"error": f"Unknown rollback action {action}"}
    else:
        res = {"error": f"Unknown action {action}"}
    print("AI_BRIDGE_START" + json.dumps(res) + "AI_BRIDGE_END")
except Exception as e:
    err_res = {"error": str(e), "status": "FAIL"}
    print("AI_BRIDGE_START" + json.dumps(err_res) + "AI_BRIDGE_END")
`;

      execFile('py', ['-c', pythonScript], { cwd: backendDir, maxBuffer: 10 * 1024 * 1024, timeout: 25000 }, (error, stdout, stderr) => {
        if (error) {
          execFile('python', ['-c', pythonScript], { cwd: backendDir, maxBuffer: 10 * 1024 * 1024, timeout: 25000 }, (err2, stdout2, stderr2) => {
            if (err2) {
              return reject(new Error(stderr2 || err2.message || error.message));
            }
            try {
              const match = stdout2.match(/AI_BRIDGE_START(.*?)AI_BRIDGE_END/s);
              if (match && match[1]) {
                const parsed = JSON.parse(match[1]);
                if (parsed.error && parsed.status === 'FAIL') {
                  return reject(new Error(parsed.error));
                }
                return resolve(parsed);
              }
              reject(new Error(`Invalid bridge response format: ${stdout2}`));
            } catch (e) {
              reject(e);
            }
          });
          return;
        }
        try {
          const match = stdout.match(/AI_BRIDGE_START(.*?)AI_BRIDGE_END/s);
          if (match && match[1]) {
            const parsed = JSON.parse(match[1]);
            if (parsed.error && parsed.status === 'FAIL') {
              return reject(new Error(parsed.error));
            }
            return resolve(parsed);
          }
          reject(new Error(`Invalid bridge response format: ${stdout}`));
        } catch (e) {
          reject(e);
        }
      });
    });
  }
};

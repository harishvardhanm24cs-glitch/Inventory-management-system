# Complete Architecture Report: AI Model Management System (Module 4)

**Version**: `v1.0.0`  
**System Module**: Module 4: Model Management  
**Status**: Production-Ready / Operational  

---

## Executive Summary
The **AI Model Management System** introduces a modular, decoupled architecture enabling RM Monitor to support, register, load, version, and switch between multiple AI model strategies dynamically at runtime. 

It abstracts model implementation details away from business logic, feature generation, and UI components. The system natively supports interfaces for **TensorFlow**, **PyTorch**, **ONNX**, **Scikit-Learn**, and a built-in **Statistical Moving Average Heuristic Strategy**. Crucially, it guarantees **100% operational uptime** by gracefully falling back to the heuristic strategy if no trained model binary exists in storage.

---

## System Architecture Diagram

```
                 ┌──────────────────────────────────────────────┐
                 │          Model Management Console            │
                 │         (src/components/ModelConsole)        │
                 └──────────────────────┬───────────────────────┘
                                        │ REST API (/api/ai/models/*)
                 ┌──────────────────────▼───────────────────────┐
                 │            modelController.js                │
                 └──────────────────────┬───────────────────────┘
                                        │
                 ┌──────────────────────▼───────────────────────┐
                 │             modelManager.js                  │
                 │  - Model Catalog Registry                    │
                 │  - Dynamic Runtime Model Switching           │
                 │  - Performance Benchmark Logging            │
                 │  - Graceful Fallback Engine                  │
                 └──────┬───────────────┬───────────────┬───────┘
                        │               │               │
     ┌──────────────────▼──┐   ┌────────▼─────────┐   ┌─▼─────────────────┐
     │  Framework Adapters │   │Feature Service   │   │Prediction Engine  │
     │- TensorFlow         │   │(Module 3)        │   │(Module 1)         │
     │- PyTorch            │   │- Raw Features    │   │- Serves           │
     │- ONNX               │   │  & Vectors       │   │  Predictions      │
     │- Scikit-Learn       │   └──────────────────┘   └───────────────────┘
     │- Heuristic Fallback │
     └─────────────────────┘
```

---

## Technical Component Architecture

### 1. Model Manager (`backend/services/modelManager.js`)
Central orchestrator managing the model registry, active strategy selection, performance benchmark logging, and fallback logic.

- **Model Registration**: Accepts framework adapter instances or metadata payloads (`id`, `name`, `framework`, `version`, `author`, `description`, `modelPath`) and registers them into an in-memory catalog.
- **Dynamic Runtime Switching**: Switches the active operational model instantly via `switchActiveModel(modelId)` without requiring process restarts.
- **Performance Benchmark Logging**: Logs real-time metrics for each model:
  - `total_predictions_served` (Counter)
  - `average_latency_ms` (Rolling Exponential Mean in milliseconds)
  - `accuracy_score` (Target Accuracy %)
  - `f1_score` (Target F1 Classification Metric)
  - `mae_score` (Mean Absolute Error)
  - `last_prediction_at` (Timestamp)
- **Graceful Fallback Mechanism**: If a requested model is missing, unloaded, or encounters runtime errors, the system seamlessly redirects to `statistical_ml_default` (`DefaultHeuristicModelAdapter`).

---

### 2. Framework Model Adapters (`backend/services/modelAdapters.js`)
All ML model strategies implement the standard `IModelAdapter` base interface contract:

#### Abstract Contract (`IModelAdapter`)
```javascript
export class IModelAdapter {
  async loadModel()
  async predictDemand(materialFeatures)
  async predictDepletion(materialFeatures)
  async predictRackUtilization(rackFeatures)
  async predictWarehouseRisk(warehouseFeatures, materialFeatures, rackFeatures)
  async predictConsumptionTrend(materialFeatures)
}
```

#### Implemented Adapters
1. **`DefaultHeuristicModelAdapter`**: Built-in statistical moving average and multi-factor heuristic risk scoring model. Always available for fallback.
2. **`TensorFlowModelAdapter`**: Keras/TF Deep Neural Network adapter for temporal sequence prediction.
3. **`PyTorchModelAdapter`**: PyTorch Transformer encoder-decoder sequence model adapter.
4. **`ONNXModelAdapter`**: Serialized ONNX runtime graph adapter for low-latency inference.
5. **`ScikitLearnModelAdapter`**: Scikit-Learn Random Forest regressor/classifier adapter.

---

### 3. Strict Separation of Concerns

| Layer | Responsibility | Primary File |
|---|---|---|
| **Model Manager** | Lifecycle, registration, switching, versioning, performance logs | `backend/services/modelManager.js` |
| **Prediction Engine** | Consumes active model from Model Manager to serve predictions | `backend/services/aiPredictionEngine.js` |
| **Feature Service** | Calculates reusable model-independent feature matrices | `backend/services/featureEngineeringService.js` |
| **API Controller** | Exposes HTTP REST endpoints for client applications | `backend/controllers/modelController.js` |
| **UI Console** | React management console for model control & benchmarks | `src/components/ModelManagementConsole.tsx` |

---

## API Interface Specifications

### 1. `GET /api/ai/models`
- **Description**: Returns all registered models, version metadata, and active strategy flag.
- **Response**:
```json
{
  "status": "success",
  "active_model_id": "statistical_ml_default",
  "results": 5,
  "data": [
    {
      "id": "statistical_ml_default",
      "name": "Statistical Moving Average Strategy",
      "framework": "Statistical/Heuristic",
      "version": "v1.0.0",
      "is_active": true
    }
  ]
}
```

### 2. `POST /api/ai/models/register`
- **Description**: Registers a new custom model in the registry.
- **Payload**:
```json
{
  "name": "XGBoost High Throughput Demand Predictor",
  "framework": "Scikit-Learn",
  "version": "v2.1.0",
  "author": "MLOps Team",
  "description": "Gradient boosted decision tree model trained on 90-day transactions."
}
```

### 3. `POST /api/ai/models/switch`
- **Description**: Switches active operational model at runtime.
- **Payload**: `{ "model_id": "tensorflow_deep_demand_v1" }`

### 4. `GET /api/ai/models/performance`
- **Description**: Returns latency, prediction counts, accuracy %, and fallback guarantees.

---

## Verification & Fallback Guarantee Validation

The automated verification suite (`backend/test_model_management.js`) confirms:
1. **Registration**: Successfully registers models across TensorFlow, PyTorch, ONNX, Scikit-Learn, and Heuristic frameworks.
2. **Switching**: Switches active model at runtime and verifies that predictions reference the newly selected strategy.
3. **Graceful Fallback**: Simulates requesting non-existent models (`invalid_model_xyz`) and verifies automatic fallback to `DefaultHeuristicModelAdapter` with zero API failure.
4. **Performance Benchmark Logging**: Verifies execution latency tracking and prediction counters.

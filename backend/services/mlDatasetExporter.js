/**
 * mlDatasetExporter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Export Adapter Engine for ML Frameworks.
 *
 * Formats preprocessed ML feature matrices for future AI model training in:
 * • TensorFlow (Float32 tensor arrays, shapes, batch specifications)
 * • PyTorch (PyTorch tensor dictionaries, dtype torch.float32, shape metadata)
 * • Scikit-Learn (Matrix X, vector y, Pandas-style CSV arrays)
 * • ONNX (ONNX input/output graph tensor schema & serialized inputs)
 */

export const mlDatasetExporter = {
  /**
   * Helper: Flatten inventory feature records into numerical feature vectors
   */
  extractNumericalMatrix(inventoryRecords) {
    const featureNames = [
      'current_stock',
      'threshold_limit',
      'stock_minmax_scaled',
      'stock_zscore_scaled',
      'stock_deficit_ratio',
      'is_depleted',
      'is_below_threshold'
    ];

    const X = (inventoryRecords || []).map(r => [
      r.current_stock || 0.0,
      r.threshold_limit || 0.0,
      r.stock_minmax_scaled || 0.0,
      r.stock_zscore_scaled || 0.0,
      r.stock_deficit_ratio || 0.0,
      r.is_depleted || 0,
      r.is_below_threshold || 0
    ]);

    // Target label y: 1 if below threshold / depleted, else 0
    const y = (inventoryRecords || []).map(r => (r.is_below_threshold || r.is_depleted ? 1 : 0));

    return {
      featureNames,
      X,
      y,
      rowCount: X.length,
      featureCount: featureNames.length
    };
  },

  /**
   * 1. Export Dataset for TensorFlow
   */
  exportTensorFlow(preprocessedData) {
    const inv = preprocessedData?.preprocessed_features?.inventory || [];
    const { featureNames, X, y, rowCount, featureCount } = this.extractNumericalMatrix(inv);

    return {
      framework: 'TensorFlow',
      tf_version_compatibility: '>=2.0.0',
      tensor_format: 'Float32Array',
      shape: [rowCount, featureCount],
      target_shape: [rowCount, 1],
      feature_names: featureNames,
      tensors: {
        x_tensor: X,
        y_tensor: y.map(val => [val])
      },
      tf_dataset_init_code: `
# TensorFlow Dataset Loading Example
import tensorflow as tf
import json

with open('dataset_tf.json') as f:
    data = json.load(f)

X = tf.constant(data['tensors']['x_tensor'], dtype=tf.float32)
y = tf.constant(data['tensors']['y_tensor'], dtype=tf.float32)
dataset = tf.data.Dataset.from_tensor_slices((X, y)).batch(32)
      `.trim()
    };
  },

  /**
   * 2. Export Dataset for PyTorch
   */
  exportPyTorch(preprocessedData) {
    const inv = preprocessedData?.preprocessed_features?.inventory || [];
    const { featureNames, X, y, rowCount, featureCount } = this.extractNumericalMatrix(inv);

    return {
      framework: 'PyTorch',
      pytorch_version_compatibility: '>=1.10.0',
      tensors: {
        features: {
          dtype: 'torch.float32',
          shape: [rowCount, featureCount],
          data: X
        },
        labels: {
          dtype: 'torch.int64',
          shape: [rowCount],
          data: y
        }
      },
      feature_names: featureNames,
      pytorch_dataset_init_code: `
# PyTorch Dataset Loading Example
import torch
from torch.utils.data import TensorDataset, DataLoader
import json

with open('dataset_pytorch.json') as f:
    data = json.load(f)

X = torch.tensor(data['tensors']['features']['data'], dtype=torch.float32)
y = torch.tensor(data['tensors']['labels']['data'], dtype=torch.long)
dataset = TensorDataset(X, y)
loader = DataLoader(dataset, batch_size=32, shuffle=True)
      `.trim()
    };
  },

  /**
   * 3. Export Dataset for Scikit-Learn
   */
  exportScikitLearn(preprocessedData) {
    const inv = preprocessedData?.preprocessed_features?.inventory || [];
    const { featureNames, X, y, rowCount, featureCount } = this.extractNumericalMatrix(inv);

    // Build CSV formatted text
    const csvHeader = ['material_id', ...featureNames, 'target_reorder_flag'].join(',');
    const csvRows = (inv || []).map((r, idx) => {
      const rowX = X[idx] || [];
      return [r.material_id, ...rowX, y[idx]].join(',');
    });
    const csvContent = [csvHeader, ...csvRows].join('\n');

    return {
      framework: 'Scikit-Learn',
      sklearn_version_compatibility: '>=1.0.0',
      feature_names: featureNames,
      matrix_X: X,
      vector_y: y,
      csv_data: csvContent,
      sklearn_init_code: `
# Scikit-Learn Model Training Example
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import json

with open('dataset_sklearn.json') as f:
    data = json.load(f)

X = np.array(data['matrix_X'])
y = np.array(data['vector_y'])
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
clf = RandomForestClassifier().fit(X_train, y_train)
print("Accuracy:", clf.score(X_test, y_test))
      `.trim()
    };
  },

  /**
   * 4. Export Dataset for ONNX
   */
  exportONNX(preprocessedData) {
    const inv = preprocessedData?.preprocessed_features?.inventory || [];
    const { featureNames, X, rowCount, featureCount } = this.extractNumericalMatrix(inv);

    return {
      framework: 'ONNX',
      onnx_ir_version: '7',
      opset_version: '15',
      graph_schema: {
        inputs: [
          {
            name: 'float_input',
            elem_type: 'FLOAT',
            shape: ['batch_size', featureCount]
          }
        ],
        outputs: [
          {
            name: 'probabilities',
            elem_type: 'FLOAT',
            shape: ['batch_size', 2]
          }
        ]
      },
      feature_names: featureNames,
      serialized_tensor_data: X,
      onnx_runtime_init_code: `
# ONNX Runtime Inference Example
import onnxruntime as ort
import numpy as np
import json

with open('dataset_onnx.json') as f:
    data = json.load(f)

X = np.array(data['serialized_tensor_data'], dtype=np.float32)
session = ort.InferenceSession('model.onnx')
inputs = {session.get_inputs()[0].name: X}
outputs = session.run(None, inputs)
      `.trim()
    };
  },

  /**
   * Unified Framework Exporter
   */
  exportForFramework(frameworkName, preprocessedData) {
    const fw = String(frameworkName).toLowerCase();
    if (fw.includes('tf') || fw.includes('tensorflow')) {
      return this.exportTensorFlow(preprocessedData);
    } else if (fw.includes('torch') || fw.includes('pytorch')) {
      return this.exportPyTorch(preprocessedData);
    } else if (fw.includes('sklearn') || fw.includes('scikit')) {
      return this.exportScikitLearn(preprocessedData);
    } else if (fw.includes('onnx')) {
      return this.exportONNX(preprocessedData);
    } else {
      throw new Error(`Unsupported ML framework '${frameworkName}'. Supported: tensorflow, pytorch, scikit-learn, onnx`);
    }
  }
};

export default mlDatasetExporter;

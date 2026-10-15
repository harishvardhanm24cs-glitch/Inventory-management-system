"""
FeatureProcessor.py
Transforms raw operational warehouse records into model-ready ordered feature DataFrames.
"""

import pandas as pd
import numpy as np
from .AIExceptions import FeatureProcessingException

class FeatureProcessor:
    def __init__(self, feature_columns):
        self.feature_columns = feature_columns

    def process(self, data_input):
        """
        Accepts a single dict or list of dicts.
        Returns a pandas DataFrame matching exact self.feature_columns ordering.
        """
        if isinstance(data_input, dict):
            records = [data_input]
        elif isinstance(data_input, list):
            records = data_input
        else:
            raise FeatureProcessingException("Data input must be a dictionary or list of dictionaries.")

        processed_rows = []

        for record in records:
            row = {}
            movement = str(record.get('movement_type', record.get('transaction_type', 'INWARD'))).upper()
            
            row['ohe_mov_INWARD'] = 1 if movement == 'INWARD' else 0
            row['ohe_mov_OUTWARD'] = 1 if movement == 'OUTWARD' else 0
            row['ohe_mov_TRANSFER'] = 1 if movement == 'TRANSFER' else 0
            row['encoded_movement_type'] = 1 if movement == 'OUTWARD' else (2 if movement == 'TRANSFER' else 0)

            for col in self.feature_columns:
                if col in row:
                    continue
                
                val = record.get(col, None)
                if val is None or val == '':
                    row[col] = 0.0
                else:
                    try:
                        row[col] = float(val)
                    except (ValueError, TypeError):
                        row[col] = 0.0

            processed_rows.append(row)

        df = pd.DataFrame(processed_rows)

        for col in self.feature_columns:
            if col not in df.columns:
                df[col] = 0.0

        df_ordered = df[self.feature_columns].copy()
        
        df_ordered = df_ordered.fillna(0.0)
        df_ordered = df_ordered.replace([np.inf, -np.inf], 0.0)

        return df_ordered

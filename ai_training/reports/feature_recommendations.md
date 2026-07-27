# RM Monitor - Feature Quality Audit & Engineering Recommendations

**Audit Timestamp**: `2026-07-26T01:30:37.482623`

---

## 1. Recommended Feature Actions

### Features to Keep
`material_id`, `hour`, `current_stock`, `month`, `weekend_flag`, `threshold`

### Features to Remove / Exclude
`unit`, `weight`, `quantity`, `user_id`, `timestamp`, `rack_capacity`, `current_rack_quantity`, `occupancy_percentage`, `source_location`, `destination_location`, `day_of_week`, `week_number`, `year`, `barcode`, `batch_number`

### Features to Encode
`transaction_type`, `movement_type`, `material_name`, `rack_code`

### Features to Normalize
`current_stock`, `threshold`, `quantity`, `weight`

### Candidate New Engineered Features
`rolling_7d_consumption`, `days_since_last_transaction`, `stock_to_threshold_ratio`
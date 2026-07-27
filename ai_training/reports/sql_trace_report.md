# RM Monitor - SQL Trace & Query Lineage Audit Report

**Audit Timestamp**: `2026-07-26T00:26:16.114574`
**Target Column**: `quantity_used`

---

## SQL Query Analysis
```sql
SELECT 
        t.id AS transaction_id,
        t.material_id,
        m.material_name,
        COALESCE(m.barcode, m.barcode_id, concat('BC-', m.id)) AS barcode,
        COALESCE(m.batch_number, 'N/A') AS batch_number,
        COALESCE(m.unit, 'KG') AS unit,
        COALESCE(m.weight, m.quantity, 0.0) AS weight,
        t.transaction_type,
        t.quantity,
        COALESCE(t.user_id, 'System Operator') AS user_id,
        m.quantity AS current_stock,
        m.threshold_limit AS threshold,
        r.id AS rack_id,
        COALESCE(r.rack_code, 'RACK-01') AS rack_code,
        COALESCE(r.quantity, 0) AS current_rack_quantity,
        COALESCE(r.max_capacity, 1000) AS rack_capacity,
        COALESCE(ri.occupancy_percentage, 0.0) AS occupancy_percentage,
        t.created_at AS timestamp
      FROM transactions t
      LEFT JOIN materials m ON t.material_id = m.id
      LEFT JOIN racks r ON r.material_name = m.material_name
      LEFT JOIN rack_inventory ri ON r.rack_code = ri.rack_code
      ORDER BY t.created_at ASC
```

### Findings
- SQL TRACE FINDING: The SQL query in 'datasetGeneratorService.js' extracts 't.transaction_type' and 't.quantity' from the 'transactions' table, but does NOT select a column named 'quantity_used'. Instead, 'quantity_used' is constructed in Node.js via conditional JS mapping: 'const qtyUsed = isOutward ? parseFloat(t.quantity) || 0.0 : 0.0'. Because all 65 rows returned by the SQL query have t.transaction_type = 'inward', the JavaScript condition evaluates isOutward to FALSE for 100% of rows, setting qtyUsed = 0.0.
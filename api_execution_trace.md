# API Execution Trace Document

This document captures the exact HTTP requests, response payloads, status codes, and execution latencies for all 6 scan attempts.

---

## API Request & Response Trace Table

Endpoint: `POST http://localhost:5000/api/scanner/auto-store`

```json
Request Payload Template:
{
  "barcode_id": "CR002",
  "material_name": "Cherry Red",
  "quantity": 100.00,
  "rack_code": "E3",
  "batch_number": "BATCH-TRACE-9D"
}
```

| Scan # | HTTP Status | Response `status` | Response `message` / `rack_updated` | Execution Latency | Database Action | User Perception |
|---|---|---|---|---|---|---|
| **Scan 1** | `200 OK` | `"used"` | `rack_updated: true` | `86 ms` | `COMMIT` (+100 KG) | **Success** |
| **Scan 2** | `200 OK` | `"duplicate"` | `rack_updated: false` ("Duplicate scan ignored...") | `15 ms` | `ROLLBACK` (+0 KG) | **Perceived Success (HTTP 200)** |
| **Scan 3** | `200 OK` | `"duplicate"` | `rack_updated: false` ("Duplicate scan ignored...") | `12 ms` | `ROLLBACK` (+0 KG) | **Perceived Success (HTTP 200)** |
| **Scan 4** | `200 OK` | `"duplicate"` | `rack_updated: false` ("Duplicate scan ignored...") | `5 ms` | `ROLLBACK` (+0 KG) | **Perceived Success (HTTP 200)** |
| **Scan 5** | `200 OK` | `"used"` | `rack_updated: true` | `30 ms` | `COMMIT` (+100 KG) | **Success** |
| **Scan 6** | `200 OK` | `"duplicate"` | `rack_updated: false` ("Duplicate scan ignored...") | `8 ms` | `ROLLBACK` (+0 KG) | **Perceived Success (HTTP 200)** |

---

## Detailed Response Payloads

### Committed Response Payload (Scans 1 & 5):
```json
{
  "success": true,
  "barcode_id": "CR002",
  "status": "used",
  "rack_updated": true,
  "assigned_rack": "E3",
  "rack": {
    "rack_code": "E3",
    "quantity": 4700.00,
    "max_capacity": 999999999.00
  }
}
```

### Rollbacked Duplicate Response Payload (Scans 2, 3, 4, 6):
```json
{
  "success": true,
  "status": "duplicate",
  "rack_updated": false,
  "message": "Duplicate scan ignored (already registered in the last 5 seconds)"
}
```
> **Key Insight**: The response object sets `"success": true` and HTTP Status `200 OK`, masking the fact that database changes were rollbacked!

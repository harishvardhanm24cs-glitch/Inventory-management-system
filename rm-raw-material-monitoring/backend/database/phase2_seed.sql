-- ============================================================
-- Phase 2: Assign real materials to racks A1, A2, B1, B2
-- ============================================================

-- Clear old rack assignments (only for target racks, preserve others)
UPDATE materials SET rack_code = NULL
WHERE rack_code IN ('A1','A2','B1','B2');

-- ── RACK A1: RECEIVING ZONE ──────────────────────────────────
UPDATE materials SET rack_code = 'A1'
WHERE material_name IN (
  SELECT material_name FROM (
    SELECT material_name FROM materials
    WHERE rack_code IS NULL
    ORDER BY id ASC
    LIMIT 3
  ) AS t1
);

-- ── RACK A2: Existing paint materials (already in rack_materials, now also in materials) ──
-- Assign the PINK, CREAM, Dark Blue paints to A2 in materials table too
UPDATE materials SET rack_code = 'A2'
WHERE material_name IN ('PINK', 'CREAM Paint', 'Dark Blue Paint', 'PINK Paint', 'GOLD', 'SILVER')
AND rack_code IS NULL
LIMIT 3;

-- ── RACK B1: STORAGE ZONE ──────────────────────────────────
UPDATE materials SET rack_code = 'B1'
WHERE rack_code IS NULL
ORDER BY id ASC
LIMIT 4;

-- ── RACK B2: STORAGE ZONE ──────────────────────────────────
UPDATE materials SET rack_code = 'B2'
WHERE rack_code IS NULL
ORDER BY id ASC
LIMIT 4;

-- Verify
SELECT rack_code, COUNT(*) as items, SUM(quantity) as total_qty
FROM materials
WHERE rack_code IN ('A1','A2','B1','B2')
GROUP BY rack_code;

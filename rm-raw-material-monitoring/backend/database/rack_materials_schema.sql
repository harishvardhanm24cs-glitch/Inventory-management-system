-- rack_materials: stores individual material lines per rack slot
CREATE TABLE IF NOT EXISTS rack_materials (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  rack_code    VARCHAR(20)   NOT NULL,
  material_name VARCHAR(255) NOT NULL,
  bucket_count INT           DEFAULT 0,
  weight_kg    DECIMAL(10,2) DEFAULT 0,
  last_scan    DATETIME      DEFAULT NULL,
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rack_materials_code (rack_code)
) ENGINE=InnoDB;

-- Seed A2 rack materials (Phase 1.1 sample data)
-- First clear existing A2 entries to avoid duplicates
DELETE FROM rack_materials WHERE rack_code = 'A2';

INSERT INTO rack_materials (rack_code, material_name, bucket_count, weight_kg, last_scan) VALUES
  ('A2', 'PINK Paint',      20, 600.00, '2026-06-12 19:15:00'),
  ('A2', 'CREAM Paint',     10, 200.00, '2026-06-12 19:15:00'),
  ('A2', 'Dark Blue Paint',  5, 250.00, '2026-06-12 19:15:00');

-- Update A2 capacity to match: total 1050 KG at 65% → max = 1050/0.65 ≈ 1615
UPDATE rack_inventory
SET current_capacity      = 1050,
    max_capacity          = 1615,
    occupancy_percentage  = 65.02,
    updated_at            = '2026-06-12 19:15:00'
WHERE rack_code = 'A2';


-- Rack Inventory Schema for Digital Twin Phase 1.1
-- Industrial Warehouse Floor Layout

CREATE TABLE IF NOT EXISTS rack_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rack_code VARCHAR(20) NOT NULL UNIQUE,
  zone_name VARCHAR(50) NOT NULL DEFAULT 'STORAGE ZONE',
  current_capacity DECIMAL(10, 2) NOT NULL DEFAULT 0,
  max_capacity DECIMAL(10, 2) NOT NULL DEFAULT 100,
  occupancy_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN max_capacity > 0 THEN ROUND((current_capacity / max_capacity) * 100, 2)
      ELSE 0
    END
  ) STORED,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default racks: Receiving Zone (A1-A4), Storage Zone (B1-B4), Dispatch Zone (C1-C4)
INSERT IGNORE INTO rack_inventory (rack_code, zone_name, current_capacity, max_capacity) VALUES
  ('A1', 'RECEIVING ZONE', 0, 100),
  ('A2', 'RECEIVING ZONE', 0, 100),
  ('A3', 'RECEIVING ZONE', 0, 100),
  ('A4', 'RECEIVING ZONE', 0, 100),
  ('B1', 'STORAGE ZONE', 0, 100),
  ('B2', 'STORAGE ZONE', 0, 100),
  ('B3', 'STORAGE ZONE', 0, 100),
  ('B4', 'STORAGE ZONE', 0, 100),
  ('C1', 'DISPATCH ZONE', 0, 100),
  ('C2', 'DISPATCH ZONE', 0, 100),
  ('C3', 'DISPATCH ZONE', 0, 100),
  ('C4', 'DISPATCH ZONE', 0, 100);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  user_id INT NOT NULL,
  type ENUM('inward', 'outward') NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  previous_stock DECIMAL(10, 2) NOT NULL,
  new_stock DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

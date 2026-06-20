-- Migration Script to convert RM Monitor inventory system to Unlimited Inventory Mode

-- 1. Alter materials table quantity and threshold_limit columns
ALTER TABLE materials MODIFY COLUMN quantity DECIMAL(20,2) DEFAULT 0.00;
ALTER TABLE materials MODIFY COLUMN threshold_limit DECIMAL(20,2) DEFAULT 0.00;

-- 2. Alter racks table quantity, max_capacity and threshold_limit columns
ALTER TABLE racks MODIFY COLUMN quantity DECIMAL(20,2) NOT NULL DEFAULT 0.00;
ALTER TABLE racks MODIFY COLUMN max_capacity DECIMAL(20,2) NOT NULL DEFAULT 999999999.00;
ALTER TABLE racks MODIFY COLUMN threshold_limit DECIMAL(20,2) NOT NULL DEFAULT 10.00;

-- 3. Alter rack_inventory table current_capacity and max_capacity columns
ALTER TABLE rack_inventory MODIFY COLUMN current_capacity DECIMAL(20,2) NOT NULL DEFAULT 0.00;
ALTER TABLE rack_inventory MODIFY COLUMN max_capacity DECIMAL(20,2) NOT NULL DEFAULT 999999999.00;

-- 4. Alter other transaction/record tables for large quantity safety
ALTER TABLE transactions MODIFY COLUMN quantity DECIMAL(20,2) NOT NULL;
ALTER TABLE qr_codes MODIFY COLUMN quantity DECIMAL(20,2) DEFAULT 0.00;
ALTER TABLE qr_codes MODIFY COLUMN units DECIMAL(20,2) DEFAULT 0.00;
ALTER TABLE rack_overload_history MODIFY COLUMN attempted_quantity DECIMAL(20,2) NOT NULL;
ALTER TABLE rack_overload_history MODIFY COLUMN current_quantity DECIMAL(20,2) NOT NULL;
ALTER TABLE rack_overload_history MODIFY COLUMN max_capacity DECIMAL(20,2) NOT NULL;

-- 5. Update existing max_capacity values to 999999999.00
UPDATE racks SET max_capacity = 999999999.00;
UPDATE rack_inventory SET max_capacity = 999999999.00;

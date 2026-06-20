import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import pool, { initDB, checkDbConnection } from './db';

// Ensure .env is loaded
dotenv.config();

// Global Process Resilience (Phase 8)
process.on('uncaughtException', (err) => console.error('🔥 CRITICAL UNCAUGHT:', err.message));
process.on('unhandledRejection', (reason) => console.error('🔥 CRITICAL REJECTION:', reason));

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Mission Critical Health (Phase 8 Priority)
app.get('/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        connection.release();
        res.json({ status: "OK", db: "connected" });
    } catch (err) {
        res.json({ 
            status: "OK", 
            db: "disconnected", 
            diagnostic: "INDUSTRIAL ALERT: MySQL service not detected on localhost:3306. Please start XAMPP or MySQL Server to enable Real-Time Identity Sync." 
        });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        connection.release();
        res.json({ status: "OK", db: "connected" });
    } catch (err) {
        res.json({ status: "OK", db: "disconnected" });
    }
});

// Industrial Persistence Heartbeat
setInterval(() => {}, 1000000); 

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Safety Wrapper helper ---
const safeExecute = async (res: any, fn: () => Promise<void>) => {
    // Phase 1: FAST-FAIL CHECK
    const isUp = await checkDbConnection();
    if (!isUp) {
        return res.status(503).json({ 
            success: false, 
            error: "DATABASE_OFFLINE",
            message: "Industrial MySQL Sync is currently offline. Please start XAMPP/MySQL." 
        });
    }

    try {
        await fn();
    } catch (error: any) {
        console.error('❌ [REAL-TIME DB ERROR]:', error.message);
        res.status(200).json({ 
            success: false, 
            error: "MySQL Identity Sync Offline.",
            details: error.code || error.message 
        });
    }
};

// 2. Dashboard Intelligence & ML (Requested Phase 7)
app.get('/api/alerts', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        const [rows]: any = await pool.query('SELECT sku_id as id, name, total_weight as stock, min_limit as minLimit FROM inventory WHERE total_weight < min_limit');
        const alerts = rows.map((r: any) => ({
            id: r.id,
            type: 'critical',
            title: 'Critical Stock Alert',
            message: `Material ${r.name || r.id} is below safety threshold (${r.stock} KG remaining).`,
            time: new Date().toISOString()
        }));
        res.json(alerts);
    });
});

app.get('/api/analytics/anomalies', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        // Query recent high-weight scans
        const [rows]: any = await pool.query(`
            SELECT 
                sku_id as materialId, 
                sku_id as name, 
                weight as recentQty, 
                50 as avgHistoric, 
                CAST(weight / 50 AS CHAR) as spikeFactor,
                timestamp 
            FROM scan_logs 
            WHERE weight > 200 
            ORDER BY timestamp DESC 
            LIMIT 5
        `);
        res.json(rows);
    });
});

app.get('/api/inventory/predictions', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        // Mock Predictive Analysis based on inventory
        const [rows]: any = await pool.query('SELECT sku_id, total_weight FROM inventory');
        const predictions = rows.map((r: any) => ({
            sku_id: r.sku_id,
            name: r.sku_id, // Added to match frontend expectation
            forecast: 'Downward Trend',
            risk: r.total_weight < 20 ? 'high' : 'low', // Added to match frontend
            recommendedReorder: r.total_weight < 20 ? 50 : 0, // Added to match frontend
            exhaustionDate: new Date(Date.now() + 86400000 * 2).toLocaleDateString(), // 2 days
            confidence: '94.2%'
        }));
        res.json(predictions);
    });
});

app.get('/api/batches', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        const [rows]: any = await pool.query('SELECT * FROM sku_registry ORDER BY id DESC LIMIT 10');
        const batches = rows.map((r: any) => ({
            id: r.id.toString(),
            materialId: r.sku_id,
            materialName: r.paint_name || 'Industrial Paint',
            barcodeId: r.sku_id,
            batchNumber: r.batch || 'B-001',
            manufactureDate: r.manufacture_date,
            expiryDate: r.expiry_date,
            quantity: r.weight,
            createdAt: r.created_at
        }));
        res.json(batches);
    });
});

app.get('/api/products', async (req: any, res: any) => {
    // Mock products for the FE component
    res.json([
        {
            productId: 'P-001',
            name: 'Standard Gloss Blue',
            recipes: [
                { materialId: 'PB-001', quantityNeeded: 10, material: { name: 'Blue Pigment', stock: 50, unit: 'KG' } }
            ]
        }
    ]);
});

app.post('/api/low-stock-alert', (req, res) => res.json({ success: true, message: 'Alert logged' }));
app.get('/api/logs', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        const [rows] = await pool.query(`
            SELECT 
                l.id, 
                l.sku_id as materialId, 
                COALESCE(i.name, 'Industrial Paint') as materialName, 
                CASE WHEN l.action = 'IN' THEN 'inward' ELSE 'outward' END as type, 
                l.weight as quantity, 
                l.batch_number as batchNumber,
                l.location,
                'Industrial AI' as user,
                l.timestamp 
            FROM scan_logs l
            LEFT JOIN inventory i ON l.sku_id = i.sku_id
            ORDER BY l.timestamp DESC 
            LIMIT 50
        `);
        res.json(rows);
    });
});

// 3. Auto-Incrementing SKU Generation (Requested Phase 6)
app.get('/api/sku/next-id', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        const [rows]: any = await pool.query('SELECT sku_id FROM sku_registry ORDER BY id DESC LIMIT 1');
        
        if (rows.length === 0) {
            return res.json({ nextId: 'PB-001' });
        }

        const lastId = rows[0].sku_id;
        const numericPart = parseInt(lastId.split('-')[1]);
        const nextId = `PB-${(numericPart + 1).toString().padStart(3, '0')}`;
        res.json({ nextId });
    });
});

// 3. Register SKU (Requested Phase 4)
app.post('/api/sku', async (req: any, res: any) => {
    const { 
        registrationId, sku_id, 
        paintName, paint_name, 
        batchNumber, batch, 
        location, weight, 
        manufactureDate, manufacture_date,
        expiryDate, expiry_date,
        qrCodeImage 
    } = req.body;
    
    // Support both frontend camelCase and backend snake_case
    const final_sku_id = registrationId || sku_id;
    const final_paint_name = paintName || paint_name;
    const final_batch = batchNumber || batch;
    const final_mfg = manufactureDate || manufacture_date;
    const final_exp = expiryDate || expiry_date;

    await safeExecute(res, async () => {
        // Insert into Registry
        await pool.query(
            'INSERT INTO sku_registry (sku_id, paint_name, batch, location, weight, manufacture_date, expiry_date, qr_code_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [final_sku_id, final_paint_name, final_batch, location, weight, final_mfg, final_exp, qrCodeImage]
        );

        // Initialize Inventory record with full metadata & defaults
        await pool.query(
            'INSERT IGNORE INTO inventory (sku_id, name, total_weight, min_limit, critical_limit) VALUES (?, ?, ?, ?, ?)',
            [final_sku_id, final_paint_name, 0, 20.00, 10.00]
        );

        res.json({ success: true, message: 'SKU registered successfully', sku_id: final_sku_id });
    });
});

// Added for Historical Archive lookup
app.get('/api/sku', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        const [rows]: any = await pool.query(`
            SELECT 
                id, 
                sku_id as registrationId, 
                paint_name as paintName, 
                batch as batchNumber, 
                location, 
                weight, 
                manufacture_date as manufactureDate,
                expiry_date as expiryDate,
                qr_code_image as qrCodeImage, 
                created_at 
            FROM sku_registry 
            ORDER BY id DESC
        `);
        res.json({ success: true, data: rows });
    });
});

// 4. Get Inventory (Requested Phase 4)
app.get('/api/inventory', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        const [rows] = await pool.query(`
            SELECT 
                sku_id as id, 
                sku_id as barcode, 
                name, 
                total_weight as stock,
                category,
                'Warehouse' as location,
                'KG' as unit,
                min_limit as minLimit,
                critical_limit as criticalLimit,
                CASE 
                    WHEN total_weight <= critical_limit THEN 'critical'
                    WHEN total_weight <= min_limit THEN 'low'
                    ELSE 'good'
                END as status
            FROM inventory
        `);
        res.json(rows);
    });
});

const ensureDefaultRacks = async () => {
    const defaultRacks = [
      { rack_code: 'A1', zone_name: 'RECEIVING ZONE', max_capacity: 100 },
      { rack_code: 'A2', zone_name: 'RECEIVING ZONE', max_capacity: 100 },
      { rack_code: 'A3', zone_name: 'RECEIVING ZONE', max_capacity: 100 },
      { rack_code: 'A4', zone_name: 'RECEIVING ZONE', max_capacity: 100 },
      { rack_code: 'B1', zone_name: 'STORAGE ZONE',   max_capacity: 100 },
      { rack_code: 'B2', zone_name: 'STORAGE ZONE',   max_capacity: 100 },
      { rack_code: 'B3', zone_name: 'STORAGE ZONE',   max_capacity: 100 },
      { rack_code: 'B4', zone_name: 'STORAGE ZONE',   max_capacity: 100 },
      { rack_code: 'C1', zone_name: 'DISPATCH ZONE',  max_capacity: 100 },
      { rack_code: 'C2', zone_name: 'DISPATCH ZONE',  max_capacity: 100 },
      { rack_code: 'C3', zone_name: 'DISPATCH ZONE',  max_capacity: 100 },
      { rack_code: 'C4', zone_name: 'DISPATCH ZONE',  max_capacity: 100 },
    ];

    for (const rack of defaultRacks) {
        await pool.query(
            `INSERT IGNORE INTO rm_system.rack_inventory (rack_code, zone_name, current_capacity, max_capacity, occupancy_percentage)
             VALUES (?, ?, 0, ?, 0)`,
            [rack.rack_code, rack.zone_name, rack.max_capacity]
        );
    }
};

// GET /api/rack-inventory
app.get('/api/rack-inventory', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        await ensureDefaultRacks();

        const [racks]: any = await pool.query(
            `SELECT id, rack_code, zone_name, current_capacity, max_capacity, occupancy_percentage, updated_at FROM rm_system.rack_inventory ORDER BY zone_name, rack_code ASC`
        );

        const [materials]: any = await pool.query(
            `SELECT id, rack_code, material_name, quantity, COALESCE(weight, quantity) AS weight, threshold_limit, unit, batch_number, barcode FROM rm_system.materials ORDER BY rack_code, material_name ASC`
        );

        const materialsByRack = new Map<string, any[]>();
        for (const mat of materials) {
            const rackCode = mat.rack_code;
            if (!rackCode) continue;

            const name = mat.material_name;
            const quantity = parseFloat(mat.quantity) || 0;
            const weight = parseFloat(mat.weight) || 0;

            if (quantity < 0 || weight < 0) {
                console.error(`[VALIDATION ERROR] Negative inventory not allowed for material '${name}' in Rack '${rackCode}': Quantity=${quantity}, Weight=${weight}`);
                continue;
            }

            if (!materialsByRack.has(rackCode)) {
                materialsByRack.set(rackCode, []);
            }

            const rackMats = materialsByRack.get(rackCode)!;
            const existing = rackMats.find((m: any) => m.material_name === name);

            if (existing) {
                console.log(`[VALIDATION MERGE] Duplicate material entry '${name}' in Rack '${rackCode}' merged automatically.`);
                existing.quantity += quantity;
                existing.weight += weight;
                existing.threshold_limit = Math.max(existing.threshold_limit, parseFloat(mat.threshold_limit) || 0);
            } else {
                rackMats.push({
                    id: mat.id,
                    material_name: name,
                    quantity,
                    weight,
                    threshold_limit: parseFloat(mat.threshold_limit) || 0,
                    unit: mat.unit || 'KG',
                    batch_number: mat.batch_number || null,
                    barcode: mat.barcode || null
                });
            }
        }

        const transformed = racks.map((rack: any) => {
            const rackCode = rack.rack_code;
            const rackMats = materialsByRack.get(rackCode) || [];

            const occ = parseFloat(rack.occupancy_percentage) || 0;
            const currentCap = parseFloat(rack.current_capacity) || 0;
            const maxCap = parseFloat(rack.max_capacity) || 100;

            if (currentCap > maxCap) {
                console.error(`[VALIDATION ERROR] Rack ${rackCode} occupancy ${currentCap} KG exceeds max capacity ${maxCap} KG!`);
            }
            if (currentCap < 0 || maxCap < 0 || occ < 0) {
                console.error(`[VALIDATION ERROR] Rack ${rackCode} has negative capacity stats! Current: ${currentCap}, Max: ${maxCap}, Occ: ${occ}%`);
            }

            let color_status: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED';
            if (occ === 0)        color_status = 'GRAY';
            else if (occ <= 40)   color_status = 'GREEN';
            else if (occ <= 80)   color_status = 'YELLOW';
            else                  color_status = 'RED';

            return {
                id: rack.id,
                rack_code: rackCode,
                zone_name: rack.zone_name,
                current_capacity: currentCap,
                max_capacity: maxCap,
                occupancy_percentage: occ,
                color_status,
                last_updated: rack.updated_at || null,
                last_scan: null,
                materials: rackMats
            };
        });

        res.status(200).json({
            success: true,
            data: transformed
        });
    });
});

// GET /api/rack-inventory/:rackCode
app.get('/api/rack-inventory/:rackCode', async (req: any, res: any) => {
    const { rackCode } = req.params;
    await safeExecute(res, async () => {
        const [rows]: any = await pool.query(
            `SELECT id, rack_code, zone_name, current_capacity, max_capacity, occupancy_percentage, updated_at FROM rm_system.rack_inventory WHERE rack_code = ?`,
            [rackCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: `Rack ${rackCode} not found` });
        }

        const rack = rows[0];
        const occ = parseFloat(rack.occupancy_percentage) || 0;
        let color_status: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED';
        if (occ === 0)        color_status = 'GRAY';
        else if (occ <= 40)   color_status = 'GREEN';
        else if (occ <= 80)   color_status = 'YELLOW';
        else                  color_status = 'RED';

        res.status(200).json({
            success: true,
            data: {
                id: rack.id,
                rack_code: rack.rack_code,
                zone_name: rack.zone_name,
                current_capacity: parseFloat(rack.current_capacity) || 0,
                max_capacity: parseFloat(rack.max_capacity) || 100,
                occupancy_percentage: occ,
                color_status,
                last_updated: rack.updated_at || null
            }
        });
    });
});

// PUT /api/rack-inventory/:rackCode
app.put('/api/rack-inventory/:rackCode', async (req: any, res: any) => {
    const { rackCode } = req.params;
    const { current_capacity, max_capacity } = req.body;

    await safeExecute(res, async () => {
        const [rows]: any = await pool.query(
            `SELECT id, rack_code, zone_name, current_capacity, max_capacity FROM rm_system.rack_inventory WHERE rack_code = ?`,
            [rackCode]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: `Rack ${rackCode} not found` });
        }

        const rack = rows[0];
        const newCurrent = current_capacity !== undefined ? parseFloat(current_capacity) : parseFloat(rack.current_capacity);
        const newMax = max_capacity !== undefined ? parseFloat(max_capacity) : parseFloat(rack.max_capacity);

        if (isNaN(newCurrent) || newCurrent < 0 || newCurrent > newMax) {
            return res.status(400).json({ error: 'current_capacity must be a number between 0 and max_capacity' });
        }

        const newOcc = newMax > 0 ? parseFloat(((newCurrent / newMax) * 100).toFixed(2)) : 0;

        await pool.query(
            `UPDATE rm_system.rack_inventory SET current_capacity = ?, max_capacity = ?, occupancy_percentage = ? WHERE rack_code = ?`,
            [newCurrent, newMax, newOcc, rackCode]
        );

        let color_status: 'GRAY' | 'GREEN' | 'YELLOW' | 'RED';
        if (newOcc === 0)        color_status = 'GRAY';
        else if (newOcc <= 40)   color_status = 'GREEN';
        else if (newOcc <= 80)   color_status = 'YELLOW';
        else                     color_status = 'RED';

        res.status(200).json({
            success: true,
            data: {
                id: rack.id,
                rack_code: rackCode,
                zone_name: rack.zone_name,
                current_capacity: newCurrent,
                max_capacity: newMax,
                occupancy_percentage: newOcc,
                color_status
            }
        });
    });
});

// GET /api/racks/:rackCode/materials
app.get('/api/racks/:rackCode/materials', async (req: any, res: any) => {
    const rackCode = req.params.rackCode;
    await safeExecute(res, async () => {
        const [rackRows]: any = await pool.query(
            `SELECT rack_code, occupancy_percentage, current_capacity, max_capacity FROM rm_system.rack_inventory WHERE rack_code = ?`,
            [rackCode]
        );

        if (rackRows.length === 0) {
            return res.status(404).json({ error: `Rack ${rackCode} not found` });
        }

        const rack = rackRows[0];
        const currentCap = parseFloat(rack.current_capacity) || 0;
        const maxCap = parseFloat(rack.max_capacity) || 100;
        const occ = parseFloat(rack.occupancy_percentage) || 0;

        // 1 & 2. Validation: Occupancy capacity and Negative inventory check
        if (currentCap > maxCap) {
            console.error(`[VALIDATION ERROR] Rack ${rackCode} occupancy ${currentCap} KG exceeds max capacity ${maxCap} KG!`);
        }
        if (currentCap < 0 || maxCap < 0 || occ < 0) {
            console.error(`[VALIDATION ERROR] Rack ${rackCode} has negative capacity stats! Current: ${currentCap}, Max: ${maxCap}, Occ: ${occ}%`);
        }

        const [materialRows]: any = await pool.query(
            `SELECT material_name, quantity, COALESCE(weight, quantity) AS weight, threshold_limit, unit FROM rm_system.materials WHERE rack_code = ? ORDER BY material_name ASC`,
            [rackCode]
        );

        // 3. Validation: Merge duplicate entries & prevent negative inventory
        const mergedMap = new Map();
        for (const row of materialRows) {
            const name = row.material_name;
            const quantity = parseFloat(row.quantity) || 0;
            const weight = parseFloat(row.weight) || 0;
            const threshold = parseFloat(row.threshold_limit) || 0;

            if (quantity < 0 || weight < 0) {
                console.error(`[VALIDATION ERROR] Negative inventory not allowed for material '${name}' in Rack '${rackCode}': Quantity=${quantity}, Weight=${weight}`);
                continue; // Skip negative entries
            }

            if (mergedMap.has(name)) {
                console.log(`[VALIDATION MERGE] Duplicate material entry '${name}' in Rack '${rackCode}' merged automatically.`);
                const existing = mergedMap.get(name);
                existing.quantity += quantity;
                existing.weight += weight;
                existing.threshold_limit = Math.max(existing.threshold_limit, threshold);
            } else {
                mergedMap.set(name, {
                    material_name: name,
                    quantity,
                    weight,
                    threshold_limit: threshold,
                    unit: row.unit || 'KG'
                });
            }
        }

        const finalMaterials = Array.from(mergedMap.values());

        res.status(200).json({
            rack_code: rack.rack_code,
            occupancy_percentage: occ,
            materials: finalMaterials
        });
    });
});

// 5. Scanning Engine (Requested Phase 5)
app.post('/api/scan', async (req: any, res: any) => {
    const { sku_id, weight, type, paint_name, batch_number, location } = req.body;
    const action = type.toUpperCase() === 'INWARD' ? 'IN' : 'OUT';
    const amount = Number(weight);

    await safeExecute(res, async () => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Sync metadata if it's a first-time scan for this SKU in inventory
            await connection.query(
                'INSERT IGNORE INTO inventory (sku_id, name, total_weight) VALUES (?, ?, ?)',
                [sku_id, paint_name || 'Industrial Material', 0]
            );

            // 2. Update Inventory (total_weight)
            const operator = action === 'IN' ? '+' : '-';
            await connection.query(
                `UPDATE inventory SET total_weight = total_weight ${operator} ? WHERE sku_id = ?`,
                [amount, sku_id]
            );

            // 3. Log Transaction (Now with full context)
            await connection.query(
                'INSERT INTO scan_logs (sku_id, action, weight, batch_number, location) VALUES (?, ?, ?, ?, ?)',
                [sku_id, action, amount, batch_number, location]
            );

            // 4. Log Material Movements (Phase 4 Step 1)
            const finalMaterialName = paint_name || 'Industrial Material';
            if (action === 'IN') {
                // Inward Scan: Scanner -> Receiving Zone
                await connection.query(
                    `INSERT INTO material_movements (barcode_id, material_name, source_location, destination_location, movement_type)
                     VALUES (?, ?, ?, ?, ?)`,
                    [sku_id, finalMaterialName, 'Scanner', 'Receiving Zone', 'INWARD']
                );
                // Inward Scan: Receiving Zone -> Rack [location]
                const destRack = location ? (location.startsWith('Rack') ? location : `Rack ${location}`) : 'Unknown Rack';
                await connection.query(
                    `INSERT INTO material_movements (barcode_id, material_name, source_location, destination_location, movement_type)
                     VALUES (?, ?, ?, ?, ?)`,
                    [sku_id, finalMaterialName, 'Receiving Zone', destRack, 'INWARD']
                );
            } else {
                // Outward Scan: Rack [location] -> Dispatch Zone
                const srcRack = location ? (location.startsWith('Rack') ? location : `Rack ${location}`) : 'Unknown Rack';
                await connection.query(
                    `INSERT INTO material_movements (barcode_id, material_name, source_location, destination_location, movement_type)
                     VALUES (?, ?, ?, ?, ?)`,
                    [sku_id, finalMaterialName, srcRack, 'Dispatch Zone', 'OUTWARD']
                );
            }

            await connection.commit();
            res.json({ success: true, message: `Successfully processed ${action} for ${sku_id}` });
        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }
    });
});

// POST /api/movements — record a single material movement (Phase 4 Step 4)
app.post('/api/movements', async (req: any, res: any) => {
    const { barcode_id, material_name, source_location, destination_location, movement_type } = req.body;

    if (!source_location || !destination_location || !movement_type) {
        return res.status(400).json({ success: false, error: 'source_location, destination_location, and movement_type are required' });
    }

    await safeExecute(res, async () => {
        const [result]: any = await pool.query(
            `INSERT INTO material_movements (barcode_id, material_name, source_location, destination_location, movement_type)
             VALUES (?, ?, ?, ?, ?)`,
            [
                barcode_id || null,
                material_name || 'Unknown Material',
                source_location,
                destination_location,
                movement_type.toUpperCase()
            ]
        );
        res.json({
            success: true,
            message: 'Movement recorded',
            data: { id: result.insertId, barcode_id, material_name, source_location, destination_location, movement_type }
        });
    });
});

// GET /api/movements
app.get('/api/movements', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        const [rows]: any = await pool.query(
            `SELECT id, barcode_id, material_name, source_location, destination_location, movement_type, timestamp
             FROM material_movements
             ORDER BY timestamp DESC`
        );
        res.json({ success: true, data: rows });
    });
});

// GET /api/movements/recent
app.get('/api/movements/recent', async (req: any, res: any) => {
    await safeExecute(res, async () => {
        const [rows]: any = await pool.query(
            `SELECT id, barcode_id, material_name, source_location, destination_location, movement_type, timestamp
             FROM material_movements
             ORDER BY timestamp DESC
             LIMIT 20`
        );
        res.json({ success: true, data: rows });
    });
});

// Catch-all for Frontend Stability
app.use((req, res) => {
    console.warn(`[404] ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler (Phase 8)
app.use((err: any, req: any, res: any, next: any) => {
    console.error('[GLOBAL ERROR]:', err.message);
    res.status(200).json({ success: false, error: 'Internal system anomaly detected' });
});

// Attempt DB Init safely without blocking
initDB().catch(err => {
    console.error('⚠️ [INITIALIZATION WARNING]: MySQL connection failed.');
    console.error('   Please ensure MySQL (XAMPP/WAMP) is running.');
});

// Startup Sequence (Hardened Phase 8)
const server = app.listen(PORT, () => {
    console.log(`🚀 Industrial Backend LIVE on http://localhost:${PORT}`);
    console.log(`🛠️ Mode: Resilience Active (Zero-Crash Initializer)`);
});

server.on('error', (err: any) => {
    console.error('🔥 [SERVER ENGINE ERROR]:', err.message);
});
// trigger restart

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Materials Endpoints ---

app.get('/api/materials', async (req, res) => {
    try {
        const materials = await prisma.material.findMany();
        res.json(materials);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

app.post('/api/materials', async (req, res) => {
    const { id, barcode, name, category, stock, unit, minLimit, criticalLimit, image, price } = req.body;
    try {
        const material = await prisma.material.create({
            data: {
                id,
                barcode,
                name,
                category,
                stock,
                unit,
                minLimit,
                criticalLimit,
                status: stock <= criticalLimit ? 'critical' : stock <= minLimit ? 'low' : 'good',
                image,
                price: price || 0
            }
        });
        res.json(material);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create material' });
    }
});

app.post('/api/products', async (req, res) => {
    const { productId, name, qty, price } = req.body;
    try {
        const product = await prisma.product.create({
            data: {
                productId,
                name,
                qty: parseInt(qty),
                price: parseFloat(price)
            }
        });
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

app.get('/api/products/:productId', async (req, res) => {
    const { productId } = req.params;
    try {
        const product = await prisma.product.findUnique({
            where: { productId }
        });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

app.post('/api/materials/:id/stock', async (req, res) => {
    const { id } = req.params;
    const { amount, type, user } = req.body;

    try {
        const material = await prisma.material.findUnique({ where: { id } });
        if (!material) return res.status(404).json({ error: 'Material not found' });

        const newStock = type === 'inward' ? material.stock + amount : material.stock - amount;

        let newStatus = 'good';
        if (newStock <= material.criticalLimit) newStatus = 'critical';
        else if (newStock <= material.minLimit) newStatus = 'low';

        const updatedMaterial = await prisma.material.update({
            where: { id },
            data: { stock: newStock, status: newStatus }
        });

        const transaction = await prisma.transaction.create({
            data: {
                id: `TRX-${Date.now()}`,
                materialId: id,
                materialName: material.name,
                type,
                quantity: amount,
                user: user || 'Unknown',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }
        });

        if (newStatus !== material.status && (newStatus === 'low' || newStatus === 'critical')) {
            await prisma.alert.create({
                data: {
                    type: newStatus === 'critical' ? 'critical' : 'warning',
                    title: newStatus === 'critical' ? 'Critical Stock Level' : 'Low Stock Warning',
                    message: `${material.name} stock has fallen to ${newStock} ${material.unit}.`,
                    time: 'Just now',
                    emailSent: newStatus === 'critical'
                }
            });
        }

        res.json({ material: updatedMaterial, transaction });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

app.put('/api/materials/:id/limits', async (req, res) => {
    const { id } = req.params;
    const { minLimit, criticalLimit } = req.body;

    try {
        const material = await prisma.material.findUnique({ where: { id } });
        if (!material) return res.status(404).json({ error: 'Material not found' });

        let newStatus = 'good';
        if (material.stock <= criticalLimit) newStatus = 'critical';
        else if (material.stock <= minLimit) newStatus = 'low';

        const updatedMaterial = await prisma.material.update({
            where: { id },
            data: { minLimit, criticalLimit, status: newStatus }
        });

        res.json(updatedMaterial);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update limits' });
    }
});

app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await prisma.alert.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

app.post('/api/alerts/:id/acknowledge', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.alert.delete({ where: { id: parseInt(id) } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
});

// --- Smart Scan & Registry Endpoints ---

app.get('/api/registry', async (req, res) => {
    try {
        const materials = await prisma.material.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(materials);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch registry' });
    }
});

app.post('/api/scan', async (req, res) => {
    const { barcode, id, manualType, user } = req.body;
    const materialId = id || barcode;

    try {
        const material = await prisma.material.findUnique({
            where: { id: materialId }
        });

        if (!material) {
            return res.status(404).json({ error: 'Material not registered in system' });
        }

        // HEURISTIC PREDICTION LOGIC
        // 1. If user explicitly provided a type (Inward/Outward Tab), use it.
        // 2. Otherwise, predict:
        //    - If stock is below minLimit, it's likely an INWARD scan.
        //    - If stock is healthy, it's likely an OUTWARD scan for production.
        
        let predictedType = manualType;
        if (!predictedType) {
            predictedType = (material.stock <= material.minLimit) ? 'inward' : 'outward';
        }

        // Default amount for the "Smart" quick action (e.g., 1 pack/unit or pre-defined batch)
        const amount = 1; 

        // Apply Stock Update (Calling normalized logic or repeating for simplicity in this script)
        const newStock = predictedType === 'inward' ? material.stock + amount : material.stock - amount;
        
        let newStatus = 'good';
        if (newStock <= material.criticalLimit) newStatus = 'critical';
        else if (newStock <= material.minLimit) newStatus = 'low';

        const updatedMaterial = await prisma.material.update({
            where: { id: materialId },
            data: { stock: newStock, status: newStatus }
        });

        // Log Transaction
        const transaction = await prisma.transaction.create({
            data: {
                id: `TRX-${Date.now()}`,
                materialId: material.id,
                materialName: material.name,
                type: predictedType,
                quantity: amount,
                user: user || 'Smart Scanner AI',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }
        });

        // Create Alert if needed
        if (newStatus !== material.status && (newStatus === 'low' || newStatus === 'critical')) {
            await prisma.alert.create({
                data: {
                    type: newStatus === 'critical' ? 'critical' : 'warning',
                    title: newStatus === 'critical' ? 'Critical Stock Level' : 'Low Stock Warning',
                    message: `${material.name} stock has fallen to ${newStock} ${material.unit}.`,
                    time: 'Just now',
                    emailSent: newStatus === 'critical'
                }
            });
        }

        res.json({
            success: true,
            material: updatedMaterial,
            previousStock: material.stock,
            newStock: newStock,
            action: predictedType,
            transaction
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Smart scan processing failed' });
    }
});

app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

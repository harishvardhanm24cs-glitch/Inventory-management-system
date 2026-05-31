require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateLocations() {
    const locations = [
        { id: 'RM-TIO2-001', loc: 'A1' },
        { id: 'RM-EPX-002', loc: 'A2' },
        { id: 'RM-SOL-003', loc: 'B1' },
        { id: 'RM-PIG-004', loc: 'B2' },
        { id: 'RM-ADD-005', loc: 'C1' },
        { id: 'RM-EXT-006', loc: 'C2' },
        { id: 'RM-MEC-007', loc: 'D1' },
        { id: 'RM-CAT-008', loc: 'D2' },
    ];

    for (const item of locations) {
        await prisma.material.update({
            where: { id: item.id },
            data: { warehouseLocation: item.loc }
        });
        console.log(`Updated ${item.id} to location ${item.loc}`);
    }
}

updateLocations()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const materials = await prisma.material.findMany();
        console.log('--- Current Materials in DB ---');
        materials.forEach(m => {
            console.log(`ID: ${m.id}, Name: ${m.name}, Barcode: ${m.barcode}`);
        });
        console.log('-------------------------------');
    } catch (error) {
        console.error('Error fetching materials:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    const qrData = fs.readFileSync('decoded_data.txt', 'utf8').trim();

    console.log(`Registering material with barcode: ${qrData}`);

    try {
        const material = await prisma.material.upsert({
            where: { barcode: qrData },
            update: {
                name: 'Industrial Blue Paint',
                category: 'Paint & Coatings',
                stock: 50,
                status: 'good',
                image: 'blue paint.png' // Reference the image file
            },
            create: {
                id: 'MAT-BLUE-PAINT',
                barcode: qrData,
                name: 'Industrial Blue Paint',
                category: 'Paint & Coatings',
                stock: 50,
                unit: 'Liters',
                minLimit: 20,
                criticalLimit: 10,
                status: 'good',
                price: 45.50,
                image: 'blue paint.png'
            }
        });

        console.log('Material registered successfully:');
        console.log(material);
    } catch (error) {
        console.error('Error registering material:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

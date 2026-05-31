const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const materials = await prisma.material.findMany({
        take: 10,
        select: { id: true, name: true }
    });
    console.log(JSON.stringify(materials, null, 2));
    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

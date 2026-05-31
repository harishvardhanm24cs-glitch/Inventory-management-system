const { PrismaClient } = require('@prisma/client')
async function test() {
    console.log('Testing Prisma connection...')
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'file:./dev.db'
            }
        }
    })
    try {
        const res = await prisma.$queryRaw`SELECT 1`
        console.log('Success:', res)
    } catch (e) {
        console.log('Failed with error:')
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}
test()

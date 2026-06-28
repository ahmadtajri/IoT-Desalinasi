const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { comparePassword } = require('./src/utils/password');

async function checkAdmin() {
    try {
        const admin = await prisma.user.findFirst({
            where: { username: 'admin' }
        });

        console.log('Admin found:', admin ? 'YES' : 'NO');
        if (admin) {
            console.log('ID:', admin.id);
            console.log('Username:', admin.username);
            console.log('Hash length:', admin.password.length);

            const match = await comparePassword('admin123', admin.password);
            console.log('Password match check:', match ? 'MATCH' : 'FAIL');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdmin();

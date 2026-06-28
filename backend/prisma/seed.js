// Seed script to create default admin user
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../src/utils/password');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...\n');

    try {
        let admin;
        // Check if admin already exists
        const existingAdmin = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
        });

        if (existingAdmin) {
            // Update existing admin with new credentials from .env
            const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
            const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@iot-desalinasi.local';
            const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

            const hashedPassword = await hashPassword(adminPassword);

            admin = await prisma.user.update({
                where: { id: existingAdmin.id },
                data: {
                    username: adminUsername,
                    email: adminEmail,
                    password: hashedPassword,
                },
            });

            console.log('✅ Admin user updated with new credentials:');
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
        } else {
            // Create default admin
            const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
            const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@iot-desalinasi.local';
            const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

            const hashedPassword = await hashPassword(adminPassword);

            admin = await prisma.user.create({
                data: {
                    username: adminUsername,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'ADMIN',
                    isActive: true,
                },
            });

            console.log('✅ Default admin user created successfully!\n');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('📋 Admin Credentials:');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log(`   Username: ${admin.username}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Password: ${adminPassword}`);
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('\n⚠️  IMPORTANT: Please change the admin password after first login!\n');
        }

        // Create sample global intervals
        console.log('🔧 Creating sample global intervals...\n');

        const sampleIntervals = [
            { seconds: 60, name: '1 Minute' },
            { seconds: 300, name: '5 Minutes' },
            { seconds: 600, name: '10 Minutes' },
        ];

        for (const interval of sampleIntervals) {
            await prisma.loggerInterval.upsert({
                where: { intervalSeconds: interval.seconds },
                update: {
                    intervalName: interval.name
                },
                create: {
                    intervalSeconds: interval.seconds,
                    intervalName: interval.name,
                },
            });
            console.log(`   ✓ Created/Updated interval: ${interval.name} (${interval.seconds}s)`);
        }

        // Set default active interval for admin if not set
        if (!admin.activeIntervalId) {
            const defaultInterval = await prisma.loggerInterval.findFirst({
                where: { intervalSeconds: 60 }
            });

            if (defaultInterval) {
                await prisma.user.update({
                    where: { id: admin.id },
                    data: { activeIntervalId: defaultInterval.id }
                });
                console.log('   ✓ Set admin active interval to 1 Minute');
            }
        }

        console.log('\n✅ Database seed completed.\n');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

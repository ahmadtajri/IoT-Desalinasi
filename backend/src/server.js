const app = require('./app');
const prisma = require('./config/prisma');
const MqttService = require('./services/MqttService');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Test database connection and start server
async function startServer() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🌊 IoT Desalinasi Backend Server v2.0');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📌 Environment: ' + (isProduction ? 'PRODUCTION' : 'DEVELOPMENT'));
  console.log('🔐 Authentication: JWT-based RBAC (Admin/User)');
  console.log('');

  try {
    // Test Prisma database connection
    await prisma.$connect();
    console.log('✅ Database connected (Prisma)');
    console.log('');
    console.log('📊 Database Info:');
    console.log('   - ORM: Prisma');
    console.log('   - Provider: MySQL');
    console.log('   - Database: ' + (process.env.DB_NAME || 'iot_desalinasi'));
    console.log('');

    // Check if admin exists
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const userCount = await prisma.user.count({ where: { role: 'USER' } });

    console.log('👥 Users:');
    console.log('   - Admins: ' + adminCount);
    console.log('   - Users: ' + userCount);

    if (adminCount === 0) {
      console.log('');
      console.log('⚠️  No admin found! Run: npm run prisma:seed');
    }

    // Connect to MQTT Broker
    console.log('');
    try {
      await MqttService.connect();
    } catch (mqttError) {
      console.warn('⚠️  MQTT connection failed:', mqttError.message);
      console.warn('   Server will continue running without MQTT');
    }

    // Setup Daily Log cron job
    try {
      const DailyLogService = require('./services/DailyLogService');
      DailyLogService.setupCronJob();
    } catch (cronError) {
      console.warn('⚠️  Daily log cron setup failed:', cronError.message);
    }

    // Start server
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('🚀 Server is running on http://localhost:' + PORT);
      console.log('📡 API available at http://localhost:' + PORT + '/api');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      console.log('🔑 Authentication Endpoints:');
      console.log('   POST /api/auth/login     - Login');
      console.log('   POST /api/auth/register  - Register (admin only)');
      console.log('   GET  /api/auth/me        - Get current user');
      console.log('');
      console.log('👥 User Management (Admin Only):');
      console.log('   GET    /api/users        - List all users');
      console.log('   POST   /api/users        - Create user');
      console.log('   DELETE /api/users/:id    - Delete user');
      console.log('');
      console.log('⏱️  Interval Management:');
      console.log('   GET  /api/intervals/user/:userId  - Get user intervals');
      console.log('   POST /api/intervals               - Create interval (admin)');
      console.log('');
      console.log('📡 MQTT Topics (ESP32 → Backend):');
      console.log('   iot/desalinasi/temperature   - Temperature data');
      console.log('   iot/desalinasi/humidity      - Humidity data');
      console.log('   iot/desalinasi/waterlevel    - Water level data');
      console.log('   iot/desalinasi/waterweight   - Water weight data');
      console.log('   iot/desalinasi/valve         - Valve status');
      console.log('');
      console.log('💾 DATA MODE: MySQL Database (Prisma ORM)');
      console.log('   ✅ All CRUD operations will be saved to database');
      console.log('');
      console.log('✅ Ready to accept requests!');
      console.log('');
    });

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('❌ FATAL: Database connection failed!');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('');
    console.error('⚠️  Please check:');
    console.error('   1. MySQL server is running');
    console.error('   2. Database "iot_desalinasi" exists');
    console.error('   3. Run: npm run prisma:migrate');
    console.error('   4. Run: npm run prisma:seed');
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('');

    if (isProduction) {
      process.exit(1);
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();

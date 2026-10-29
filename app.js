/**
 * Main Application Entry Point
 * Clean Architecture with Dependency Injection
 * 
 * Architecture Layers:
 * - Domain: Business entities, value objects, repository interfaces
 * - Application: Commands, queries, handlers (CQRS)
 * - Infrastructure: Repositories, database, Unit of Work
 * - Presentation: Controllers, routes, middlewares
 * - Shared: Utilities, exceptions
 */

require('dotenv').config();
const express = require('express');
const app = express();

// Infrastructure
const diContainer = require('./src/infrastructure/di-container');
const prisma = require('./src/infrastructure/database/prisma.client');

// Middlewares
const errorHandler = require('./src/presentation/middlewares/errorHandler');

// Routes
const pelangganRoutes = require('./src/presentation/routes/pelanggan.routes');

// ==================== Configuration ====================
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// ==================== Global Middleware ====================
// Inject active menu and stats into views
app.use(async (req, res, next) => {
  try {
    const pesananRepo = diContainer.resolve('pesananRepository');
    const aktif = await pesananRepo.countActive();
    res.locals.aktif = aktif;
  } catch (error) {
    console.error('Error fetching active orders:', error);
    res.locals.aktif = 0;
  }
  res.locals.active = req.path.split('/')[1] || 'dashboard';
  next();
});

// ==================== Routes with Dependency Injection ====================
// Resolve controllers from DI container
const pelangganController = diContainer.resolve('pelangganController');

// Register routes
app.use('/pelanggan', pelangganRoutes(pelangganController));

// Dashboard route (temporary until migrated)
app.get('/', async (req, res) => {
  try {
    const pelangganRepo = diContainer.resolve('pelangganRepository');
    const produkRepo = diContainer.resolve('produkRepository');
    const pesananRepo = diContainer.resolve('pesananRepository');

    const [
      totalPelanggan,
      totalPesanan,
      pesananAktif,
      pesananSelesai,
      produkStokRendah,
      totalOmzet
    ] = await Promise.all([
      pelangganRepo.count(),
      pesananRepo.count(),
      pesananRepo.countActive(),
      pesananRepo.countCompleted(),
      produkRepo.countLowStock(),
      pesananRepo.getTotalRevenue()
    ]);

    res.render('dashboard', {
      stats: {
        totalPelanggan,
        totalPesanan,
        pesananAktif,
        pesananSelesai,
        produkStokRendah,
        totalOmzet
      },
      recentPesanan: [],
      produkRendah: []
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      architecture: 'Clean Architecture with CQRS, Unit of Work, and DDD'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Laundry App API',
    version: '2.0.0',
    architecture: {
      pattern: 'Clean Architecture',
      layers: ['Domain', 'Application', 'Infrastructure', 'Presentation'],
      features: ['CQRS', 'Unit of Work', 'Repository Pattern', 'DDD', 'SOLID']
    },
    endpoints: {
      pelanggan: {
        web: [
          'GET /pelanggan - List all customers',
          'GET /pelanggan/tambah - Create form',
          'POST /pelanggan - Create customer',
          'GET /pelanggan/:id/edit - Edit form',
          'POST /pelanggan/:id - Update customer',
          'POST /pelanggan/:id/delete - Delete customer'
        ],
        api: [
          'GET /pelanggan/api - List all (JSON)',
          'POST /pelanggan/api - Create (JSON)'
        ]
      }
    }
  });
});

// ==================== Error Handling ====================
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// ==================== Server Startup ====================
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Check database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Start server
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 ===============================================');
      console.log('🚀 Laundry App - Clean Architecture');
      console.log('🚀 ===============================================');
      console.log(`🚀 Server running on: http://localhost:${PORT}`);
      console.log(`🚀 Health check: http://localhost:${PORT}/health`);
      console.log(`🚀 API docs: http://localhost:${PORT}/api/docs`);
      console.log('🚀 ===============================================');
      console.log('');
      console.log('📋 Architecture:');
      console.log('   ✓ Clean Architecture (Domain, Application, Infrastructure, Presentation)');
      console.log('   ✓ CQRS (Command Query Responsibility Segregation)');
      console.log('   ✓ Unit of Work Pattern (Transaction Management)');
      console.log('   ✓ Repository Pattern (Data Access Abstraction)');
      console.log('   ✓ Domain-Driven Design (Entities, Value Objects)');
      console.log('   ✓ SOLID Principles');
      console.log('   ✓ Dependency Injection');
      console.log('   ✓ ORM (Prisma)');
      console.log('   ✓ ACID Transactions');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

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
    // Fetch all dashboard data in parallel
    const [
      terlaris,
      terbaru,
      bayar,
      stok,
      omzetBulanan
    ] = await Promise.all([
      // Layanan terlaris dengan detail lengkap
      prisma.$queryRaw`
        SELECT l.nama_layanan,
               l.estimasi_hari,
               k.nama_kategori,
               COUNT(*) AS jml,
               SUM(dl.jumlah) AS total_kg,
               SUM(dl.subtotal) AS omzet
        FROM detail_layanan dl
        INNER JOIN layanan l ON l.id_layanan = dl.id_layanan
        INNER JOIN kategori k ON l.id_kategori = k.id_kategori
        GROUP BY l.id_layanan, l.nama_layanan, l.estimasi_hari, k.nama_kategori
        ORDER BY omzet DESC
        LIMIT 5
      `,
      
      // Pesanan terbaru - query langsung
      prisma.$queryRaw`
        SELECT p.id_pesanan, pl.nama, p.status_cucian, p.tgl_masuk, p.total
        FROM pesanan p
        JOIN pelanggan pl ON p.id_pelanggan = pl.id_pelanggan
        ORDER BY p.tgl_masuk DESC
        LIMIT 5
      `,
      
      // Pesanan belum lunas dengan total dan dibayar
      prisma.$queryRaw`
        SELECT p.id_pesanan, 
               pl.nama, 
               p.total,
               IFNULL(SUM(pb.jumlah), 0) as dibayar
        FROM pesanan p
        JOIN pelanggan pl ON p.id_pelanggan = pl.id_pelanggan
        LEFT JOIN pembayaran pb ON p.id_pesanan = pb.id_pesanan
        GROUP BY p.id_pesanan, pl.nama, p.total
        HAVING dibayar < p.total
        ORDER BY p.tgl_masuk DESC
        LIMIT 5
      `,
      
      // Stok menipis
      prisma.$queryRaw`
        SELECT p.nama_produk, k.nama_kategori, p.stok
        FROM produk p
        JOIN kategori k ON p.id_kategori = k.id_kategori
        WHERE p.stok < 5
        ORDER BY p.stok
        LIMIT 10
      `,
      
      // Omzet bulanan 6 bulan terakhir
      prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(p.tgl_masuk, '%Y-%m') as bulan,
          SUM(p.total) as omzet
        FROM pesanan p
        WHERE p.tgl_masuk >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(p.tgl_masuk, '%Y-%m')
        ORDER BY bulan DESC
        LIMIT 6
      `
    ]);

    // Omzet per kategori layanan (untuk series kedua di chart)
    const omzetProduk = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(p.tgl_masuk, '%Y-%m') as bulan,
        SUM(IFNULL(dp.subtotal, 0)) as omzet
      FROM pesanan p
      LEFT JOIN detail_produk dp ON p.id_pesanan = dp.id_pesanan
      WHERE p.tgl_masuk >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(p.tgl_masuk, '%Y-%m')
      ORDER BY bulan DESC
      LIMIT 6
    `;

    // Format data for chart series
    const series = [
      {
        key: 'layanan',
        label: 'Layanan',
        data: omzetBulanan.reverse().map(row => ({
          bulan: row.bulan.substring(5), // 2026-10 -> 10
          nilai: Number(row.omzet || 0)
        }))
      },
      {
        key: 'produk',
        label: 'Produk',
        data: omzetProduk.reverse().map(row => ({
          bulan: row.bulan.substring(5),
          nilai: Number(row.omzet || 0)
        }))
      }
    ];

    res.render('dashboard', {
      terlaris,
      terbaru,
      bayar,
      stok,
      series
    });
  } catch (error) {
    console.error('Error loading dashboard:', error);
    console.error('Stack:', error.stack);
    res.status(500).send('Error loading dashboard: ' + error.message);
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

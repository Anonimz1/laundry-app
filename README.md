# 🧺 Laundry App - Sistem Manajemen Laundry Online

Aplikasi web untuk manajemen laundry online dengan fitur penjualan produk, menggunakan Node.js, Express, MySQL, dan Prisma ORM.

## 📋 Fitur Utama

### 🏠 Dashboard
- Statistik real-time (total pelanggan, pesanan, omzet)
- Grafik pesanan aktif vs selesai
- Alert produk stok menipis
- Daftar pesanan terbaru

### 👥 Manajemen Pelanggan
- CRUD pelanggan (Create, Read, Update, Delete)
- Pencarian pelanggan
- Riwayat pesanan per pelanggan

### 📦 Manajemen Produk
- CRUD produk laundry (deterjen, pewangi, dll)
- Manajemen stok
- Kategorisasi produk
- Alert stok menipis

### 🧼 Layanan Laundry
- Cuci kiloan (kg)
- Cuci satuan (pcs)
- Berbagai jenis layanan (reguler, express, dry clean)
- Harga dan estimasi waktu

### 📋 Pesanan
- Buat pesanan baru dengan multiple layanan dan produk
- Track status cucian (diterima → dicuci → disetrika → siap → selesai)
- Kalkulasi otomatis total pembayaran
- Riwayat pesanan lengkap

### 💰 Pembayaran
- Multiple metode (tunai, QRIS, transfer)
- Pembayaran penuh atau cicilan
- Tracking pembayaran belum lunas

### 🚚 Pengiriman
- Jasa antar-jemput
- Biaya pengiriman
- Status pengiriman (dijadwalkan → dalam perjalanan → selesai)

### 📊 Laporan
- Laporan omzet harian/bulanan
- Laporan per layanan dan produk
- Export ke PDF/Excel
- Statistik penjualan

## 🛠️ Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** MySQL 8.0+
- **ORM:** Prisma (alternative: mysql2)
- **Template Engine:** EJS
- **Styling:** Custom CSS
- **Version Control:** Git + GitHub

## 📦 Installation

### Prerequisites
- Node.js v16+ 
- MySQL 8.0+
- npm or yarn

### Step 1: Clone Repository
```bash
git clone https://github.com/Anonimz1/laundry-app.git
cd laundry-app
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Setup Database
1. Create database:
```sql
CREATE DATABASE laundry_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Import database schema:
```bash
mysql -u root -p laundry_db < ../project_database.sql
```

### Step 4: Configure Environment
Copy `.env.example` to `.env` dan sesuaikan:
```env
# Database (mysql2)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=laundry_db

# Prisma Database URL
DATABASE_URL="mysql://root:your_password@localhost:3306/laundry_db"

# Server
PORT=3000
```

### Step 5: Setup Prisma (Optional)
```bash
npx prisma generate
```

### Step 6: Test Connection
```bash
# Test mysql2 connection
npm run test:db

# Test Prisma connection
npm run test:prisma
```

### Step 7: Run Application
```bash
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

## 📁 Project Structure

```
laundry-app/
├── routes/              # Route handlers
│   ├── pelanggan.js    # Customer routes
│   ├── produk.js       # Product routes
│   ├── layanan.js      # Service routes
│   ├── pesanan.js      # Order routes
│   ├── pembayaran.js   # Payment routes
│   ├── laporan.js      # Report routes
│   ├── dashboard.js    # Dashboard routes
│   ├── *-prisma.js     # Prisma version routes
├── views/              # EJS templates
│   ├── partials/       # Reusable components
│   ├── pelanggan/      # Customer views
│   ├── produk/         # Product views
│   ├── pesanan/        # Order views
│   └── ...
├── public/             # Static files
│   └── style.css       # CSS styles
├── prisma/             # Prisma ORM
│   ├── schema.prisma   # Database schema
│   └── client.js       # Prisma client instance
├── app.js              # Main application
├── db.js               # MySQL2 connection
├── test-db.js          # Test database connection
├── test-prisma.js      # Test Prisma connection
├── package.json        # Dependencies
├── .env                # Environment variables (gitignored)
└── .env.example        # Environment template
```

## 📖 Documentation

- **[PRISMA_SETUP.md](./PRISMA_SETUP.md)** - Setup dan penggunaan Prisma ORM
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Panduan migrasi dari mysql2 ke Prisma
- **[PRISMA_INTEGRATION_SUMMARY.md](./PRISMA_INTEGRATION_SUMMARY.md)** - Summary integrasi Prisma

## 🎯 NPM Scripts

```bash
# Start application
npm start

# Generate Prisma Client
npm run prisma:generate

# Open Prisma Studio (Database GUI)
npm run prisma:studio

# Pull database schema to Prisma
npm run prisma:pull

# Test mysql2 connection
npm run test:db

# Test Prisma connection
npm run test:prisma
```

## 🗄️ Database Schema

### Tables
1. **pelanggan** - Customer data
2. **kategori** - Categories (for services & products)
3. **layanan** - Laundry services
4. **produk** - Products for sale
5. **pesanan** - Orders
6. **detail_layanan** - Order-Service relationship (M:N)
7. **detail_produk** - Order-Product relationship (M:N)
8. **pembayaran** - Payments
9. **pengiriman** - Delivery/pickup

### Features
- ✅ Foreign key constraints
- ✅ Triggers (auto-calculate subtotal & total)
- ✅ Stored procedures (business logic)
- ✅ Functions (calculations)
- ✅ Views (reports)
- ✅ Indexes for performance

## 🔧 API Endpoints

### Pelanggan
- `GET /pelanggan` - List customers
- `GET /pelanggan/tambah` - Add customer form
- `POST /pelanggan` - Create customer
- `GET /pelanggan/:id/edit` - Edit customer form
- `POST /pelanggan/:id` - Update customer
- `POST /pelanggan/:id/delete` - Delete customer

### Produk
- `GET /produk` - List products
- `GET /produk/tambah` - Add product form
- `POST /produk` - Create product
- `GET /produk/:id/edit` - Edit product form
- `POST /produk/:id` - Update product
- `POST /produk/:id/delete` - Delete product

### Pesanan
- `GET /pesanan` - List orders
- `GET /pesanan/buat` - Create order form
- `POST /pesanan` - Create order
- `GET /pesanan/:id` - Order detail
- `POST /pesanan/:id/status` - Update order status

### Pembayaran
- `GET /pembayaran` - List payments
- `POST /pembayaran` - Record payment

### Laporan
- `GET /laporan` - Reports dashboard
- `GET /laporan/omzet` - Revenue report
- `GET /laporan/export` - Export reports

## 🚀 Deployment

### Production Checklist
- [ ] Update `.env` dengan production credentials
- [ ] Set `NODE_ENV=production`
- [ ] Disable debug logging
- [ ] Setup SSL/HTTPS
- [ ] Configure firewall
- [ ] Setup backup database
- [ ] Monitor error logs

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start app.js --name laundry-app
pm2 startup
pm2 save
```

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is for educational purposes.

## 👨‍💻 Author

**Kennn** ([@Anonimz1](https://github.com/Anonimz1))

## 🙏 Acknowledgments

- Node.js Community
- Prisma Team
- MySQL Documentation
- Express.js Framework

## 📞 Support

Jika ada pertanyaan atau issue:
- 🐛 [Open an issue](https://github.com/Anonimz1/laundry-app/issues)
- 📧 Email: anonimys185@gmail.com

---

**Built with ❤️ for Database Project**

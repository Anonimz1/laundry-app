# 🧺 Clean Up Laundry - Sistem Manajemen Laundry

Aplikasi manajemen laundry online berbasis Node.js + Express + MySQL dengan implementasi lengkap **stored procedures, functions, triggers, dan views** untuk project basis data terintegrasi.

## 🎯 Features

### Database Features (SQL)
- ✅ **10 Tables** dengan proper normalization (BCNF)
- ✅ **5 SQL Functions** (sisa_tagihan, hitung_total_pesanan, omzet_periode, pengeluaran_periode, laba_periode)
- ✅ **11 SQL Procedures** (buat_pesanan, tambah_layanan, catat_pembayaran, dll)
- ✅ **20+ Triggers** (auto-calculate subtotal, stock management, status validation)
- ✅ **8 Views** (v_nota, v_laba_bulanan, v_stok_menipis, dll)
- ✅ **17 Analytic Queries** (A1-A17) answering 11 business requirements
- ✅ **ACID Transactions** with proper isolation
- ✅ **Generated Columns** (subtotal auto-calculated)
- ✅ **Role-Based Security** (kasir, laporan, pemilik)

### Application Features
- 🔐 Transaction-safe payment processing
- 📊 Comprehensive reporting (revenue, profit, inventory)
- 🚨 Automatic alerts (low stock, late orders, unpaid invoices)
- 📈 Business analytics (top services, best customers, trends)
- 🔒 SQL injection prevention
- 🎨 Clean, responsive UI with EJS templates

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm atau yarn

### Installation

**1. Clone & Install Dependencies**
```bash
npm install
```

**2. Setup Fresh Database (One Command)**
```bash
# Windows - Double-click atau run:
setup-fresh-db.bat
```

This automatically:
- Creates `laundry_db` database
- Creates all tables, functions, procedures, triggers, views
- Inserts sample data
- Creates MySQL users and roles
- Generates Prisma client

**3. Configure Environment**
```bash
# Copy .env.example to .env
copy .env.example .env

# Edit .env and set your MySQL password
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/laundry_db"
```

**4. Start Application**
```bash
npm run dev
```

Application runs at: **http://localhost:3000**

### Verification

Check if setup is complete:
```bash
mysql -u root -p < scripts\verify-setup.sql
```

Expected output:
- ✓ Tables: 10
- ✓ Functions: 5
- ✓ Procedures: 11
- ✓ Triggers: 20+
- ✓ Views: 8
- ✓ Sample Data: Loaded

## 📖 Documentation

### Essential Guides
- 📘 **[QUICK_START.md](QUICK_START.md)** - Setup walkthrough with troubleshooting
- 📗 **[INTEGRATION_ROADMAP.md](INTEGRATION_ROADMAP.md)** - Implementation phases & plan
- 📙 **[DATABASE_ENHANCEMENT_ANALYSIS.md](DATABASE_ENHANCEMENT_ANALYSIS.md)** - Database design principles

### Advanced Topics
- 📕 **[DATABASE_ENHANCEMENT_PART2.md](DATABASE_ENHANCEMENT_PART2.md)** - ORM patterns, CQRS, DAL
- 📔 **[DATABASE_ENHANCEMENT_PART3.md](DATABASE_ENHANCEMENT_PART3.md)** - ACID, security, Unit of Work

### SQL Scripts
- `extracted_steps/project_database.sql` - Complete database setup (tables + functions + procedures + triggers + views)
- `extracted_steps/stage5_query_sql.sql` - All 17 analytic queries (A1-A17)

## 🗄️ Database Schema

```
┌─────────────┐     ┌──────────┐     ┌─────────┐
│ PELANGGAN   │────<│ PESANAN  │>────│ LAYANAN │
└─────────────┘     └──────────┘     └─────────┘
                         │             ┌─────────┐
                         ├────────────<│ PRODUK  │
                         │             └─────────┘
      ┌──────────────┐   │   ┌────────────┐
      │ PEMBAYARAN   │<──┤   │ PENGIRIMAN │
      └──────────────┘   │   └────────────┘
                         │   ┌──────────────┐
                         └──<│ PENGELUARAN  │
                             └──────────────┘
                   ┌──────────┐
                   │ KATEGORI │ (Shared by Layanan, Produk, Pengeluaran)
                   └──────────┘
```

**10 Tables:**
1. `pelanggan` - Customers
2. `kategori` - Categories (LAYANAN, PRODUK, PENGELUARAN)
3. `layanan` - Services (Reguler, Express, Setrika Saja)
4. `produk` - Products (Deterjen, Pewangi, Pelembut)
5. `pesanan` - Orders (nota)
6. `detail_layanan` - Order-Service junction (weak entity)
7. `detail_produk` - Order-Product junction (weak entity)
8. `pembayaran` - Payments (1:N, partial payments supported)
9. `pengiriman` - Deliveries (jemput/antar, max 2 per order)
10. `pengeluaran` - Operating expenses

## 🧪 Testing

### Test SQL Functions
```sql
USE laundry_db;

-- Remaining payment
SELECT sisa_tagihan(103);                    -- Returns: 70000

-- Calculate order total
SELECT hitung_total_pesanan(101);            -- Returns: 52000

-- Period profit
SELECT laba_periode('2026-10-01', '2026-10-31');  -- Returns: monthly profit
```

### Test SQL Procedures
```sql
-- Search customer (SQL injection safe)
CALL cari_pelanggan('Made');

-- Create order workflow
CALL buat_pesanan(1, @new_id);
CALL tambah_layanan(@new_id, 1, 5);
CALL tambah_produk(@new_id, 1, 2);
CALL catat_pembayaran(@new_id, 50000, 'tunai');

-- Revenue report
CALL laporan_omzet('2026-10-01', '2026-10-31');
```

### Test Views
```sql
-- Unpaid orders
SELECT * FROM v_pesanan_belum_lunas;

-- Low stock alert
SELECT * FROM v_stok_menipis;

-- Monthly profit
SELECT * FROM v_laba_bulanan;
```

### Test Triggers (Auto-calculation)
```sql
START TRANSACTION;

-- Insert detail (subtotal & total auto-calculated)
INSERT INTO detail_layanan (id_pesanan, id_layanan, jumlah, harga_satuan)
VALUES (101, 1, 2, 8000);

-- Check: subtotal = 2 * 8000 = 16000
SELECT subtotal FROM detail_layanan 
WHERE id_pesanan = 101 AND id_layanan = 1;

-- Check: pesanan.total auto-updated
SELECT total FROM pesanan WHERE id_pesanan = 101;

ROLLBACK;  -- Undo test
```

## 📊 17 Analytic Queries (A1-A17)

Setiap query menjawab kebutuhan informasi bisnis spesifik:

| Query | Description | Business Need |
|-------|-------------|---------------|
| **A1** | Top 5 services by revenue | #8: Info layanan terlaris |
| **A2** | Top 5 products by sales | #5: Stock/sales monitoring |
| **A3** | Stock positions + low stock alert | #5, #6: Stock tracking |
| **A4** | Unpaid orders + remaining | #4: Partial payments |
| **A5** | Late orders (exceeds estimate) | #3, #7: Delivery warnings |
| **A6** | Monthly revenue recap | #1, #6: Auto-calculation |
| **A7** | Monthly profit (revenue - expenses) | #11: Profit analysis |
| **A8** | Top customers (spending > 100k) | #3: Customer insights |
| **A9** | Expenses by category | Expense tracking |
| **A10** | Payment method composition | Payment analysis |
| **A11** | Orders in progress | #2, #9: Status monitoring |
| **A12** | Delivery customers | Route planning |
| **A13** | Payment methods used | Config insights |
| **A14** | Service vs Product revenue | #2: Revenue breakdown |
| **A15** | Avg weight per customer | #8: Customer patterns |
| **A16** | Monthly expenses by category | #10: Expense analysis |
| **A17** | Order status by phone | #9: Customer inquiry |

**Access via:**
```javascript
const analyticsService = new AnalyticQueryService(prisma);
const results = await analyticsService.A1_layananTerlaris(5);
```

## 🔐 Security Features

### SQL Injection Prevention
- ✅ All user inputs parameterized via Prisma `$queryRaw`
- ✅ `cari_pelanggan` procedure uses safe CONCAT
- ✅ No string concatenation in dynamic queries
- ✅ Input validation at application level

### ACID Compliance
**Example: `catat_pembayaran` procedure**
```sql
START TRANSACTION;
  -- Row-level locking
  SELECT total FROM pesanan WHERE id_pesanan = ? FOR UPDATE;
  
  -- Validation
  IF amount > remaining THEN SIGNAL ERROR;
  
  -- Insert payment
  INSERT INTO pembayaran ...;
  
COMMIT;  -- All or nothing
```

### Role-Based Access
- **Kasir** (`app_kasir`): Create orders, record payments, view inventory
- **Laporan** (`app_laporan`): View reports only, masked sensitive data
- **Pemilik** (`app_pemilik`): Full access + expense management

Change default passwords:
```sql
ALTER USER 'app_kasir'@'localhost' IDENTIFIED BY 'new_secure_password';
```

## 📂 Project Structure

```
laundry-app/
├── src/
│   ├── application/          # CQRS Commands & Queries
│   │   ├── commands/
│   │   ├── handlers/
│   │   └── queries/
│   ├── domain/              # Domain entities & repositories
│   │   ├── entities/
│   │   ├── repositories/
│   │   └── value-objects/
│   ├── infrastructure/      # Database & external services
│   │   ├── database/
│   │   ├── repositories/
│   │   ├── services/
│   │   │   ├── SqlProcedureService.js    # Wraps stored procedures
│   │   │   └── AnalyticQueryService.js   # 17 analytic queries
│   │   └── unit-of-work/
│   ├── presentation/        # Controllers, routes, views
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── middlewares/
│   └── shared/             # Utilities & exceptions
├── prisma/
│   └── schema.prisma       # Database schema (aligned with SQL)
├── views/                  # EJS templates
├── scripts/                # Setup & utility scripts
├── extracted_steps/
│   ├── project_database.sql      # Complete DB setup
│   └── stage5_query_sql.sql      # 17 analytic queries
├── setup-fresh-db.bat     # One-command setup
└── QUICK_START.md         # Detailed guide
```

## 🔧 Technologies

- **Backend:** Node.js 18+, Express.js
- **Database:** MySQL 8.0+
- **ORM:** Prisma 5.x
- **Template Engine:** EJS
- **CSS:** Custom responsive styles
- **Architecture:** Clean Architecture + CQRS + Repository Pattern

## 👥 Contributors

**Project Team:**
- Dewa Komang Andrew Kenny Raditya (2515101062)
- Romeo
- EL

**Course:** Proyek Basis Data Terintegrasi - Integrated Database Project

## 🎓 Academic Achievements

This project demonstrates:

### Database Design
- ✅ **Normalization to BCNF** with proof
- ✅ **Weak entities** (detail_layanan, detail_produk)
- ✅ **Generated columns** (subtotal auto-calculated)
- ✅ **Composite keys** and proper indexing
- ✅ **Referential integrity** with CASCADE/RESTRICT

### SQL Advanced Features
- ✅ **Stored Functions** (5) for reusable calculations
- ✅ **Stored Procedures** (11) for complex transactions
- ✅ **Triggers** (20+) for business rule enforcement
- ✅ **Views** (8) for simplified reporting
- ✅ **ACID Transactions** with row-level locking

### Application Patterns
- ✅ **Repository Pattern** (Data Access Layer)
- ✅ **CQRS** (Command Query Responsibility Segregation)
- ✅ **Unit of Work** for transaction management
- ✅ **Clean Architecture** with layered design

### Security
- ✅ **SQL Injection Prevention** via parameterized queries
- ✅ **Role-Based Access Control** (3 roles)
- ✅ **Prepared Statements** in procedures
- ✅ **Input Validation** at multiple layers

## 🆘 Troubleshooting

### Common Issues

**1. MySQL not found**
```powershell
# Add MySQL to PATH
$env:Path += ";C:\Program Files\MySQL\MySQL Server 8.0\bin"
```

**2. Access denied**
- Check MySQL root password
- Verify DATABASE_URL in .env

**3. Prisma errors**
```bash
npx prisma generate
npx prisma db push
```

**4. Port 3000 in use**
```bash
# Change PORT in .env
PORT=3001
```

**5. Subtotal not calculating**
- Subtotal is GENERATED - don't INSERT subtotal value
- Let MySQL calculate: `jumlah * harga_satuan`

See **[QUICK_START.md](QUICK_START.md)** for detailed solutions.

## 📄 License

Educational project for academic purposes.

---

**Clean Up Laundry** - Professional Laundry Management System  
*Integrated Database Project - 2026*

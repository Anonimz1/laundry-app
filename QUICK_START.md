# Quick Start Guide - Fresh Database Setup

## 🚀 One-Command Setup (Recommended)

### Windows:
```batch
setup-fresh-db.bat
```

Double-click `setup-fresh-db.bat` atau run dari command prompt.

### What it does:
1. ✅ Creates `laundry_db` database
2. ✅ Creates 10 tables with proper indexes and constraints
3. ✅ Creates 5 SQL functions
4. ✅ Creates 11 SQL procedures
5. ✅ Creates 20+ triggers (business rules enforcement)
6. ✅ Creates 8 views (for reporting)
7. ✅ Inserts sample data (pelanggan, kategori, layanan, produk, pesanan, dll)
8. ✅ Creates MySQL users and roles (kasir, laporan, pemilik)
9. ✅ Generates Prisma Client

---

## 📋 Manual Step-by-Step (If needed)

### Step 1: Ensure MySQL is Running
```powershell
# Check MySQL status
mysql --version

# Should output: mysql  Ver X.X.XX for Win64 on x86_64
```

### Step 2: Execute SQL Script
```powershell
# Run from project root
mysql -u root -p < extracted_steps\project_database.sql
```

Enter your MySQL root password when prompted.

### Step 3: Verify Database
```powershell
mysql -u root -p -e "USE laundry_db; SHOW TABLES;"
```

Expected output:
```
+----------------------+
| Tables_in_laundry_db |
+----------------------+
| detail_layanan       |
| detail_produk        |
| kategori             |
| layanan              |
| pelanggan            |
| pembayaran           |
| pengeluaran          |
| pengiriman           |
| pesanan              |
| produk               |
| v_item_jual          | (view)
| v_laba_bulanan       | (view)
| ... (8 views total)  |
+----------------------+
```

### Step 4: Update .env File
```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/laundry_db"
```

⚠️ Replace `YOUR_PASSWORD` with your actual MySQL root password!

### Step 5: Generate Prisma Client
```powershell
npx prisma generate
```

### Step 6: Start the Application
```powershell
npm run dev
```

Application will start at: http://localhost:3000

---

## 🧪 Testing the Setup

### Test 1: Check Functions
```sql
USE laundry_db;

-- Test function: sisa_tagihan
SELECT sisa_tagihan(103) as sisa_pesanan_103;

-- Test function: laba_periode
SELECT laba_periode('2026-10-01', '2026-10-31') as laba_oktober;
```

### Test 2: Check Procedures
```sql
-- Test procedure: search customer (SQL injection safe)
CALL cari_pelanggan('Made');

-- Test procedure: revenue report
CALL laporan_omzet('2026-10-01', '2026-10-31');
```

### Test 3: Check Views
```sql
-- View: unpaid orders
SELECT * FROM v_pesanan_belum_lunas;

-- View: low stock alert
SELECT * FROM v_stok_menipis;

-- View: monthly profit
SELECT * FROM v_laba_bulanan;
```

### Test 4: Check Triggers (Auto-calculation)
```sql
-- Insert new order detail
INSERT INTO detail_layanan (id_pesanan, id_layanan, jumlah, harga_satuan)
VALUES (101, 1, 2, 8000);

-- Check: subtotal auto-calculated, pesanan.total auto-updated
SELECT * FROM detail_layanan WHERE id_pesanan = 101;
SELECT total FROM pesanan WHERE id_pesanan = 101;

-- Rollback test
ROLLBACK;
```

---

## 📊 Sample Data Overview

### Pelanggan (5 customers)
- Ni Made Sari (081234567801)
- Gede Arta (081234567802)
- Kadek Rina (081234567803)
- Putu Wirawan (081234567804)
- Komang Ayu (081234567805)

### Layanan (3 services)
- Cuci Setrika Reguler (Rp 8.000/kg, 3 hari)
- Cuci Setrika Express (Rp 15.000/kg, 1 hari)
- Setrika Saja (Rp 7.000/kg, 2 hari)

### Produk (3 products)
- Deterjen Bubuk (Rp 12.000, stok 40)
- Pewangi (Rp 8.000, stok 25)
- Pelembut (Rp 9.000, stok 3) ← Low stock alert!

### Pesanan (9 orders: 101-109)
- Pesanan 101-102: Completed (October)
- Pesanan 103: In progress (dicuci)
- Pesanan 104-107: Completed (September)
- Pesanan 108: Ready (siap)
- Pesanan 109: Just received (diterima)

### Payment Status
- Pesanan 103, 109: ❌ Not yet paid (for testing unpaid orders query)
- Pesanan 108: ⚠️ Partially paid (30k of 60k)
- Others: ✅ Fully paid

---

## 🔐 MySQL Users & Roles

The setup creates 3 users with different privileges:

### 1. app_kasir (Kasir Role)
**Username:** `app_kasir@localhost`  
**Password:** `Ganti_Kasir#2026` ⚠️ **CHANGE THIS!**

**Permissions:**
- View orders, customers, inventory
- Create orders, add services/products
- Record payments
- Update order status

**Cannot:**
- View full phone numbers (uses v_pelanggan_samar)
- Record expenses
- Cancel payments

### 2. app_laporan (Reporting Role)
**Username:** `app_laporan@localhost`  
**Password:** `Ganti_Laporan#2026` ⚠️ **CHANGE THIS!**

**Permissions:**
- View all reports (omzet, laba, stock)
- Execute report functions

**Cannot:**
- Modify any data
- View customer phone numbers (masked)

### 3. app_pemilik (Owner Role)
**Username:** `app_pemilik@localhost`  
**Password:** `Ganti_Pemilik#2026` ⚠️ **CHANGE THIS!**

**Permissions:**
- All kasir + laporan permissions
- View all tables (full access)
- Record expenses
- Cancel payments
- Full reporting access

---

## 🔥 Common Issues & Solutions

### Issue 1: "mysql: command not found"
**Solution:** Add MySQL to PATH or run from MySQL bin directory
```powershell
# Add to PATH (Windows)
$env:Path += ";C:\Program Files\MySQL\MySQL Server 8.0\bin"
```

### Issue 2: "Access denied for user 'root'@'localhost'"
**Solution:** Use correct password or reset MySQL root password

### Issue 3: "Database 'laundry_db' already exists"
**Solution:** The script has `DROP DATABASE IF EXISTS` - it will recreate automatically

### Issue 4: Prisma error "Can't reach database server"
**Solution:** 
1. Check MySQL is running
2. Verify `.env` DATABASE_URL is correct
3. Test connection: `mysql -u root -p laundry_db`

### Issue 5: "Subtotal not auto-calculating"
**Solution:** Subtotal is a GENERATED COLUMN - don't INSERT subtotal value, let MySQL calculate it
```sql
-- ❌ Wrong
INSERT INTO detail_layanan (id_pesanan, id_layanan, jumlah, harga_satuan, subtotal)
VALUES (101, 1, 5, 8000, 40000);

-- ✅ Correct
INSERT INTO detail_layanan (id_pesanan, id_layanan, jumlah, harga_satuan)
VALUES (101, 1, 5, 8000);
-- subtotal auto-calculated: 5 * 8000 = 40000
```

---

## 🎯 Next Steps

1. ✅ **Test 17 Analytic Queries** (A1-A17)
   - See `src/infrastructure/services/AnalyticQueryService.js`

2. ✅ **Create API Endpoints**
   - Wrap services in Express routes
   - Test with Postman

3. ✅ **Build UI**
   - Dashboard with key metrics
   - Order management
   - Reports

4. ✅ **Security**
   - Change default passwords
   - Implement JWT authentication
   - Role-based access control

---

## 📚 Related Documentation

- `INTEGRATION_ROADMAP.md` - Full implementation plan
- `DATABASE_ENHANCEMENT_ANALYSIS.md` - Database principles (Part 1)
- `DATABASE_ENHANCEMENT_PART2.md` - ORM, CQRS, DAL
- `DATABASE_ENHANCEMENT_PART3.md` - ACID, Security, Unit of Work
- `project_database.sql` - Complete SQL script (in extracted_steps/)
- `stage5_query_sql.sql` - All 17 analytic queries (in extracted_steps/)

---

## 💡 Tips

1. **Backup Before Testing:** Run backup script before experimenting
2. **Use Transactions:** Wrap tests in `START TRANSACTION` ... `ROLLBACK`
3. **Check Triggers:** Triggers fire automatically - understand their logic
4. **View Documentation:** Read comments in SQL files
5. **Test Procedures:** Use `CALL procedure_name(params)` to test

---

## ✅ Success Checklist

- [ ] MySQL server running
- [ ] Database `laundry_db` created
- [ ] 10 tables exist
- [ ] 5 functions working
- [ ] 11 procedures working
- [ ] 20+ triggers active
- [ ] 8 views accessible
- [ ] Sample data loaded
- [ ] 3 MySQL users created
- [ ] Prisma client generated
- [ ] Application starts successfully
- [ ] Can query analytic views

**All checked?** 🎉 **You're ready to develop!**

# Setup Checklist - Option A: Fresh Database

## ✅ Files Created

### Core Setup Files
- [x] `setup-fresh-db.bat` - One-command setup script (Windows)
- [x] `scripts/reset-database.ps1` - PowerShell setup script
- [x] `scripts/verify-setup.sql` - Verification script
- [x] `scripts/backup-current-db.sh` - Backup script (optional)

### Service Files
- [x] `src/infrastructure/services/SqlProcedureService.js` - Wraps 5 functions + 11 procedures
- [x] `src/infrastructure/services/AnalyticQueryService.js` - 17 analytic queries (A1-A17)

### Documentation
- [x] `README.md` - Complete project overview
- [x] `QUICK_START.md` - Detailed setup guide with troubleshooting
- [x] `INTEGRATION_ROADMAP.md` - Implementation phases
- [x] `SETUP_CHECKLIST.md` - This file

### Updated Files
- [x] `prisma/schema.prisma` - Aligned with project_database.sql

---

## 🚀 Next Actions for You

### Step 1: Run Setup (5 minutes)

**Option A: One Command (Easiest)**
```bash
# Double-click or run:
setup-fresh-db.bat
```

**Option B: Manual PowerShell**
```powershell
.\scripts\reset-database.ps1
```

**Option C: Direct MySQL**
```bash
mysql -u root -p < extracted_steps\project_database.sql
npx prisma generate
```

### Step 2: Configure Environment (1 minute)
```bash
# 1. Copy .env.example to .env
copy .env.example .env

# 2. Edit .env, set YOUR_PASSWORD
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/laundry_db"
```

### Step 3: Verify Setup (1 minute)
```bash
# Run verification script
mysql -u root -p < scripts\verify-setup.sql
```

**Expected Output:**
```
Tables: 10 ✓
Functions: 5 ✓
Procedures: 11 ✓
Triggers: 20+ ✓
Views: 8 ✓
Sample Data: Loaded ✓
```

### Step 4: Test Application (2 minutes)
```bash
npm run dev
```

Visit: http://localhost:3000

---

## ✅ What Was Implemented

### Database Layer (SQL)

#### 5 Functions ✓
1. `sisa_tagihan(id_pesanan)` - Calculate remaining payment
2. `hitung_total_pesanan(id_pesanan)` - Calculate order total
3. `omzet_periode(dari, sampai)` - Revenue for period
4. `pengeluaran_periode(dari, sampai)` - Expenses for period
5. `laba_periode(dari, sampai)` - Profit for period

#### 11 Procedures ✓
1. `refresh_total(id_pesanan)` - Recalculate order total
2. `buat_pesanan(id_pelanggan, OUT id_pesanan)` - Create new order
3. `tambah_layanan(id_pesanan, id_layanan, jumlah)` - Add service
4. `tambah_produk(id_pesanan, id_produk, qty)` - Add product (stock checked)
5. `tambah_pengiriman(id_pesanan, jenis, alamat, biaya)` - Add delivery
6. `ubah_status_cucian(id_pesanan, status)` - Update order status
7. `catat_pembayaran(id_pesanan, jumlah, metode)` - Record payment (ACID)
8. `batalkan_pembayaran(id_pembayaran)` - Cancel payment
9. `catat_pengeluaran(...)` - Record expense
10. `laporan_omzet(dari, sampai)` - Revenue report
11. `cari_pelanggan(kata_kunci)` - Search customer (SQL injection safe)

#### 20+ Triggers ✓
**Auto-calculation:**
- `trg_dl_ai/au/ad` - Auto-update pesanan.total when detail_layanan changes
- `trg_dp_ai/au/ad` - Auto-update pesanan.total when detail_produk changes
- `trg_kirim_ai/au/ad` - Auto-update pesanan.total when pengiriman changes

**Stock management:**
- `trg_dp_bi` - Check stock before insert
- `trg_dp_ai` - Decrement stock after insert
- `trg_dp_au` - Adjust stock on update
- `trg_dp_ad` - Restore stock on delete
- `trg_pesanan_bd` - Restore stock when order deleted

**Business rules:**
- `trg_pesanan_bu` - Status can only move forward, auto-set tgl_selesai
- `trg_bayar_bi` - Prevent payment > remaining
- `trg_bayar_bu` - Payment immutable (only cancellable)
- `trg_bayar_bd` - Prevent payment deletion
- `trg_kategori_bu` - Prevent jenis change if in use
- `trg_layanan_bi/bu` - Ensure kategori.jenis = 'LAYANAN'
- `trg_produk_bi/bu` - Ensure kategori.jenis = 'PRODUK'
- `trg_pengeluaran_bi/bu` - Ensure kategori.jenis = 'PENGELUARAN'

#### 8 Views ✓
1. `v_nota` - Complete order info with estimates
2. `v_pesanan_belum_lunas` - Unpaid orders
3. `v_stok_menipis` - Low stock products (< 5)
4. `v_omzet_bulanan` - Monthly revenue breakdown
5. `v_laba_bulanan` - Monthly profit
6. `v_item_jual` - Combined layanan + produk (Generalization)
7. `v_rincian_pesanan` - Order details (layanan + produk combined)
8. `v_pelanggan_samar` - Customers with masked phone

#### 17 Analytic Queries (A1-A17) ✓
Maps to 11 business requirements from Tahap 1

---

### Application Layer (Node.js)

#### Services ✓
- `SqlProcedureService` - Wraps all procedures and functions
- `AnalyticQueryService` - All 17 queries as methods

#### Architecture ✓
- Clean Architecture layers (domain, application, infrastructure, presentation)
- Repository Pattern for data access
- CQRS separation (commands vs queries)
- Unit of Work for transactions

#### Security ✓
- SQL injection prevention (parameterized queries)
- ACID transactions (catat_pembayaran)
- Role-based access (kasir, laporan, pemilik)
- Input validation

---

## 📋 Verification Tests

Run these to ensure everything works:

### Test 1: Database Structure
```sql
USE laundry_db;
SHOW TABLES;  -- Should show 10 tables + 8 views
```

### Test 2: Functions
```sql
SELECT sisa_tagihan(103);
-- Expected: 70000 (pesanan 103 hasn't been paid)
```

### Test 3: Procedures
```sql
CALL cari_pelanggan('Made');
-- Expected: Rows with "Made" in nama
```

### Test 4: Views
```sql
SELECT * FROM v_stok_menipis;
-- Expected: Pelembut (stok 3 < 5)
```

### Test 5: Triggers
```sql
START TRANSACTION;
INSERT INTO detail_layanan (id_pesanan, id_layanan, jumlah, harga_satuan)
VALUES (101, 1, 1, 8000);
SELECT subtotal FROM detail_layanan WHERE id_pesanan=101 AND id_layanan=1;
-- Expected: 8000 (auto-calculated)
ROLLBACK;
```

### Test 6: Sample Data
```sql
SELECT COUNT(*) FROM pesanan;
-- Expected: 9 (pesanan 101-109)

SELECT * FROM v_pesanan_belum_lunas;
-- Expected: 2 rows (pesanan 103 and 109)
```

---

## 🎯 What to Do Next

### Immediate (Today)
1. ✅ Run `setup-fresh-db.bat`
2. ✅ Verify with `scripts\verify-setup.sql`
3. ✅ Update `.env` with your password
4. ✅ Test: `npm run dev`

### This Week
1. 📝 Create API endpoints for analytic queries (A1-A17)
2. 🎨 Build dashboard showing key metrics
3. 🧪 Write integration tests
4. 📊 Create reports UI

### Implementation Priorities

**Phase 1: Core Functionality (Week 1)**
- [ ] API endpoint: POST /api/orders (uses buat_pesanan + tambah_layanan/produk)
- [ ] API endpoint: POST /api/payments (uses catat_pembayaran)
- [ ] API endpoint: PUT /api/orders/:id/status (uses ubah_status_cucian)
- [ ] Dashboard with v_pesanan_belum_lunas, v_stok_menipis

**Phase 2: Analytics (Week 2)**
- [ ] GET /api/analytics/* endpoints (A1-A17)
- [ ] Reports UI for layanan-terlaris, omzet-bulanan, laba-bulanan
- [ ] Charts for revenue trends

**Phase 3: Advanced (Week 3)**
- [ ] User authentication (JWT)
- [ ] Role-based UI (show/hide based on role)
- [ ] Export reports to PDF/Excel
- [ ] Mobile-responsive UI

**Phase 4: Testing & Documentation (Week 4)**
- [ ] Unit tests for services
- [ ] Integration tests for procedures
- [ ] API documentation (Postman collection)
- [ ] Demo video/presentation

---

## 🔄 If Something Goes Wrong

### Reset and Retry
```bash
# 1. Drop database
mysql -u root -p -e "DROP DATABASE IF EXISTS laundry_db;"

# 2. Re-run setup
setup-fresh-db.bat
```

### Check Logs
```bash
# MySQL error log
type "C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err"

# Application log
npm run dev  # Check console output
```

### Manual Verification
```sql
-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'laundry_db' AND routine_type = 'FUNCTION';

-- Check if procedures exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'laundry_db' AND routine_type = 'PROCEDURE';

-- Check if triggers exist
SELECT trigger_name, event_object_table FROM information_schema.triggers 
WHERE trigger_schema = 'laundry_db';
```

---

## 📞 Support

**Issue?** Check:
1. **QUICK_START.md** - Detailed troubleshooting
2. **INTEGRATION_ROADMAP.md** - Implementation details
3. **README.md** - Overview and examples

**Everything working?** ✅ You're ready to develop!

---

## 🎉 Success Criteria

You should be able to:
- [x] Database `laundry_db` exists
- [x] 10 tables created with proper structure
- [x] 5 functions working (test with SELECT)
- [x] 11 procedures working (test with CALL)
- [x] Triggers firing (test with INSERT)
- [x] 8 views accessible (test with SELECT)
- [x] Sample data loaded (9 pesanan)
- [x] Application starts (npm run dev)
- [x] Can browse http://localhost:3000

**All checked?** 🎊 **Congratulations! You're ready to code!**

# Manual Setup Guide - Step by Step

Karena script otomatis meminta password interaktif, ikuti langkah manual ini:

---

## Step 1: Execute SQL Script

Buka **Command Prompt** atau **PowerShell** dan jalankan:

```bash
cd "c:\Users\LENOVO\Documents\proyek basis data\laundry-app"

mysql -u root -p < extracted_steps\project_database.sql
```

**Masukkan password MySQL Anda ketika diminta.**

### Apa yang Terjadi:
- ✅ Database `laundry_db` dibuat
- ✅ 10 tables dibuat
- ✅ 5 functions dibuat
- ✅ 11 procedures dibuat
- ✅ 20+ triggers dibuat
- ✅ 8 views dibuat
- ✅ Sample data diinsert
- ✅ MySQL users & roles dibuat

**Expected Output:**
Script akan berjalan beberapa detik tanpa error. Jika ada error, copy paste error message.

---

## Step 2: Verify Database

```bash
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

---

## Step 3: Update .env File

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Edit `.env` file dan ganti `YOUR_PASSWORD`:
```env
DATABASE_URL="mysql://root:YOUR_ACTUAL_PASSWORD@localhost:3306/laundry_db"
```

**⚠️ Ganti `YOUR_ACTUAL_PASSWORD` dengan password MySQL root Anda!**

---

## Step 4: Generate Prisma Client

```bash
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client
```

---

## Step 5: Start Application

```bash
npm run dev
```

**Expected Output:**
```
Server running on http://localhost:3000
```

Buka browser: **http://localhost:3000**

---

## Quick Test Commands

### Test 1: Check Tables
```bash
mysql -u root -p -e "USE laundry_db; SHOW TABLES;"
```

Expected: 10 tables + 8 views

### Test 2: Check Functions
```bash
mysql -u root -p -e "USE laundry_db; SELECT sisa_tagihan(103) as sisa;"
```

Expected: `70000` (pesanan 103 belum dibayar)

### Test 3: Check Sample Data
```bash
mysql -u root -p -e "USE laundry_db; SELECT COUNT(*) as total_pesanan FROM pesanan;"
```

Expected: `9` (pesanan 101-109)

### Test 4: Check Views
```bash
mysql -u root -p -e "USE laundry_db; SELECT * FROM v_pesanan_belum_lunas;"
```

Expected: 2 rows (pesanan 103 dan 109 yang belum bayar)

---

## If Something Goes Wrong

### Error: "Can't connect to MySQL server"
**Solution:** Pastikan MySQL service running
```bash
# Check MySQL status
net start | findstr MySQL
```

### Error: "Access denied for user 'root'"
**Solution:** Password salah, coba lagi atau reset password MySQL

### Error: "Database 'laundry_db' doesn't exist"
**Solution:** Script SQL belum berhasil dijalankan. Coba Step 1 lagi.

### Error: "Unknown database 'laundry_db'" di Prisma
**Solution:** 
1. Check .env file - pastikan DATABASE_URL benar
2. Re-run Step 1 (execute SQL script)

---

## Alternative: Manual MySQL Commands

Jika command line tidak bekerja, buka **MySQL Workbench** atau **phpMyAdmin** dan:

1. Buka file `extracted_steps\project_database.sql`
2. Copy semua isinya
3. Paste dan Execute di MySQL Workbench/phpMyAdmin

---

## Success Checklist

Setelah selesai, Anda harus bisa:

- [x] MySQL dapat diakses
- [x] Database `laundry_db` ada
- [x] 10 tables ada (pelanggan, kategori, layanan, produk, pesanan, detail_layanan, detail_produk, pembayaran, pengiriman, pengeluaran)
- [x] Functions bekerja (test: `SELECT sisa_tagihan(103);`)
- [x] Views dapat diakses (test: `SELECT * FROM v_nota;`)
- [x] Sample data ada (test: `SELECT * FROM pesanan;`)
- [x] Prisma client generated
- [x] Application berjalan di http://localhost:3000

**All checked?** 🎉 **Setup complete!**

---

## Next Steps After Setup

1. **Test Analytic Queries:**
   ```bash
   mysql -u root -p < extracted_steps\stage5_query_sql.sql
   ```
   
2. **Browse Sample Data:**
   - 5 pelanggan (Ni Made Sari, Gede Arta, dll)
   - 9 pesanan (101-109)
   - Pesanan 103 & 109 belum dibayar ← untuk testing

3. **Create API Endpoints:**
   - See `src/infrastructure/services/SqlProcedureService.js`
   - See `src/infrastructure/services/AnalyticQueryService.js`

4. **Build Dashboard:**
   - Show unpaid orders (`v_pesanan_belum_lunas`)
   - Show low stock (`v_stok_menipis`)
   - Show monthly profit (`v_laba_bulanan`)

---

## Need Help?

See:
- **QUICK_START.md** - Detailed troubleshooting
- **SETUP_CHECKLIST.md** - Verify each component
- **README.md** - Project overview

**Questions?** Ask me! 😊

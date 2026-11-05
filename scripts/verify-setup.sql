-- =====================================================================
-- Verification Script: Check if Fresh Database Setup is Complete
-- Run: mysql -u root -p < scripts\verify-setup.sql
-- =====================================================================

USE laundry_db;

SELECT '========================================' as '';
SELECT 'DATABASE VERIFICATION REPORT' as '';
SELECT '========================================' as '';
SELECT '' as '';

-- 1. Tables
SELECT '1. TABLES (Expected: 10)' as '';
SELECT COUNT(*) as 'Total Tables' 
FROM information_schema.tables 
WHERE table_schema = 'laundry_db' AND table_type = 'BASE TABLE';

SELECT table_name as 'Table Name' 
FROM information_schema.tables 
WHERE table_schema = 'laundry_db' AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT '' as '';

-- 2. Functions
SELECT '2. FUNCTIONS (Expected: 5)' as '';
SELECT COUNT(*) as 'Total Functions' 
FROM information_schema.routines 
WHERE routine_schema = 'laundry_db' AND routine_type = 'FUNCTION';

SELECT routine_name as 'Function Name' 
FROM information_schema.routines 
WHERE routine_schema = 'laundry_db' AND routine_type = 'FUNCTION'
ORDER BY routine_name;

SELECT '' as '';

-- 3. Procedures
SELECT '3. PROCEDURES (Expected: 11)' as '';
SELECT COUNT(*) as 'Total Procedures' 
FROM information_schema.routines 
WHERE routine_schema = 'laundry_db' AND routine_type = 'PROCEDURE';

SELECT routine_name as 'Procedure Name' 
FROM information_schema.routines 
WHERE routine_schema = 'laundry_db' AND routine_type = 'PROCEDURE'
ORDER BY routine_name;

SELECT '' as '';

-- 4. Triggers
SELECT '4. TRIGGERS (Expected: 20+)' as '';
SELECT COUNT(*) as 'Total Triggers' 
FROM information_schema.triggers 
WHERE trigger_schema = 'laundry_db';

SELECT trigger_name as 'Trigger Name', event_manipulation as 'Event', event_object_table as 'Table'
FROM information_schema.triggers 
WHERE trigger_schema = 'laundry_db'
ORDER BY event_object_table, trigger_name;

SELECT '' as '';

-- 5. Views
SELECT '5. VIEWS (Expected: 8)' as '';
SELECT COUNT(*) as 'Total Views' 
FROM information_schema.views 
WHERE table_schema = 'laundry_db';

SELECT table_name as 'View Name' 
FROM information_schema.views 
WHERE table_schema = 'laundry_db'
ORDER BY table_name;

SELECT '' as '';

-- 6. Sample Data
SELECT '6. SAMPLE DATA' as '';
SELECT 'Pelanggan' as 'Table', COUNT(*) as 'Rows' FROM pelanggan
UNION ALL SELECT 'Kategori', COUNT(*) FROM kategori
UNION ALL SELECT 'Layanan', COUNT(*) FROM layanan
UNION ALL SELECT 'Produk', COUNT(*) FROM produk
UNION ALL SELECT 'Pesanan', COUNT(*) FROM pesanan
UNION ALL SELECT 'DetailLayanan', COUNT(*) FROM detail_layanan
UNION ALL SELECT 'DetailProduk', COUNT(*) FROM detail_produk
UNION ALL SELECT 'Pembayaran', COUNT(*) FROM pembayaran
UNION ALL SELECT 'Pengiriman', COUNT(*) FROM pengiriman
UNION ALL SELECT 'Pengeluaran', COUNT(*) FROM pengeluaran;

SELECT '' as '';

-- 7. Test Functions
SELECT '7. FUNCTION TESTS' as '';
SELECT 'sisa_tagihan(103)' as 'Function', sisa_tagihan(103) as 'Result';
SELECT 'hitung_total_pesanan(101)' as 'Function', hitung_total_pesanan(101) as 'Result';
SELECT 'laba_periode(2026-10-01, 2026-10-31)' as 'Function', 
       laba_periode('2026-10-01', '2026-10-31') as 'Result';

SELECT '' as '';

-- 8. Test Views
SELECT '8. VIEW TESTS' as '';
SELECT 'v_pesanan_belum_lunas' as 'View', COUNT(*) as 'Rows' FROM v_pesanan_belum_lunas;
SELECT 'v_stok_menipis' as 'View', COUNT(*) as 'Rows' FROM v_stok_menipis;
SELECT 'v_laba_bulanan' as 'View', COUNT(*) as 'Rows' FROM v_laba_bulanan;

SELECT '' as '';

-- 9. Check GENERATED Columns
SELECT '9. GENERATED COLUMNS (subtotal)' as '';
SELECT 'detail_layanan.subtotal' as 'Column', 
       CASE WHEN GENERATION_EXPRESSION IS NOT NULL 
            THEN 'GENERATED ✓' 
            ELSE 'NOT GENERATED ✗' 
       END as 'Status'
FROM information_schema.columns
WHERE table_schema = 'laundry_db' 
  AND table_name = 'detail_layanan' 
  AND column_name = 'subtotal';

SELECT 'detail_produk.subtotal' as 'Column',
       CASE WHEN GENERATION_EXPRESSION IS NOT NULL 
            THEN 'GENERATED ✓' 
            ELSE 'NOT GENERATED ✗' 
       END as 'Status'
FROM information_schema.columns
WHERE table_schema = 'laundry_db' 
  AND table_name = 'detail_produk' 
  AND column_name = 'subtotal';

SELECT '' as '';

-- 10. Check MySQL Users
SELECT '10. MYSQL USERS (Expected: 3)' as '';
SELECT user as 'Username', host as 'Host'
FROM mysql.user
WHERE user LIKE 'app_%'
ORDER BY user;

SELECT '' as '';

-- Summary
SELECT '========================================' as '';
SELECT 'VERIFICATION COMPLETE' as '';
SELECT '========================================' as '';
SELECT 'Check the counts above match expected values' as 'Note';
SELECT 'Tables: 10, Functions: 5, Procedures: 11, Triggers: 20+, Views: 8' as 'Expected';

-- =====================================================================
-- STAGE 5: SQL IMPLEMENTATION - Clean Up Laundry
-- DBMS: MySQL 8.0+. Jalankan SETELAH project_database.sql:
--     mysql -u root -p laundry_db < stage5_query_sql.sql
-- Tiap kueri diberi kode (A1..A17) dan kebutuhan informasi yang dijawabnya
-- (nomor masalah mengikuti tabel keterlacakan Laporan (I) Tahap 3).
--
-- Keterlacakan ke 11 kebutuhan informasi Tahap 1 (Bagian 7 Analisis Studi Kasus):
--   Kebutuhan 1  layanan terlaris ................ A1
--   Kebutuhan 2  omzet layanan vs produk/bulan ... A14
--   Kebutuhan 3  pelanggan belanja terbesar ...... A8
--   Kebutuhan 4  pesanan belum lunas ............. A4
--   Kebutuhan 5  stok menipis .................... A3
--   Kebutuhan 6  produk belum pernah terjual ..... A3 (kolom unit_terjual = 0)
--   Kebutuhan 7  selesai melewati estimasi ....... A5
--   Kebutuhan 8  rata-rata berat per pelanggan ... A15
--   Kebutuhan 9  tahap cucian seorang pelanggan .. A17 (A11 = semua pesanan berjalan)
--   Kebutuhan 10 pengeluaran per bulan per kategori A16
--   Kebutuhan 11 selisih omzet dan pengeluaran ... A7
-- =====================================================================
USE laundry_db;

-- =====================================================================
-- BAGIAN A. KUERI ANALITIK (menjawab kebutuhan informasi pemilik)
-- =====================================================================

-- A1. Lima layanan terlaris. [Masalah 8: tidak ada info layanan terlaris]
--     INNER JOIN, SUM, COUNT, GROUP BY, ORDER BY, LIMIT
SELECT l.nama_layanan,
       COUNT(*)         AS jumlah_nota,
       SUM(dl.jumlah)   AS total_kg,
       SUM(dl.subtotal) AS omzet
FROM detail_layanan dl
INNER JOIN layanan l ON l.id_layanan = dl.id_layanan
GROUP BY l.id_layanan, l.nama_layanan
ORDER BY omzet DESC
LIMIT 5;

-- A2. Lima produk terlaris (jumlah terjual dan omzet). [Masalah 5: stok/penjualan produk]
--     INNER JOIN, SUM, GROUP BY, ORDER BY, LIMIT
SELECT pr.nama_produk,
       SUM(dp.qty)      AS unit_terjual,
       SUM(dp.subtotal) AS omzet
FROM detail_produk dp
INNER JOIN produk pr ON pr.id_produk = dp.id_produk
GROUP BY pr.id_produk, pr.nama_produk
ORDER BY unit_terjual DESC, omzet DESC
LIMIT 5;

-- A3. Posisi stok semua produk dan penanda stok menipis. [Masalah 5: stok tidak terpantau]
--     Produk yang belum pernah terjual tetap tampil; stok menipis = kurang dari 5.
--     LEFT JOIN (OUTER), COALESCE, SUM, GROUP BY, ORDER BY
SELECT pr.nama_produk,
       pr.stok,
       COALESCE(SUM(dp.qty), 0) AS unit_terjual,
       CASE WHEN pr.stok < 5 THEN 'SEGERA ISI ULANG' ELSE 'aman' END AS keterangan
FROM produk pr
LEFT JOIN detail_produk dp ON dp.id_produk = pr.id_produk
GROUP BY pr.id_produk, pr.nama_produk, pr.stok
ORDER BY pr.stok ASC;

-- A4. Pesanan yang belum lunas beserta sisa tagihannya. [Masalah 4: pembayaran sebagian]
--     INNER JOIN + LEFT JOIN (OUTER), SUM, GROUP BY, HAVING, ORDER BY
--     LEFT JOIN: pesanan yang belum punya pembayaran sama sekali tetap tampil.
SELECT p.id_pesanan,
       pl.nama,
       pl.no_hp,
       p.total,
       COALESCE(SUM(b.jumlah), 0)           AS sudah_dibayar,
       p.total - COALESCE(SUM(b.jumlah), 0) AS sisa_tagihan
FROM pesanan p
INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
LEFT JOIN  pembayaran b ON b.id_pesanan = p.id_pesanan AND b.status <> 'batal'
GROUP BY p.id_pesanan, pl.nama, pl.no_hp, p.total
HAVING p.total - COALESCE(SUM(b.jumlah), 0) > 0
ORDER BY sisa_tagihan DESC;

-- A5. Pesanan yang melewati estimasi layanan terlama. [Masalah 3: melewati estimasi]
--     Nota selesai dihitung sampai tgl_selesai, nota belum selesai sampai sekarang.
--     Multi INNER JOIN, MAX, GROUP BY, HAVING (nota yang masih berjalan ikut terbaca)
--     CATATAN: kueri ini memakai NOW() untuk nota yang belum selesai, sehingga
--     hasilnya BERUBAH setiap hari (jam_terlambat nota berjalan terus bertambah).
--     Nota selesai tidak berubah karena dihitung sampai tgl_selesai.
SELECT p.id_pesanan,
       pl.nama,
       p.status_cucian,
       MAX(l.estimasi_hari) AS estimasi_hari,
       TIMESTAMPDIFF(HOUR, p.tgl_masuk, COALESCE(p.tgl_selesai, NOW())) AS jam_berjalan,
       TIMESTAMPDIFF(HOUR, p.tgl_masuk, COALESCE(p.tgl_selesai, NOW())) - MAX(l.estimasi_hari) * 24 AS jam_terlambat
FROM pesanan p
INNER JOIN pelanggan pl     ON pl.id_pelanggan = p.id_pelanggan
INNER JOIN detail_layanan dl ON dl.id_pesanan  = p.id_pesanan
INNER JOIN layanan l         ON l.id_layanan   = dl.id_layanan
GROUP BY p.id_pesanan, pl.nama, p.status_cucian, p.tgl_masuk, p.tgl_selesai
HAVING TIMESTAMPDIFF(HOUR, p.tgl_masuk, COALESCE(p.tgl_selesai, NOW())) > MAX(l.estimasi_hari) * 24
ORDER BY jam_terlambat DESC;

-- A6. Rekap omzet per bulan. [Masalah 1 dan 6: rekap omzet manual, nominal dihitung manual]
--     Memuat jumlah nota, omzet, rata-rata, nota terkecil dan terbesar.
--     COUNT, SUM, AVG, MIN, MAX, GROUP BY, ORDER BY
SELECT DATE_FORMAT(tgl_masuk, '%Y-%m') AS bulan,
       COUNT(*)              AS jumlah_nota,
       SUM(total)            AS omzet,
       ROUND(AVG(total), 0)  AS rata_rata_nota,
       MIN(total)            AS nota_terkecil,
       MAX(total)            AS nota_terbesar
FROM pesanan
GROUP BY DATE_FORMAT(tgl_masuk, '%Y-%m')
ORDER BY bulan;

-- A7. Laba bulanan = omzet dikurangi pengeluaran operasional. [Revisi ERD: PENGELUARAN]
--     UNION ALL pada subkueri, SUM, GROUP BY, ORDER BY
SELECT bulan,
       SUM(omzet)               AS omzet,
       SUM(biaya)               AS pengeluaran,
       SUM(omzet) - SUM(biaya)  AS laba
FROM (
      SELECT DATE_FORMAT(tgl_masuk, '%Y-%m') AS bulan, total AS omzet, 0 AS biaya
        FROM pesanan
      UNION ALL
      SELECT DATE_FORMAT(tgl_pengeluaran, '%Y-%m'), 0, jumlah
        FROM pengeluaran
     ) t
GROUP BY bulan
ORDER BY bulan;

-- A8. Pelanggan dengan belanja di atas Rp100.000. [Masalah 7: data pelanggan tersebar]
--     INNER JOIN, COUNT, SUM, MAX, GROUP BY, HAVING, ORDER BY
SELECT pl.nama,
       pl.no_hp,
       COUNT(p.id_pesanan) AS jumlah_nota,
       SUM(p.total)        AS total_belanja,
       MAX(p.tgl_masuk)    AS nota_terakhir
FROM pelanggan pl
INNER JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
GROUP BY pl.id_pelanggan, pl.nama, pl.no_hp
HAVING SUM(p.total) > 100000
ORDER BY total_belanja DESC;

-- A9. Pengeluaran per kategori. [Revisi ERD: PENGELUARAN]
--     Kategori yang belum pernah dipakai tetap tampil dengan nilai nol.
--     LEFT JOIN (OUTER) dengan syarat di ON, WHERE pada kategori, SUM, GROUP BY, ORDER BY
SELECT k.nama_kategori,
       COUNT(pg.id_pengeluaran)     AS jumlah_catatan,
       COALESCE(SUM(pg.jumlah), 0)  AS total_pengeluaran
FROM kategori k
LEFT JOIN pengeluaran pg ON pg.id_kategori = k.id_kategori
WHERE k.jenis = 'PENGELUARAN'
GROUP BY k.id_kategori, k.nama_kategori
ORDER BY total_pengeluaran DESC;

-- A10. Komposisi pembayaran per metode (tunai vs QRIS). [Catatan kas dan pembayaran QRIS]
--      Pembayaran yang dibatalkan tidak dihitung.
--      WHERE, COUNT, SUM, AVG, GROUP BY, ORDER BY
SELECT metode,
       COUNT(*)            AS jumlah_transaksi,
       SUM(jumlah)         AS total_diterima,
       ROUND(AVG(jumlah),0) AS rata_rata
FROM pembayaran
WHERE status <> 'batal'
GROUP BY metode
ORDER BY total_diterima DESC;

-- A11. Pesanan yang masih dalam pengerjaan. [Masalah 2: status cucian tidak terpantau]
--      Tampilan untuk kasir/operator (semua pelanggan); per pelanggan lihat A17.
--      Diurutkan dari yang paling lama menunggu.
--      INNER JOIN, WHERE, ORDER BY
SELECT p.id_pesanan, pl.nama, p.status_cucian, p.tgl_masuk
FROM pesanan p
INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
WHERE p.status_cucian <> 'selesai'
ORDER BY p.tgl_masuk ASC;

-- A12. Pelanggan yang memakai layanan antar-jemput. [Perencanaan rute antar-jemput]
--      Tiap pelanggan muncul satu kali.
--      DISTINCT, INNER JOIN, WHERE, ORDER BY
SELECT DISTINCT pl.nama, pl.alamat
FROM pelanggan pl
INNER JOIN pesanan p     ON p.id_pelanggan = pl.id_pelanggan
INNER JOIN pengiriman pg ON pg.id_pesanan  = p.id_pesanan
ORDER BY pl.nama;

-- A13. Metode pembayaran yang pernah dipakai pelanggan (nilai unik).
--      DISTINCT, WHERE, ORDER BY
SELECT DISTINCT metode FROM pembayaran WHERE status <> 'batal' ORDER BY metode;

-- A14. Omzet layanan dibanding produk tiap bulan. [Kebutuhan informasi 2]
--      Ongkir tidak ikut dihitung; persen_produk = porsi produk dari omzet layanan + produk.
--      INNER JOIN, UNION ALL pada subkueri, SUM, ROUND, GROUP BY, ORDER BY
SELECT bulan,
       SUM(omzet_layanan)                                   AS omzet_layanan,
       SUM(omzet_produk)                                    AS omzet_produk,
       SUM(omzet_layanan) + SUM(omzet_produk)               AS omzet_gabungan,
       ROUND(100 * SUM(omzet_produk) /
             (SUM(omzet_layanan) + SUM(omzet_produk)), 1)   AS persen_produk
FROM (
      SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m') AS bulan, dl.subtotal AS omzet_layanan, 0 AS omzet_produk
        FROM detail_layanan dl
       INNER JOIN pesanan p ON p.id_pesanan = dl.id_pesanan
      UNION ALL
      SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m'), 0, dp.subtotal
        FROM detail_produk dp
       INNER JOIN pesanan p ON p.id_pesanan = dp.id_pesanan
     ) t
GROUP BY bulan
ORDER BY bulan;

-- A15. Rata-rata berat cucian kiloan per pelanggan. [Kebutuhan informasi 8]
--      Berat dijumlahkan per nota dulu (hanya layanan satuan kg), lalu dirata-ratakan per pelanggan.
--      Subkueri di FROM, INNER JOIN, SUM, AVG, MIN, MAX, COUNT, GROUP BY, ORDER BY
SELECT pl.nama,
       COUNT(*)              AS jumlah_nota,
       SUM(n.kg_nota)        AS total_kg,
       ROUND(AVG(n.kg_nota), 2) AS rata_rata_kg_per_nota,
       MIN(n.kg_nota)        AS nota_teringan,
       MAX(n.kg_nota)        AS nota_terberat
FROM (
      SELECT p.id_pesanan, p.id_pelanggan, SUM(dl.jumlah) AS kg_nota
        FROM pesanan p
       INNER JOIN detail_layanan dl ON dl.id_pesanan = p.id_pesanan
       INNER JOIN layanan l         ON l.id_layanan  = dl.id_layanan
       WHERE l.satuan = 'kg'
       GROUP BY p.id_pesanan, p.id_pelanggan
     ) n
INNER JOIN pelanggan pl ON pl.id_pelanggan = n.id_pelanggan
GROUP BY pl.id_pelanggan, pl.nama
ORDER BY rata_rata_kg_per_nota DESC;

-- A16. Pengeluaran tiap bulan untuk setiap kategori. [Kebutuhan informasi 10]
--      INNER JOIN, COUNT, SUM, GROUP BY (bulan + kategori), ORDER BY
SELECT DATE_FORMAT(pg.tgl_pengeluaran, '%Y-%m') AS bulan,
       k.nama_kategori,
       COUNT(*)        AS jumlah_catatan,
       SUM(pg.jumlah)  AS total_pengeluaran
FROM pengeluaran pg
INNER JOIN kategori k ON k.id_kategori = pg.id_kategori
GROUP BY DATE_FORMAT(pg.tgl_pengeluaran, '%Y-%m'), k.id_kategori, k.nama_kategori
ORDER BY bulan, total_pengeluaran DESC;

-- A17. Sampai tahap mana cucian seorang pelanggan. [Kebutuhan informasi 9; Masalah 2]
--      Ganti nomor HP di bawah dengan nomor pelanggan yang bertanya. Di aplikasi nomor HP
--      dikirim sebagai parameter (PreparedStatement), bukan disambung ke teks SQL.
--      INNER JOIN, WHERE, ORDER BY
SELECT pl.nama, p.id_pesanan, p.status_cucian, p.tgl_masuk, p.tgl_selesai
FROM pelanggan pl
INNER JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
WHERE pl.no_hp = '081234567801'
ORDER BY p.tgl_masuk DESC;

-- =====================================================================
-- BAGIAN B. INSERT, UPDATE, DELETE
-- Dibungkus transaksi dan di-ROLLBACK di akhir supaya data contoh tetap utuh.
-- Ganti ROLLBACK dengan COMMIT bila ingin menyimpan perubahan.
-- =====================================================================
START TRANSACTION;

-- B1. INSERT: pelanggan baru
INSERT INTO pelanggan (nama, no_hp, alamat)
VALUES ('Nyoman Tes', '081234567899', 'Jl. Contoh 1 Singaraja');

-- B2. INSERT: pengeluaran sewa bulan Oktober (kategori 7 = Sewa)
INSERT INTO pengeluaran (id_kategori, tgl_pengeluaran, keterangan, jumlah, metode)
VALUES (7, '2026-10-29', 'Sewa tempat Oktober', 500000, 'transfer');

-- B3. UPDATE: pelanggan pindah alamat
UPDATE pelanggan
   SET alamat = 'Jl. Contoh 2 Singaraja'
 WHERE no_hp = '081234567899';

-- B4. UPDATE: harga cuci setrika reguler naik. Nota lama tidak berubah karena
--     harga_satuan sudah disalin ke detail_layanan; bukti: dua kueri di bawah.
UPDATE layanan SET harga = 9000 WHERE id_layanan = 1;
SELECT l.harga AS harga_layanan_sekarang, dl.harga_satuan AS harga_pada_nota_101
  FROM layanan l
  JOIN detail_layanan dl ON dl.id_layanan = l.id_layanan AND dl.id_pesanan = 101
 WHERE l.id_layanan = 1;

-- B5. UPDATE: menutup pesanan lewat procedure (tgl_selesai terisi otomatis oleh trigger)
CALL ubah_status_cucian(108, 'selesai');
SELECT id_pesanan, status_cucian, tgl_selesai IS NOT NULL AS tgl_selesai_terisi
  FROM pesanan WHERE id_pesanan = 108;

-- B6. DELETE: hapus pelanggan uji (boleh, karena belum punya pesanan)
DELETE FROM pelanggan WHERE no_hp = '081234567899';

-- B7. DELETE yang SENGAJA ditolak: pelanggan yang masih punya pesanan (ON DELETE RESTRICT).
--     Hapus tanda komentar untuk mencoba; MySQL akan menolaknya.
-- DELETE FROM pelanggan WHERE id_pelanggan = 1;

ROLLBACK;

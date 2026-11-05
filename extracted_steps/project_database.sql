-- =====================================================================
-- PROYEK BASIS DATA: Clean Up Laundry (laundry online + jual produk)
-- DBMS : MySQL 8.0+ (InnoDB)
-- Versi : final, mengikuti ERD revisi Tahap 2 (10 tabel, ada PENGELUARAN)
-- Re-executable: aman dijalankan berulang (DROP IF EXISTS)
-- Semua data = DUMMY. Jalankan sebagai root lewat klien mysql / Workbench:
--     mysql -u root -p < project_database.sql
-- =====================================================================

DROP DATABASE IF EXISTS laundry_db;
CREATE DATABASE laundry_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE laundry_db;

-- ---------- 1. PELANGGAN ----------
CREATE TABLE pelanggan (
  id_pelanggan INT AUTO_INCREMENT PRIMARY KEY,
  nama         VARCHAR(100) NOT NULL,
  no_hp        VARCHAR(15)  NOT NULL,
  alamat       VARCHAR(255) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_pelanggan_no_hp UNIQUE (no_hp),
  INDEX idx_pelanggan_nama (nama)
) ENGINE=InnoDB;

-- ---------- 2. KATEGORI (dipakai layanan, produk, dan pengeluaran) ----------
-- UNIQUE (nama, jenis): 'Deterjen' boleh ada sebagai PRODUK dan PENGELUARAN
CREATE TABLE kategori (
  id_kategori   INT AUTO_INCREMENT PRIMARY KEY,
  nama_kategori VARCHAR(50) NOT NULL,
  jenis         ENUM('LAYANAN','PRODUK','PENGELUARAN') NOT NULL,
  CONSTRAINT uq_kategori_nama_jenis UNIQUE (nama_kategori, jenis)
) ENGINE=InnoDB;

-- ---------- 3. LAYANAN ----------
CREATE TABLE layanan (
  id_layanan    INT AUTO_INCREMENT PRIMARY KEY,
  id_kategori   INT NOT NULL,
  nama_layanan  VARCHAR(100) NOT NULL,
  harga         DECIMAL(10,2) NOT NULL,
  satuan        ENUM('kg','pcs') NOT NULL,
  estimasi_hari TINYINT NOT NULL DEFAULT 2,
  CONSTRAINT ck_layanan_harga    CHECK (harga > 0),
  CONSTRAINT ck_layanan_estimasi CHECK (estimasi_hari > 0),
  CONSTRAINT fk_layanan_kategori FOREIGN KEY (id_kategori)
    REFERENCES kategori(id_kategori) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------- 4. PRODUK ----------
CREATE TABLE produk (
  id_produk   INT AUTO_INCREMENT PRIMARY KEY,
  id_kategori INT NOT NULL,
  nama_produk VARCHAR(100) NOT NULL,
  harga       DECIMAL(10,2) NOT NULL,
  stok        INT NOT NULL DEFAULT 0,
  CONSTRAINT ck_produk_harga CHECK (harga > 0),
  CONSTRAINT ck_produk_stok  CHECK (stok >= 0),
  CONSTRAINT fk_produk_kategori FOREIGN KEY (id_kategori)
    REFERENCES kategori(id_kategori) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_produk_stok (stok)
) ENGINE=InnoDB;

-- ---------- 5. PESANAN (nomor nota) ----------
CREATE TABLE pesanan (
  id_pesanan    INT AUTO_INCREMENT PRIMARY KEY,
  id_pelanggan  INT NOT NULL,
  tgl_masuk     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tgl_selesai   DATETIME NULL,
  status_cucian ENUM('diterima','dicuci','disetrika','siap','selesai')
                NOT NULL DEFAULT 'diterima',
  total         DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT ck_pesanan_total CHECK (total >= 0),
  CONSTRAINT fk_pesanan_pelanggan FOREIGN KEY (id_pelanggan)
    REFERENCES pelanggan(id_pelanggan) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_pesanan_tgl        (tgl_masuk),
  INDEX idx_pesanan_status_tgl (status_cucian, tgl_masuk),
  INDEX idx_pesanan_pel_tgl    (id_pelanggan, tgl_masuk)
) ENGINE=InnoDB AUTO_INCREMENT=101;

-- ---------- 6. DETAIL_LAYANAN (entitas asosiatif PESANAN - LAYANAN) ----------
-- subtotal = generated column: tidak mungkin tidak sinkron dengan jumlah x harga_satuan
CREATE TABLE detail_layanan (
  id_pesanan   INT NOT NULL,
  id_layanan   INT NOT NULL,
  jumlah       DECIMAL(6,2)  NOT NULL,
  harga_satuan DECIMAL(10,2) NOT NULL,
  subtotal     DECIMAL(12,2) AS (jumlah * harga_satuan) STORED,
  PRIMARY KEY (id_pesanan, id_layanan),
  CONSTRAINT ck_dl_jumlah CHECK (jumlah > 0),
  CONSTRAINT ck_dl_harga  CHECK (harga_satuan > 0),
  CONSTRAINT fk_dl_pesanan FOREIGN KEY (id_pesanan)
    REFERENCES pesanan(id_pesanan) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_dl_layanan FOREIGN KEY (id_layanan)
    REFERENCES layanan(id_layanan) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------- 7. DETAIL_PRODUK (entitas asosiatif PESANAN - PRODUK) ----------
CREATE TABLE detail_produk (
  id_pesanan   INT NOT NULL,
  id_produk    INT NOT NULL,
  qty          INT NOT NULL,
  harga_satuan DECIMAL(10,2) NOT NULL,
  subtotal     DECIMAL(12,2) AS (qty * harga_satuan) STORED,
  PRIMARY KEY (id_pesanan, id_produk),
  CONSTRAINT ck_dp_qty   CHECK (qty > 0),
  CONSTRAINT ck_dp_harga CHECK (harga_satuan > 0),
  CONSTRAINT fk_dp_pesanan FOREIGN KEY (id_pesanan)
    REFERENCES pesanan(id_pesanan) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_dp_produk FOREIGN KEY (id_produk)
    REFERENCES produk(id_produk) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------- 8. PEMBAYARAN (1:N dari pesanan) ----------
CREATE TABLE pembayaran (
  id_pembayaran INT AUTO_INCREMENT PRIMARY KEY,
  id_pesanan    INT NOT NULL,
  metode        ENUM('tunai','QRIS') NOT NULL,
  jumlah        DECIMAL(12,2) NOT NULL,
  tgl_bayar     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        ENUM('lunas','sebagian','batal') NOT NULL DEFAULT 'lunas',
  CONSTRAINT ck_bayar_jumlah CHECK (jumlah > 0),
  CONSTRAINT fk_bayar_pesanan FOREIGN KEY (id_pesanan)
    REFERENCES pesanan(id_pesanan) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_bayar_pesanan_status (id_pesanan, status)
) ENGINE=InnoDB;

-- ---------- 9. PENGIRIMAN (jemput/antar, paling banyak satu per jenis) ----------
CREATE TABLE pengiriman (
  id_pengiriman INT AUTO_INCREMENT PRIMARY KEY,
  id_pesanan    INT NOT NULL,
  jenis         ENUM('jemput','antar') NOT NULL,
  alamat        VARCHAR(255) NOT NULL,
  biaya         DECIMAL(10,2) NOT NULL DEFAULT 0,
  status        ENUM('dijadwalkan','dalam_perjalanan','selesai') NOT NULL DEFAULT 'dijadwalkan',
  CONSTRAINT ck_kirim_biaya CHECK (biaya >= 0),
  CONSTRAINT uq_pengiriman_pesanan_jenis UNIQUE (id_pesanan, jenis),
  CONSTRAINT fk_kirim_pesanan FOREIGN KEY (id_pesanan)
    REFERENCES pesanan(id_pesanan) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- 10. PENGELUARAN (biaya operasional, berdiri sendiri) ----------
CREATE TABLE pengeluaran (
  id_pengeluaran  INT AUTO_INCREMENT PRIMARY KEY,
  id_kategori     INT NOT NULL,
  tgl_pengeluaran DATE NOT NULL,
  keterangan      VARCHAR(255) NOT NULL,
  jumlah          DECIMAL(12,2) NOT NULL,
  metode          ENUM('tunai','QRIS','transfer') NOT NULL,
  CONSTRAINT ck_pengeluaran_jumlah CHECK (jumlah > 0),
  CONSTRAINT fk_pengeluaran_kategori FOREIGN KEY (id_kategori)
    REFERENCES kategori(id_kategori) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_pengeluaran_tgl (tgl_pengeluaran)
) ENGINE=InnoDB;

-- =====================================================================
-- DATA DUMMY (dimasukkan sebelum trigger dibuat; stok = stok akhir)
-- Nota 101-103 mengikuti contoh pada dokumen normalisasi Tahap 3 (Oktober).
-- Nota 104-109 disebar ke dua bulan (September: 104-107, Oktober: 108-109)
-- supaya rekap bulanan memuat lebih dari satu bulan.
-- =====================================================================
INSERT INTO pelanggan (nama, no_hp, alamat) VALUES
('Ni Made Sari', '081234567801', 'Jl. Ahmad Yani 12 Singaraja'),
('Gede Arta',    '081234567802', 'Jl. Sahadewa 3 Singaraja'),
('Kadek Rina',   '081234567803', 'Jl. Gajah Mada 21 Singaraja'),
('Putu Wirawan', '081234567804', 'Jl. Veteran 7 Singaraja'),
('Komang Ayu',   '081234567805', 'Jl. Pramuka 15 Singaraja');

INSERT INTO kategori (nama_kategori, jenis) VALUES
('Cuci Kiloan', 'LAYANAN'),      -- 1
('Deterjen',    'PRODUK'),       -- 2
('Pewangi',     'PRODUK'),       -- 3
('Listrik',     'PENGELUARAN'),  -- 4
('Air',         'PENGELUARAN'),  -- 5
('Konsumsi',    'PENGELUARAN'),  -- 6
('Sewa',        'PENGELUARAN'),  -- 7
('Deterjen',    'PENGELUARAN');  -- 8

INSERT INTO layanan (id_kategori, nama_layanan, harga, satuan, estimasi_hari) VALUES
(1, 'Cuci Setrika Reguler', 8000,  'kg', 3),
(1, 'Cuci Setrika Express', 15000, 'kg', 1),
(1, 'Setrika Saja',         7000,  'kg', 2);

INSERT INTO produk (id_kategori, nama_produk, harga, stok) VALUES
(2, 'Deterjen Bubuk', 12000, 40),
(3, 'Pewangi',        8000,  25),
(3, 'Pelembut',       9000,  3);

INSERT INTO pesanan (id_pesanan, id_pelanggan, tgl_masuk, tgl_selesai, status_cucian, total) VALUES
(101, 1, '2026-10-05 09:00:00', '2026-10-07 15:00:00', 'selesai',  0),
(102, 2, '2026-10-06 10:00:00', '2026-10-07 16:00:00', 'selesai',  0),
(103, 1, '2026-10-19 08:30:00', NULL,                  'dicuci',   0),
(104, 3, '2026-09-08 11:00:00', '2026-09-09 14:00:00', 'selesai',  0),
(105, 4, '2026-09-15 09:30:00', '2026-09-16 17:00:00', 'selesai',  0),
(106, 2, '2026-09-22 13:00:00', '2026-09-25 15:30:00', 'selesai',  0),
(107, 5, '2026-09-29 10:00:00', '2026-10-02 10:00:00', 'selesai',  0),
(108, 3, '2026-10-24 09:00:00', NULL,                  'siap',     0),
(109, 5, '2026-10-26 15:00:00', NULL,                  'diterima', 0);

INSERT INTO detail_layanan (id_pesanan, id_layanan, jumlah, harga_satuan) VALUES
(101, 1, 5, 7000),    -- harga lama: nota lama tidak berubah saat harga naik
(102, 2, 3, 15000),
(102, 3, 2, 7000),
(103, 1, 4, 8000),
(104, 2, 2, 15000),
(105, 2, 5, 15000),
(105, 1, 3, 8000),
(106, 1, 6, 8000),
(107, 1, 5, 8000),
(108, 2, 4, 15000),
(109, 1, 6, 8000);

INSERT INTO detail_produk (id_pesanan, id_produk, qty, harga_satuan) VALUES
(101, 1, 1, 12000),
(103, 1, 1, 12000),
(103, 2, 2, 8000),
(104, 1, 1, 12000),
(106, 1, 1, 12000),
(106, 2, 1, 8000);

INSERT INTO pengiriman (id_pesanan, jenis, alamat, biaya, status) VALUES
(101, 'antar',  'Jl. Ahmad Yani 12 Singaraja', 5000, 'selesai'),
(103, 'jemput', 'Jl. Ahmad Yani 12 Singaraja', 5000, 'selesai'),
(103, 'antar',  'Jl. Ahmad Yani 12 Singaraja', 5000, 'dijadwalkan');

-- total pesanan = subtotal layanan + subtotal produk + ongkir (diisi sekali di sini)
UPDATE pesanan p SET p.total =
  COALESCE((SELECT SUM(subtotal) FROM detail_layanan dl WHERE dl.id_pesanan = p.id_pesanan),0)
+ COALESCE((SELECT SUM(subtotal) FROM detail_produk  dp WHERE dp.id_pesanan = p.id_pesanan),0)
+ COALESCE((SELECT SUM(biaya)    FROM pengiriman     pg WHERE pg.id_pesanan = p.id_pesanan),0);

INSERT INTO pembayaran (id_pesanan, metode, jumlah, tgl_bayar, status) VALUES
(101, 'QRIS',  30000, '2026-10-05 09:10:00', 'sebagian'),
(101, 'tunai', 22000, '2026-10-07 15:05:00', 'lunas'),
(102, 'tunai', 59000, '2026-10-07 16:05:00', 'lunas'),
(104, 'tunai', 42000, '2026-09-09 14:05:00', 'lunas'),
(105, 'QRIS',  99000, '2026-09-16 17:05:00', 'lunas'),
(106, 'tunai', 68000, '2026-09-25 15:35:00', 'lunas'),
(107, 'tunai', 40000, '2026-10-02 10:05:00', 'lunas'),
(108, 'QRIS',  30000, '2026-10-24 09:10:00', 'sebagian');
-- pesanan 103 dan 109 belum dibayar sama sekali

INSERT INTO pengeluaran (id_kategori, tgl_pengeluaran, keterangan, jumlah, metode) VALUES
(6, '2026-09-01', 'Uang makan karyawan',        50000, 'tunai'),
(4, '2026-09-30', 'Tagihan listrik September', 85000, 'transfer'),
(5, '2026-09-30', 'Air bulan September',        30000, 'tunai'),
(6, '2026-10-01', 'Uang makan karyawan',        70000, 'tunai'),
(8, '2026-10-02', 'Deterjen curah 10 kg',       60000, 'tunai'),
(4, '2026-10-27', 'Tagihan listrik Oktober',    95000, 'transfer');

-- =====================================================================
-- FUNCTION, PROCEDURE, TRIGGER, VIEW
-- Dibuat SETELAH data dummy supaya trigger tidak mengubah data awal.
-- Pembagian tugas: database menjaga aturan bisnis (stok, total, batas
-- pembayaran, status); aplikasi hanya memanggil procedure.
-- =====================================================================
DELIMITER $$

-- ---------- FUNCTION (5) ----------

-- Sisa tagihan = total - pembayaran yang tidak batal
CREATE FUNCTION sisa_tagihan(p_id INT) RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(12,2);
  DECLARE v_bayar DECIMAL(12,2);
  SELECT total INTO v_total FROM pesanan WHERE id_pesanan = p_id;
  IF v_total IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(SUM(jumlah), 0) INTO v_bayar
    FROM pembayaran WHERE id_pesanan = p_id AND status <> 'batal';
  RETURN v_total - v_bayar;
END$$

-- Total pesanan = subtotal layanan + subtotal produk + ongkir
CREATE FUNCTION hitung_total_pesanan(p_id INT) RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
  RETURN COALESCE((SELECT SUM(subtotal) FROM detail_layanan WHERE id_pesanan = p_id), 0)
       + COALESCE((SELECT SUM(subtotal) FROM detail_produk  WHERE id_pesanan = p_id), 0)
       + COALESCE((SELECT SUM(biaya)    FROM pengiriman     WHERE id_pesanan = p_id), 0);
END$$

-- Omzet = jumlah total pesanan yang masuk pada rentang tanggal (sargable)
CREATE FUNCTION omzet_periode(p_dari DATE, p_sampai DATE) RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
  RETURN COALESCE((SELECT SUM(total) FROM pesanan
                    WHERE tgl_masuk >= p_dari
                      AND tgl_masuk <  DATE_ADD(p_sampai, INTERVAL 1 DAY)), 0);
END$$

CREATE FUNCTION pengeluaran_periode(p_dari DATE, p_sampai DATE) RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
  RETURN COALESCE((SELECT SUM(jumlah) FROM pengeluaran
                    WHERE tgl_pengeluaran BETWEEN p_dari AND p_sampai), 0);
END$$

CREATE FUNCTION laba_periode(p_dari DATE, p_sampai DATE) RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
  RETURN omzet_periode(p_dari, p_sampai) - pengeluaran_periode(p_dari, p_sampai);
END$$

-- ---------- PROCEDURE (11) ----------

-- 1. Menyegarkan kolom pesanan.total (dipanggil oleh trigger)
CREATE PROCEDURE refresh_total(IN p_id INT)
BEGIN
  UPDATE pesanan SET total = hitung_total_pesanan(p_id) WHERE id_pesanan = p_id;
END$$

-- 2. Membuat pesanan kosong; id baru lewat parameter OUT
CREATE PROCEDURE buat_pesanan(IN p_pelanggan INT, OUT p_id INT)
BEGIN
  INSERT INTO pesanan (id_pelanggan) VALUES (p_pelanggan);
  SET p_id = LAST_INSERT_ID();
END$$

-- 3. Menambah layanan; harga diambil dari tabel layanan lalu disalin
CREATE PROCEDURE tambah_layanan(IN p_pesanan INT, IN p_layanan INT, IN p_jumlah DECIMAL(6,2))
BEGIN
  DECLARE v_harga DECIMAL(10,2);
  SELECT harga INTO v_harga FROM layanan WHERE id_layanan = p_layanan;
  IF v_harga IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Layanan tidak ditemukan';
  END IF;
  INSERT INTO detail_layanan (id_pesanan, id_layanan, jumlah, harga_satuan)
  VALUES (p_pesanan, p_layanan, p_jumlah, v_harga);
END$$

-- 4. Menambah produk; stok dicek dan dikurangi oleh trigger
CREATE PROCEDURE tambah_produk(IN p_pesanan INT, IN p_produk INT, IN p_qty INT)
BEGIN
  DECLARE v_harga DECIMAL(10,2);
  SELECT harga INTO v_harga FROM produk WHERE id_produk = p_produk;
  IF v_harga IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Produk tidak ditemukan';
  END IF;
  INSERT INTO detail_produk (id_pesanan, id_produk, qty, harga_satuan)
  VALUES (p_pesanan, p_produk, p_qty, v_harga);
END$$

-- 5. Menambah pengiriman (ongkir ikut total lewat trigger)
CREATE PROCEDURE tambah_pengiriman(IN p_pesanan INT, IN p_jenis VARCHAR(10),
                                   IN p_alamat VARCHAR(255), IN p_biaya DECIMAL(10,2))
BEGIN
  INSERT INTO pengiriman (id_pesanan, jenis, alamat, biaya)
  VALUES (p_pesanan, p_jenis, p_alamat, p_biaya);
END$$

-- 6. Mengubah status cucian (aturan maju-saja dijaga trigger)
CREATE PROCEDURE ubah_status_cucian(IN p_pesanan INT, IN p_status VARCHAR(10))
BEGIN
  UPDATE pesanan SET status_cucian = p_status WHERE id_pesanan = p_pesanan;
END$$

-- 7. Mencatat pembayaran dalam SATU transaksi (ACID); baris pesanan dikunci
CREATE PROCEDURE catat_pembayaran(IN p_pesanan INT, IN p_jumlah DECIMAL(12,2), IN p_metode VARCHAR(10))
BEGIN
  DECLARE v_total DECIMAL(12,2);
  DECLARE v_sisa  DECIMAL(12,2);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT total INTO v_total FROM pesanan WHERE id_pesanan = p_pesanan FOR UPDATE;
  IF v_total IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pesanan tidak ditemukan';
  END IF;
  IF p_jumlah <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jumlah pembayaran harus lebih dari 0';
  END IF;
  SET v_sisa = sisa_tagihan(p_pesanan);
  IF v_sisa <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pesanan ini sudah lunas';
  END IF;
  IF p_jumlah > v_sisa THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jumlah melebihi sisa tagihan';
  END IF;
  INSERT INTO pembayaran (id_pesanan, metode, jumlah, status)
  VALUES (p_pesanan, p_metode, p_jumlah, IF(p_jumlah >= v_sisa, 'lunas', 'sebagian'));
  COMMIT;
END$$

-- 8. Pembayaran tidak dihapus/diubah; hanya dibatalkan (jejak audit tetap ada)
CREATE PROCEDURE batalkan_pembayaran(IN p_id_pembayaran INT)
BEGIN
  DECLARE v_pesanan INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT id_pesanan INTO v_pesanan FROM pembayaran
   WHERE id_pembayaran = p_id_pembayaran AND status <> 'batal' FOR UPDATE;
  IF v_pesanan IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pembayaran tidak ditemukan atau sudah batal';
  END IF;
  UPDATE pembayaran SET status = 'batal' WHERE id_pembayaran = p_id_pembayaran;
  COMMIT;
END$$

-- 9. Mencatat pengeluaran operasional
CREATE PROCEDURE catat_pengeluaran(IN p_kategori INT, IN p_tgl DATE, IN p_ket VARCHAR(255),
                                   IN p_jumlah DECIMAL(12,2), IN p_metode VARCHAR(10))
BEGIN
  INSERT INTO pengeluaran (id_kategori, tgl_pengeluaran, keterangan, jumlah, metode)
  VALUES (p_kategori, p_tgl, p_ket, p_jumlah, p_metode);
END$$

-- 10. Laporan omzet, pengeluaran, dan laba pada rentang tanggal
CREATE PROCEDURE laporan_omzet(IN p_dari DATE, IN p_sampai DATE)
BEGIN
  SELECT
    (SELECT COUNT(*) FROM pesanan
      WHERE tgl_masuk >= p_dari AND tgl_masuk < DATE_ADD(p_sampai, INTERVAL 1 DAY)) AS jumlah_pesanan,
    omzet_periode(p_dari, p_sampai)       AS omzet,
    pengeluaran_periode(p_dari, p_sampai) AS pengeluaran,
    laba_periode(p_dari, p_sampai)        AS laba;
END$$

-- 11. Pencarian pelanggan: kata kunci dikirim sebagai PARAMETER, bukan
--     disambung ke string SQL (contoh pencegahan SQL injection di sisi DB)
CREATE PROCEDURE cari_pelanggan(IN p_kata VARCHAR(100))
BEGIN
  SELECT id_pelanggan, nama, no_hp, alamat
    FROM pelanggan
   WHERE nama LIKE CONCAT('%', p_kata, '%') OR no_hp LIKE CONCAT('%', p_kata, '%')
   ORDER BY nama
   LIMIT 50;
END$$

-- ---------- TRIGGER ----------

-- kategori: jenis tidak boleh diubah selama masih dipakai
CREATE TRIGGER trg_kategori_bu BEFORE UPDATE ON kategori FOR EACH ROW
BEGIN
  IF NEW.jenis <> OLD.jenis AND (
       EXISTS (SELECT 1 FROM layanan     WHERE id_kategori = OLD.id_kategori)
    OR EXISTS (SELECT 1 FROM produk      WHERE id_kategori = OLD.id_kategori)
    OR EXISTS (SELECT 1 FROM pengeluaran WHERE id_kategori = OLD.id_kategori)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jenis kategori tidak dapat diubah karena masih dipakai';
  END IF;
END$$

-- layanan, produk, pengeluaran: jenis kategori harus sesuai
CREATE TRIGGER trg_layanan_bi BEFORE INSERT ON layanan FOR EACH ROW
BEGIN
  DECLARE v_j VARCHAR(12);
  SELECT jenis INTO v_j FROM kategori WHERE id_kategori = NEW.id_kategori;
  IF v_j IS NOT NULL AND v_j <> 'LAYANAN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jenis kategori tidak sesuai dengan data yang disimpan';
  END IF;
END$$

CREATE TRIGGER trg_layanan_bu BEFORE UPDATE ON layanan FOR EACH ROW
BEGIN
  DECLARE v_j VARCHAR(12);
  SELECT jenis INTO v_j FROM kategori WHERE id_kategori = NEW.id_kategori;
  IF v_j IS NOT NULL AND v_j <> 'LAYANAN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jenis kategori tidak sesuai dengan data yang disimpan';
  END IF;
END$$

CREATE TRIGGER trg_produk_bi BEFORE INSERT ON produk FOR EACH ROW
BEGIN
  DECLARE v_j VARCHAR(12);
  SELECT jenis INTO v_j FROM kategori WHERE id_kategori = NEW.id_kategori;
  IF v_j IS NOT NULL AND v_j <> 'PRODUK' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jenis kategori tidak sesuai dengan data yang disimpan';
  END IF;
END$$

CREATE TRIGGER trg_produk_bu BEFORE UPDATE ON produk FOR EACH ROW
BEGIN
  DECLARE v_j VARCHAR(12);
  SELECT jenis INTO v_j FROM kategori WHERE id_kategori = NEW.id_kategori;
  IF v_j IS NOT NULL AND v_j <> 'PRODUK' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jenis kategori tidak sesuai dengan data yang disimpan';
  END IF;
END$$

CREATE TRIGGER trg_pengeluaran_bi BEFORE INSERT ON pengeluaran FOR EACH ROW
BEGIN
  DECLARE v_j VARCHAR(12);
  SELECT jenis INTO v_j FROM kategori WHERE id_kategori = NEW.id_kategori;
  IF v_j IS NOT NULL AND v_j <> 'PENGELUARAN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jenis kategori tidak sesuai dengan data yang disimpan';
  END IF;
END$$

CREATE TRIGGER trg_pengeluaran_bu BEFORE UPDATE ON pengeluaran FOR EACH ROW
BEGIN
  DECLARE v_j VARCHAR(12);
  SELECT jenis INTO v_j FROM kategori WHERE id_kategori = NEW.id_kategori;
  IF v_j IS NOT NULL AND v_j <> 'PENGELUARAN' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jenis kategori tidak sesuai dengan data yang disimpan';
  END IF;
END$$

-- detail_layanan: total ikut diperbarui; kunci rincian tidak boleh diubah
CREATE TRIGGER trg_dl_ai AFTER INSERT ON detail_layanan FOR EACH ROW
BEGIN
  CALL refresh_total(NEW.id_pesanan);
END$$

CREATE TRIGGER trg_dl_bu BEFORE UPDATE ON detail_layanan FOR EACH ROW
BEGIN
  IF NEW.id_pesanan <> OLD.id_pesanan OR NEW.id_layanan <> OLD.id_layanan THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kunci rincian tidak boleh diubah; hapus lalu tambah baris baru';
  END IF;
END$$

CREATE TRIGGER trg_dl_au AFTER UPDATE ON detail_layanan FOR EACH ROW
BEGIN
  CALL refresh_total(NEW.id_pesanan);
END$$

CREATE TRIGGER trg_dl_ad AFTER DELETE ON detail_layanan FOR EACH ROW
BEGIN
  CALL refresh_total(OLD.id_pesanan);
END$$

-- detail_produk: cek stok, kurangi stok, perbarui total
CREATE TRIGGER trg_dp_bi BEFORE INSERT ON detail_produk FOR EACH ROW
BEGIN
  DECLARE v_stok INT;
  SELECT stok INTO v_stok FROM produk WHERE id_produk = NEW.id_produk FOR UPDATE;
  IF v_stok IS NULL OR v_stok < NEW.qty THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stok produk tidak cukup';
  END IF;
END$$

CREATE TRIGGER trg_dp_ai AFTER INSERT ON detail_produk FOR EACH ROW
BEGIN
  UPDATE produk SET stok = stok - NEW.qty WHERE id_produk = NEW.id_produk;
  CALL refresh_total(NEW.id_pesanan);
END$$

CREATE TRIGGER trg_dp_bu BEFORE UPDATE ON detail_produk FOR EACH ROW
BEGIN
  DECLARE v_stok INT;
  IF NEW.id_pesanan <> OLD.id_pesanan OR NEW.id_produk <> OLD.id_produk THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Kunci rincian tidak boleh diubah; hapus lalu tambah baris baru';
  END IF;
  SELECT stok INTO v_stok FROM produk WHERE id_produk = OLD.id_produk FOR UPDATE;
  IF v_stok + OLD.qty < NEW.qty THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stok produk tidak cukup';
  END IF;
END$$

CREATE TRIGGER trg_dp_au AFTER UPDATE ON detail_produk FOR EACH ROW
BEGIN
  UPDATE produk SET stok = stok + OLD.qty - NEW.qty WHERE id_produk = NEW.id_produk;
  CALL refresh_total(NEW.id_pesanan);
END$$

CREATE TRIGGER trg_dp_ad AFTER DELETE ON detail_produk FOR EACH ROW
BEGIN
  UPDATE produk SET stok = stok + OLD.qty WHERE id_produk = OLD.id_produk;
  CALL refresh_total(OLD.id_pesanan);
END$$

-- pengiriman: ongkir ikut dihitung dalam total
CREATE TRIGGER trg_kirim_ai AFTER INSERT ON pengiriman FOR EACH ROW
BEGIN
  CALL refresh_total(NEW.id_pesanan);
END$$

CREATE TRIGGER trg_kirim_au AFTER UPDATE ON pengiriman FOR EACH ROW
BEGIN
  CALL refresh_total(NEW.id_pesanan);
END$$

CREATE TRIGGER trg_kirim_ad AFTER DELETE ON pengiriman FOR EACH ROW
BEGIN
  CALL refresh_total(OLD.id_pesanan);
END$$

-- pembayaran: tolak melebihi sisa; tidak boleh dihapus; hanya boleh dibatalkan
CREATE TRIGGER trg_bayar_bi BEFORE INSERT ON pembayaran FOR EACH ROW
BEGIN
  IF NEW.status <> 'batal' AND NEW.jumlah > sisa_tagihan(NEW.id_pesanan) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pembayaran melebihi sisa tagihan';
  END IF;
END$$

CREATE TRIGGER trg_bayar_bu BEFORE UPDATE ON pembayaran FOR EACH ROW
BEGIN
  IF NEW.id_pesanan <> OLD.id_pesanan OR NEW.jumlah <> OLD.jumlah
     OR NEW.metode <> OLD.metode OR NEW.tgl_bayar <> OLD.tgl_bayar
     OR NOT (OLD.status <> 'batal' AND NEW.status = 'batal') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Data pembayaran tidak boleh diubah; batalkan lalu catat ulang';
  END IF;
END$$

CREATE TRIGGER trg_bayar_bd BEFORE DELETE ON pembayaran FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pembayaran tidak boleh dihapus; gunakan pembatalan';
END$$

-- pesanan: status hanya maju, tgl_selesai otomatis, minimal satu layanan
CREATE TRIGGER trg_pesanan_bu BEFORE UPDATE ON pesanan FOR EACH ROW
BEGIN
  IF NEW.status_cucian + 0 < OLD.status_cucian + 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Status cucian tidak boleh mundur';
  END IF;
  IF OLD.status_cucian = 'diterima' AND NEW.status_cucian <> 'diterima'
     AND NOT EXISTS (SELECT 1 FROM detail_layanan WHERE id_pesanan = OLD.id_pesanan) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Pesanan harus memuat minimal satu layanan sebelum diproses';
  END IF;
  IF NEW.status_cucian = 'selesai' AND OLD.status_cucian <> 'selesai'
     AND NEW.tgl_selesai IS NULL THEN
    SET NEW.tgl_selesai = NOW();
  END IF;
END$$

-- Hapus pesanan: stok produk dikembalikan. Penting: aksi CASCADE pada foreign
-- key TIDAK mengaktifkan trigger di MySQL, jadi pengembalian stok dilakukan
-- di sini, sebelum baris rincian ikut terhapus oleh CASCADE.
CREATE TRIGGER trg_pesanan_bd BEFORE DELETE ON pesanan FOR EACH ROW
BEGIN
  UPDATE produk pr
    JOIN detail_produk dp ON dp.id_produk = pr.id_produk
     SET pr.stok = pr.stok + dp.qty
   WHERE dp.id_pesanan = OLD.id_pesanan;
END$$

DELIMITER ;

-- ---------- VIEW (8) ----------

-- Nota lengkap: estimasi layanan terlama vs durasi sebenarnya
CREATE VIEW v_nota AS
SELECT p.id_pesanan, pl.nama AS pelanggan, p.tgl_masuk, p.tgl_selesai, p.status_cucian, p.total,
       (SELECT MAX(l.estimasi_hari) FROM detail_layanan dl
          JOIN layanan l ON l.id_layanan = dl.id_layanan
         WHERE dl.id_pesanan = p.id_pesanan)       AS estimasi_hari,
       DATEDIFF(p.tgl_selesai, p.tgl_masuk)       AS durasi_hari,
       sisa_tagihan(p.id_pesanan)                 AS sisa
  FROM pesanan p
  JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan;

CREATE VIEW v_pesanan_belum_lunas AS
SELECT p.id_pesanan, pl.nama, pl.no_hp, p.status_cucian, p.tgl_masuk, p.total,
       p.total - sisa_tagihan(p.id_pesanan) AS dibayar,
       sisa_tagihan(p.id_pesanan)           AS sisa
  FROM pesanan p
  JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
 WHERE sisa_tagihan(p.id_pesanan) > 0;

CREATE VIEW v_stok_menipis AS
SELECT pr.id_produk, pr.nama_produk, k.nama_kategori, pr.stok
  FROM produk pr
  JOIN kategori k ON k.id_kategori = pr.id_kategori
 WHERE pr.stok < 5;

CREATE VIEW v_omzet_bulanan AS
SELECT bulan,
       SUM(layanan) AS omzet_layanan,
       SUM(produk)  AS omzet_produk,
       SUM(ongkir)  AS ongkir
  FROM (
        SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m') AS bulan, x.subtotal AS layanan, 0 AS produk, 0 AS ongkir
          FROM detail_layanan x JOIN pesanan p ON p.id_pesanan = x.id_pesanan
        UNION ALL
        SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m'), 0, x.subtotal, 0
          FROM detail_produk x JOIN pesanan p ON p.id_pesanan = x.id_pesanan
        UNION ALL
        SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m'), 0, 0, x.biaya
          FROM pengiriman x JOIN pesanan p ON p.id_pesanan = x.id_pesanan
       ) t
 GROUP BY bulan;

-- Laba bulanan = omzet (total pesanan) - pengeluaran
CREATE VIEW v_laba_bulanan AS
SELECT bulan, SUM(omzet) AS omzet, SUM(biaya) AS pengeluaran, SUM(omzet) - SUM(biaya) AS laba
  FROM (
        SELECT DATE_FORMAT(tgl_masuk, '%Y-%m') AS bulan, total AS omzet, 0 AS biaya FROM pesanan
        UNION ALL
        SELECT DATE_FORMAT(tgl_pengeluaran, '%Y-%m'), 0, jumlah FROM pengeluaran
       ) t
 GROUP BY bulan;

-- GENERALISASI: layanan dan produk dipandang sebagai satu supertipe "item jual"
CREATE VIEW v_item_jual AS
SELECT 'LAYANAN' AS tipe, id_layanan AS id_item, nama_layanan AS nama, harga, satuan FROM layanan
UNION ALL
SELECT 'PRODUK', id_produk, nama_produk, harga, 'pcs' FROM produk;

-- Rincian seluruh isi nota (layanan + produk) dalam satu bentuk
CREATE VIEW v_rincian_pesanan AS
SELECT dl.id_pesanan, 'LAYANAN' AS tipe, l.nama_layanan AS nama,
       dl.jumlah, dl.harga_satuan, dl.subtotal
  FROM detail_layanan dl JOIN layanan l ON l.id_layanan = dl.id_layanan
UNION ALL
SELECT dp.id_pesanan, 'PRODUK', pr.nama_produk, dp.qty, dp.harga_satuan, dp.subtotal
  FROM detail_produk dp JOIN produk pr ON pr.id_produk = dp.id_produk;

-- Data pelanggan dengan nomor HP disamarkan, untuk peran laporan
CREATE VIEW v_pelanggan_samar AS
SELECT id_pelanggan, nama,
       CONCAT(LEFT(no_hp, 4), '****', RIGHT(no_hp, 3)) AS no_hp_samar
  FROM pelanggan;

-- =====================================================================
-- KEAMANAN: peran (role) dan pengguna dengan hak minimum
-- Kata sandi di bawah hanya contoh: GANTI sebelum dipakai sungguhan.
-- Aplikasi TIDAK memakai root; tiap pengguna hanya menerima yang dibutuhkan.
-- =====================================================================
DROP USER IF EXISTS 'app_kasir'@'localhost', 'app_laporan'@'localhost', 'app_pemilik'@'localhost';
DROP ROLE IF EXISTS 'role_kasir', 'role_laporan', 'role_pemilik';
CREATE ROLE 'role_kasir', 'role_laporan', 'role_pemilik';

-- Kasir: melihat nota dan master data, memanggil procedure transaksi
GRANT SELECT ON laundry_db.v_nota               TO 'role_kasir';
GRANT SELECT ON laundry_db.v_pesanan_belum_lunas TO 'role_kasir';
GRANT SELECT ON laundry_db.v_stok_menipis       TO 'role_kasir';
GRANT SELECT ON laundry_db.v_rincian_pesanan    TO 'role_kasir';
GRANT SELECT ON laundry_db.v_item_jual          TO 'role_kasir';
GRANT SELECT, INSERT, UPDATE ON laundry_db.pelanggan TO 'role_kasir';
GRANT EXECUTE ON PROCEDURE laundry_db.buat_pesanan        TO 'role_kasir';
GRANT EXECUTE ON PROCEDURE laundry_db.tambah_layanan      TO 'role_kasir';
GRANT EXECUTE ON PROCEDURE laundry_db.tambah_produk       TO 'role_kasir';
GRANT EXECUTE ON PROCEDURE laundry_db.tambah_pengiriman   TO 'role_kasir';
GRANT EXECUTE ON PROCEDURE laundry_db.ubah_status_cucian  TO 'role_kasir';
GRANT EXECUTE ON PROCEDURE laundry_db.catat_pembayaran    TO 'role_kasir';
GRANT EXECUTE ON PROCEDURE laundry_db.cari_pelanggan      TO 'role_kasir';
GRANT EXECUTE ON FUNCTION  laundry_db.sisa_tagihan        TO 'role_kasir';

-- Laporan: hanya membaca ringkasan; nomor HP disamarkan
GRANT SELECT ON laundry_db.v_omzet_bulanan   TO 'role_laporan';
GRANT SELECT ON laundry_db.v_laba_bulanan    TO 'role_laporan';
GRANT SELECT ON laundry_db.v_pelanggan_samar TO 'role_laporan';
GRANT SELECT ON laundry_db.v_stok_menipis    TO 'role_laporan';
GRANT EXECUTE ON FUNCTION laundry_db.omzet_periode       TO 'role_laporan';
GRANT EXECUTE ON FUNCTION laundry_db.pengeluaran_periode TO 'role_laporan';
GRANT EXECUTE ON FUNCTION laundry_db.laba_periode        TO 'role_laporan';

-- Pemilik: semua peran di atas + baca semua tabel + kelola pengeluaran/pembatalan
GRANT 'role_kasir', 'role_laporan' TO 'role_pemilik';
GRANT SELECT ON laundry_db.* TO 'role_pemilik';
GRANT EXECUTE ON PROCEDURE laundry_db.catat_pengeluaran    TO 'role_pemilik';
GRANT EXECUTE ON PROCEDURE laundry_db.batalkan_pembayaran  TO 'role_pemilik';
GRANT EXECUTE ON PROCEDURE laundry_db.laporan_omzet        TO 'role_pemilik';

CREATE USER 'app_kasir'@'localhost'   IDENTIFIED BY 'Ganti_Kasir#2026';
CREATE USER 'app_laporan'@'localhost' IDENTIFIED BY 'Ganti_Laporan#2026';
CREATE USER 'app_pemilik'@'localhost' IDENTIFIED BY 'Ganti_Pemilik#2026';
GRANT 'role_kasir'   TO 'app_kasir'@'localhost';
GRANT 'role_laporan' TO 'app_laporan'@'localhost';
GRANT 'role_pemilik' TO 'app_pemilik'@'localhost';
SET DEFAULT ROLE ALL TO 'app_kasir'@'localhost', 'app_laporan'@'localhost', 'app_pemilik'@'localhost';

-- =====================================================================
-- CONTOH PEMAKAIAN
-- =====================================================================
SELECT sisa_tagihan(103) AS sisa_pesanan_103;
SELECT * FROM v_pesanan_belum_lunas;
SELECT * FROM v_stok_menipis;
SELECT * FROM v_laba_bulanan;
CALL laporan_omzet('2026-10-01', '2026-10-31');

-- Alur membuat pesanan lengkap (hapus tanda komentar untuk mencoba):
-- CALL buat_pesanan(1, @id);
-- CALL tambah_layanan(@id, 1, 3);           -- 3 kg cuci setrika reguler
-- CALL tambah_produk(@id, 1, 2);            -- 2 deterjen (stok berkurang otomatis)
-- SELECT * FROM v_rincian_pesanan WHERE id_pesanan = @id;
-- CALL catat_pembayaran(@id, 20000, 'QRIS');    -- sebagian
-- CALL catat_pembayaran(@id, 28000, 'tunai');   -- melunasi
-- CALL catat_pembayaran(@id, 1000, 'tunai');    -- ditolak: sudah lunas

-- =====================================================================
-- QUERY ANALITIK (menjawab kebutuhan informasi Tahap 1)
-- =====================================================================

-- Q1. 5 layanan terlaris (berdasarkan omzet)
SELECT l.nama_layanan, SUM(dl.jumlah) AS total_jumlah, SUM(dl.subtotal) AS omzet
FROM detail_layanan dl
JOIN layanan l ON l.id_layanan = dl.id_layanan
GROUP BY l.id_layanan, l.nama_layanan
ORDER BY omzet DESC
LIMIT 5;

-- Q2. Pelanggan dengan total belanja > 50.000 (HAVING)
SELECT pl.nama, COUNT(p.id_pesanan) AS jml_pesanan, SUM(p.total) AS total_belanja
FROM pelanggan pl
JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
GROUP BY pl.id_pelanggan, pl.nama
HAVING SUM(p.total) > 50000
ORDER BY total_belanja DESC;

-- Q3. Produk yang belum pernah terjual (LEFT JOIN + IS NULL)
SELECT pr.nama_produk
FROM produk pr
LEFT JOIN detail_produk dp ON dp.id_produk = pr.id_produk
WHERE dp.id_produk IS NULL;

-- Q4. Pesanan telat dari estimasi layanan terlama
SELECT id_pesanan, estimasi_hari, durasi_hari FROM v_nota
WHERE durasi_hari > estimasi_hari;

-- Q5. Pengeluaran per kategori pada Oktober 2026
SELECT k.nama_kategori, SUM(pg.jumlah) AS total
FROM pengeluaran pg
JOIN kategori k ON k.id_kategori = pg.id_kategori
WHERE pg.tgl_pengeluaran >= '2026-10-01' AND pg.tgl_pengeluaran < '2026-11-01'
GROUP BY k.id_kategori, k.nama_kategori
ORDER BY total DESC;

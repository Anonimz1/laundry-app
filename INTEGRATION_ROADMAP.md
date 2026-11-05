# Integration Roadmap: Aligning Prisma Project dengan SQL Requirements
## Clean Up Laundry Database Project

---

## Executive Summary

Project Anda saat ini menggunakan **Prisma ORM + Node.js**, sedangkan requirement dari file "baca ini untuk step basis data" mengharapkan **implementasi SQL lengkap** dengan:
- Stored Functions (5)
- Stored Procedures (11)
- Triggers (20+)
- Views (8)
- Query Analitik (A1-A17)
- Role-based Security

**Pendekatan:** Hybrid approach - tetap gunakan Prisma untuk development velocity, tapi tambahkan SQL native untuk requirement akademik.

---

## Phase 1: Database Schema Alignment

### 1.1 Current vs Required Schema Comparison

| Aspect | Current (Prisma) | Required (SQL) | Status | Action |
|--------|------------------|----------------|--------|--------|
| Tables | 10 tables ✓ | 10 tables ✓ | ✅ Match | None |
| Enums | 7 enums | 7 enums | ✅ Match | None |
| Foreign Keys | Basic | With ON DELETE behavior | ⚠️ Partial | Add specific DELETE rules |
| Indexes | Basic | Composite indexes | ⚠️ Missing | Add performance indexes |
| Generated Columns | None | `subtotal` as GENERATED | ❌ Missing | Add GENERATED columns |
| Functions | None | 5 functions | ❌ Missing | Create migration |
| Procedures | None | 11 procedures | ❌ Missing | Create migration |
| Triggers | None | 20+ triggers | ❌ Missing | Create migration |
| Views | None | 8 views | ❌ Missing | Create migration |
| Users & Roles | None | 3 roles, 3 users | ❌ Missing | Create setup script |

### 1.2 Schema Enhancement Steps

**Step 1: Update Prisma Schema untuk Match SQL Requirements**

Create: `prisma/schema-final.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// Catatan: Schema ini generate table structure yang compatible dengan SQL requirements
// Setelah migration, kita akan add functions/procedures/triggers via raw SQL

model Pelanggan {
  id_pelanggan Int       @id @default(autoincrement())
  nama         String    @db.VarChar(100)
  no_hp        String    @unique @db.VarChar(15)
  alamat       String    @db.VarChar(255)
  created_at   DateTime  @default(now())
  
  pesanan      Pesanan[]

  @@index([nama], map: "idx_pelanggan_nama")
  @@map("pelanggan")
}

model Kategori {
  id_kategori   Int              @id @default(autoincrement())
  nama_kategori String           @db.VarChar(50)
  jenis         JenisKategori
  
  layanan       Layanan[]
  produk        Produk[]
  pengeluaran   Pengeluaran[]

  @@unique([nama_kategori, jenis], map: "uq_kategori_nama_jenis")
  @@map("kategori")
}

model Layanan {
  id_layanan     Int              @id @default(autoincrement())
  id_kategori    Int
  nama_layanan   String           @db.VarChar(100)
  harga          Decimal          @db.Decimal(10, 2)
  satuan         SatuanLayanan
  estimasi_hari  Int              @default(2) @db.TinyInt
  
  kategori       Kategori         @relation(fields: [id_kategori], references: [id_kategori], onUpdate: Cascade, onDelete: Restrict, map: "fk_layanan_kategori")
  detail_layanan DetailLayanan[]

  @@map("layanan")
}

model Produk {
  id_produk     Int            @id @default(autoincrement())
  id_kategori   Int
  nama_produk   String         @db.VarChar(100)
  harga         Decimal        @db.Decimal(10, 2)
  stok          Int            @default(0)
  
  kategori      Kategori       @relation(fields: [id_kategori], references: [id_kategori], onUpdate: Cascade, onDelete: Restrict, map: "fk_produk_kategori")
  detail_produk DetailProduk[]

  @@index([stok], map: "idx_produk_stok")
  @@map("produk")
}

model Pesanan {
  id_pesanan     Int             @id @default(autoincrement())
  id_pelanggan   Int
  tgl_masuk      DateTime        @default(now())
  tgl_selesai    DateTime?
  status_cucian  StatusCucian    @default(diterima)
  total          Decimal         @default(0) @db.Decimal(12, 2)
  
  pelanggan      Pelanggan       @relation(fields: [id_pelanggan], references: [id_pelanggan], onUpdate: Cascade, onDelete: Restrict, map: "fk_pesanan_pelanggan")
  detail_layanan DetailLayanan[]
  detail_produk  DetailProduk[]
  pembayaran     Pembayaran[]
  pengiriman     Pengiriman[]

  @@index([tgl_masuk], map: "idx_pesanan_tgl")
  @@index([status_cucian, tgl_masuk], map: "idx_pesanan_status_tgl")
  @@index([id_pelanggan, tgl_masuk], map: "idx_pesanan_pel_tgl")
  @@map("pesanan")
}

// IMPORTANT: subtotal sebagai GENERATED COLUMN (sesuai SQL requirement)
// Prisma tidak support GENERATED COLUMN di schema level, jadi kita add via raw SQL migration
model DetailLayanan {
  id_pesanan   Int
  id_layanan   Int
  jumlah       Decimal  @db.Decimal(6, 2)
  harga_satuan Decimal  @db.Decimal(10, 2)
  subtotal     Decimal  @db.Decimal(12, 2) // Will be GENERATED via migration
  
  pesanan      Pesanan  @relation(fields: [id_pesanan], references: [id_pesanan], onUpdate: Cascade, onDelete: Cascade, map: "fk_dl_pesanan")
  layanan      Layanan  @relation(fields: [id_layanan], references: [id_layanan], onUpdate: Cascade, onDelete: Restrict, map: "fk_dl_layanan")

  @@id([id_pesanan, id_layanan])
  @@map("detail_layanan")
}

model DetailProduk {
  id_pesanan   Int
  id_produk    Int
  qty          Int
  harga_satuan Decimal  @db.Decimal(10, 2)
  subtotal     Decimal  @db.Decimal(12, 2) // Will be GENERATED via migration
  
  pesanan      Pesanan  @relation(fields: [id_pesanan], references: [id_pesanan], onUpdate: Cascade, onDelete: Cascade, map: "fk_dp_pesanan")
  produk       Produk   @relation(fields: [id_produk], references: [id_produk], onUpdate: Cascade, onDelete: Restrict, map: "fk_dp_produk")

  @@id([id_pesanan, id_produk])
  @@map("detail_produk")
}

model Pembayaran {
  id_pembayaran Int              @id @default(autoincrement())
  id_pesanan    Int
  metode        MetodePembayaran
  jumlah        Decimal          @db.Decimal(12, 2)
  tgl_bayar     DateTime         @default(now())
  status        StatusPembayaran @default(lunas)
  
  pesanan       Pesanan          @relation(fields: [id_pesanan], references: [id_pesanan], onUpdate: Cascade, onDelete: Restrict, map: "fk_bayar_pesanan")

  @@index([id_pesanan, status], map: "idx_bayar_pesanan_status")
  @@map("pembayaran")
}

model Pengiriman {
  id_pengiriman Int              @id @default(autoincrement())
  id_pesanan    Int
  jenis         JenisPengiriman
  alamat        String           @db.VarChar(255)
  biaya         Decimal          @default(0) @db.Decimal(10, 2)
  status        StatusPengiriman @default(dijadwalkan)
  
  pesanan       Pesanan          @relation(fields: [id_pesanan], references: [id_pesanan], onUpdate: Cascade, onDelete: Cascade, map: "fk_kirim_pesanan")

  @@unique([id_pesanan, jenis], map: "uq_pengiriman_pesanan_jenis")
  @@map("pengiriman")
}

model Pengeluaran {
  id_pengeluaran  Int              @id @default(autoincrement())
  id_kategori     Int
  tgl_pengeluaran DateTime         @db.Date
  keterangan      String           @db.VarChar(255)
  jumlah          Decimal          @db.Decimal(12, 2)
  metode          MetodePembayaran
  
  kategori        Kategori         @relation(fields: [id_kategori], references: [id_kategori], onUpdate: Cascade, onDelete: Restrict, map: "fk_pengeluaran_kategori")

  @@index([tgl_pengeluaran], map: "idx_pengeluaran_tgl")
  @@map("pengeluaran")
}

// Enums
enum JenisKategori {
  LAYANAN
  PRODUK
  PENGELUARAN
}

enum SatuanLayanan {
  kg
  pcs
}

enum StatusCucian {
  diterima
  dicuci
  disetrika
  siap
  selesai
}

enum MetodePembayaran {
  tunai
  QRIS
  transfer  // Added for pengeluaran
}

enum StatusPembayaran {
  lunas
  sebagian
  batal
}

enum JenisPengiriman {
  jemput
  antar
}

enum StatusPengiriman {
  dijadwalkan
  dalam_perjalanan
  selesai
}
```

---

## Phase 2: SQL Migration - Functions, Procedures, Triggers

### 2.1 Create Main Migration File

**File:** `prisma/migrations/YYYYMMDDHHMMSS_add_sql_features/migration.sql`

```sql
-- =====================================================================
-- STAGE 1: GENERATED COLUMNS untuk subtotal
-- =====================================================================

-- Convert subtotal columns to GENERATED (MySQL 5.7+)
ALTER TABLE detail_layanan 
  MODIFY COLUMN subtotal DECIMAL(12,2) 
  AS (jumlah * harga_satuan) STORED;

ALTER TABLE detail_produk 
  MODIFY COLUMN subtotal DECIMAL(12,2) 
  AS (qty * harga_satuan) STORED;

-- =====================================================================
-- STAGE 2: FUNCTIONS (copy from project_database.sql)
-- =====================================================================

DELIMITER $$

-- Function 1: sisa_tagihan
CREATE FUNCTION sisa_tagihan(p_id INT) 
RETURNS DECIMAL(12,2)
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

-- Function 2: hitung_total_pesanan
CREATE FUNCTION hitung_total_pesanan(p_id INT) 
RETURNS DECIMAL(12,2)
READS SQL DATA
BEGIN
  RETURN COALESCE((SELECT SUM(subtotal) FROM detail_layanan WHERE id_pesanan = p_id), 0)
       + COALESCE((SELECT SUM(subtotal) FROM detail_produk  WHERE id_pesanan = p_id), 0)
       + COALESCE((SELECT SUM(biaya)    FROM pengiriman     WHERE id_pesanan = p_id), 0);
END$$

-- Function 3: omzet_periode
CREATE FUNCTION omzet_periode(p_dari DATE, p_sampai DATE) 
RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
  RETURN COALESCE((SELECT SUM(total) FROM pesanan
                    WHERE tgl_masuk >= p_dari
                      AND tgl_masuk <  DATE_ADD(p_sampai, INTERVAL 1 DAY)), 0);
END$$

-- Function 4: pengeluaran_periode
CREATE FUNCTION pengeluaran_periode(p_dari DATE, p_sampai DATE) 
RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
  RETURN COALESCE((SELECT SUM(jumlah) FROM pengeluaran
                    WHERE tgl_pengeluaran BETWEEN p_dari AND p_sampai), 0);
END$$

-- Function 5: laba_periode
CREATE FUNCTION laba_periode(p_dari DATE, p_sampai DATE) 
RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
  RETURN omzet_periode(p_dari, p_sampai) - pengeluaran_periode(p_dari, p_sampai);
END$$

DELIMITER ;

-- =====================================================================
-- STAGE 3: PROCEDURES (simplified versions for Node.js integration)
-- =====================================================================

DELIMITER $$

-- Procedure 1: refresh_total
CREATE PROCEDURE refresh_total(IN p_id INT)
BEGIN
  UPDATE pesanan SET total = hitung_total_pesanan(p_id) WHERE id_pesanan = p_id;
END$$

-- Procedure 2: buat_pesanan
CREATE PROCEDURE buat_pesanan(IN p_pelanggan INT, OUT p_id INT)
BEGIN
  INSERT INTO pesanan (id_pelanggan) VALUES (p_pelanggan);
  SET p_id = LAST_INSERT_ID();
END$$

-- Procedure 3: tambah_layanan
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

-- Procedure 4: tambah_produk
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

-- Procedure 5: tambah_pengiriman
CREATE PROCEDURE tambah_pengiriman(
  IN p_pesanan INT, 
  IN p_jenis VARCHAR(10),
  IN p_alamat VARCHAR(255), 
  IN p_biaya DECIMAL(10,2)
)
BEGIN
  INSERT INTO pengiriman (id_pesanan, jenis, alamat, biaya)
  VALUES (p_pesanan, p_jenis, p_alamat, p_biaya);
END$$

-- Procedure 6: ubah_status_cucian
CREATE PROCEDURE ubah_status_cucian(IN p_pesanan INT, IN p_status VARCHAR(10))
BEGIN
  UPDATE pesanan SET status_cucian = p_status WHERE id_pesanan = p_pesanan;
END$$

-- Procedure 7: catat_pembayaran (dengan ACID transaction)
CREATE PROCEDURE catat_pembayaran(
  IN p_pesanan INT, 
  IN p_jumlah DECIMAL(12,2), 
  IN p_metode VARCHAR(10)
)
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
  VALUES (p_pesanan, p_metode, p_jumlah, 
          IF(p_jumlah >= v_sisa, 'lunas', 'sebagian'));
  
  COMMIT;
END$$

-- Procedure 8: batalkan_pembayaran
CREATE PROCEDURE batalkan_pembayaran(IN p_id_pembayaran INT)
BEGIN
  DECLARE v_pesanan INT;
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  
  SELECT id_pesanan INTO v_pesanan 
  FROM pembayaran
  WHERE id_pembayaran = p_id_pembayaran AND status <> 'batal' 
  FOR UPDATE;
  
  IF v_pesanan IS NULL THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Pembayaran tidak ditemukan atau sudah batal';
  END IF;
  
  UPDATE pembayaran SET status = 'batal' WHERE id_pembayaran = p_id_pembayaran;
  
  COMMIT;
END$$

-- Procedure 9: catat_pengeluaran
CREATE PROCEDURE catat_pengeluaran(
  IN p_kategori INT, 
  IN p_tgl DATE, 
  IN p_ket VARCHAR(255),
  IN p_jumlah DECIMAL(12,2), 
  IN p_metode VARCHAR(10)
)
BEGIN
  INSERT INTO pengeluaran (id_kategori, tgl_pengeluaran, keterangan, jumlah, metode)
  VALUES (p_kategori, p_tgl, p_ket, p_jumlah, p_metode);
END$$

-- Procedure 10: laporan_omzet
CREATE PROCEDURE laporan_omzet(IN p_dari DATE, IN p_sampai DATE)
BEGIN
  SELECT
    (SELECT COUNT(*) FROM pesanan
      WHERE tgl_masuk >= p_dari 
        AND tgl_masuk < DATE_ADD(p_sampai, INTERVAL 1 DAY)) AS jumlah_pesanan,
    omzet_periode(p_dari, p_sampai)       AS omzet,
    pengeluaran_periode(p_dari, p_sampai) AS pengeluaran,
    laba_periode(p_dari, p_sampai)        AS laba;
END$$

-- Procedure 11: cari_pelanggan (SQL injection prevention example)
CREATE PROCEDURE cari_pelanggan(IN p_kata VARCHAR(100))
BEGIN
  SELECT id_pelanggan, nama, no_hp, alamat
    FROM pelanggan
   WHERE nama LIKE CONCAT('%', p_kata, '%') 
      OR no_hp LIKE CONCAT('%', p_kata, '%')
   ORDER BY nama
   LIMIT 50;
END$$

DELIMITER ;

-- =====================================================================
-- STAGE 4: TRIGGERS (Critical business rules)
-- =====================================================================

DELIMITER $$

-- Trigger: Auto-refresh total after detail changes
CREATE TRIGGER trg_dl_ai AFTER INSERT ON detail_layanan FOR EACH ROW
BEGIN
  CALL refresh_total(NEW.id_pesanan);
END$$

CREATE TRIGGER trg_dl_au AFTER UPDATE ON detail_layanan FOR EACH ROW
BEGIN
  CALL refresh_total(NEW.id_pesanan);
END$$

CREATE TRIGGER trg_dl_ad AFTER DELETE ON detail_layanan FOR EACH ROW
BEGIN
  CALL refresh_total(OLD.id_pesanan);
END$$

-- Trigger: Stock management for products
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

CREATE TRIGGER trg_dp_au AFTER UPDATE ON detail_produk FOR EACH ROW
BEGIN
  UPDATE produk 
  SET stok = stok + OLD.qty - NEW.qty 
  WHERE id_produk = NEW.id_produk;
  CALL refresh_total(NEW.id_pesanan);
END$$

CREATE TRIGGER trg_dp_ad AFTER DELETE ON detail_produk FOR EACH ROW
BEGIN
  UPDATE produk SET stok = stok + OLD.qty WHERE id_produk = OLD.id_produk;
  CALL refresh_total(OLD.id_pesanan);
END$$

-- Trigger: Pengiriman affects total
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

-- Trigger: Status validation (only forward, not backward)
CREATE TRIGGER trg_pesanan_bu BEFORE UPDATE ON pesanan FOR EACH ROW
BEGIN
  -- Status can only move forward
  IF NEW.status_cucian + 0 < OLD.status_cucian + 0 THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Status cucian tidak boleh mundur';
  END IF;
  
  -- Must have at least one layanan before processing
  IF OLD.status_cucian = 'diterima' AND NEW.status_cucian <> 'diterima'
     AND NOT EXISTS (SELECT 1 FROM detail_layanan WHERE id_pesanan = OLD.id_pesanan) THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Pesanan harus memuat minimal satu layanan sebelum diproses';
  END IF;
  
  -- Auto-set tgl_selesai when status = selesai
  IF NEW.status_cucian = 'selesai' AND OLD.status_cucian <> 'selesai'
     AND NEW.tgl_selesai IS NULL THEN
    SET NEW.tgl_selesai = NOW();
  END IF;
END$$

-- Trigger: Restore stock when pesanan deleted
CREATE TRIGGER trg_pesanan_bd BEFORE DELETE ON pesanan FOR EACH ROW
BEGIN
  UPDATE produk pr
    JOIN detail_produk dp ON dp.id_produk = pr.id_produk
     SET pr.stok = pr.stok + dp.qty
   WHERE dp.id_pesanan = OLD.id_pesanan;
END$$

-- Trigger: Payment validation
CREATE TRIGGER trg_bayar_bi BEFORE INSERT ON pembayaran FOR EACH ROW
BEGIN
  IF NEW.status <> 'batal' AND NEW.jumlah > sisa_tagihan(NEW.id_pesanan) THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Pembayaran melebihi sisa tagihan';
  END IF;
END$$

-- Trigger: Payment cannot be deleted, only cancelled
CREATE TRIGGER trg_bayar_bd BEFORE DELETE ON pembayaran FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' 
  SET MESSAGE_TEXT = 'Pembayaran tidak boleh dihapus; gunakan pembatalan';
END$$

-- Trigger: Prevent changing payment details (immutable except status to 'batal')
CREATE TRIGGER trg_bayar_bu BEFORE UPDATE ON pembayaran FOR EACH ROW
BEGIN
  IF NEW.id_pesanan <> OLD.id_pesanan 
     OR NEW.jumlah <> OLD.jumlah
     OR NEW.metode <> OLD.metode 
     OR NEW.tgl_bayar <> OLD.tgl_bayar
     OR NOT (OLD.status <> 'batal' AND NEW.status = 'batal') THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Data pembayaran tidak boleh diubah; batalkan lalu catat ulang';
  END IF;
END$$

-- Trigger: Kategori jenis validation
CREATE TRIGGER trg_layanan_bi BEFORE INSERT ON layanan FOR EACH ROW
BEGIN
  DECLARE v_j VARCHAR(12);
  SELECT jenis INTO v_j FROM kategori WHERE id_kategori = NEW.id_kategori;
  IF v_j IS NOT NULL AND v_j <> 'LAYANAN' THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Jenis kategori tidak sesuai dengan data yang disimpan';
  END IF;
END$$

CREATE TRIGGER trg_produk_bi BEFORE INSERT ON produk FOR EACH ROW
BEGIN
  DECLARE v_j VARCHAR(12);
  SELECT jenis INTO v_j FROM kategori WHERE id_kategori = NEW.id_kategori;
  IF v_j IS NOT NULL AND v_j <> 'PRODUK' THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Jenis kategori tidak sesuai dengan data yang disimpan';
  END IF;
END$$

CREATE TRIGGER trg_pengeluaran_bi BEFORE INSERT ON pengeluaran FOR EACH ROW
BEGIN
  DECLARE v_j VARCHAR(12);
  SELECT jenis INTO v_j FROM kategori WHERE id_kategori = NEW.id_kategori;
  IF v_j IS NOT NULL AND v_j <> 'PENGELUARAN' THEN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'Jenis kategori tidak sesuai dengan data yang disimpan';
  END IF;
END$$

DELIMITER ;

-- =====================================================================
-- STAGE 5: VIEWS (8 views for reporting)
-- =====================================================================

-- View 1: v_nota (complete order with estimates)
CREATE VIEW v_nota AS
SELECT 
  p.id_pesanan, 
  pl.nama AS pelanggan, 
  p.tgl_masuk, 
  p.tgl_selesai, 
  p.status_cucian, 
  p.total,
  (SELECT MAX(l.estimasi_hari) 
   FROM detail_layanan dl
   JOIN layanan l ON l.id_layanan = dl.id_layanan
   WHERE dl.id_pesanan = p.id_pesanan) AS estimasi_hari,
  DATEDIFF(p.tgl_selesai, p.tgl_masuk) AS durasi_hari,
  sisa_tagihan(p.id_pesanan) AS sisa
FROM pesanan p
JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan;

-- View 2: v_pesanan_belum_lunas
CREATE VIEW v_pesanan_belum_lunas AS
SELECT 
  p.id_pesanan, 
  pl.nama, 
  pl.no_hp, 
  p.status_cucian, 
  p.tgl_masuk, 
  p.total,
  p.total - sisa_tagihan(p.id_pesanan) AS dibayar,
  sisa_tagihan(p.id_pesanan) AS sisa
FROM pesanan p
JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
WHERE sisa_tagihan(p.id_pesanan) > 0;

-- View 3: v_stok_menipis
CREATE VIEW v_stok_menipis AS
SELECT 
  pr.id_produk, 
  pr.nama_produk, 
  k.nama_kategori, 
  pr.stok
FROM produk pr
JOIN kategori k ON k.id_kategori = pr.id_kategori
WHERE pr.stok < 5;

-- View 4: v_omzet_bulanan
CREATE VIEW v_omzet_bulanan AS
SELECT 
  bulan,
  SUM(layanan) AS omzet_layanan,
  SUM(produk) AS omzet_produk,
  SUM(ongkir) AS ongkir
FROM (
  SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m') AS bulan, 
         x.subtotal AS layanan, 0 AS produk, 0 AS ongkir
  FROM detail_layanan x 
  JOIN pesanan p ON p.id_pesanan = x.id_pesanan
  
  UNION ALL
  
  SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m'), 0, x.subtotal, 0
  FROM detail_produk x 
  JOIN pesanan p ON p.id_pesanan = x.id_pesanan
  
  UNION ALL
  
  SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m'), 0, 0, x.biaya
  FROM pengiriman x 
  JOIN pesanan p ON p.id_pesanan = x.id_pesanan
) t
GROUP BY bulan;

-- View 5: v_laba_bulanan
CREATE VIEW v_laba_bulanan AS
SELECT 
  bulan, 
  SUM(omzet) AS omzet, 
  SUM(biaya) AS pengeluaran, 
  SUM(omzet) - SUM(biaya) AS laba
FROM (
  SELECT DATE_FORMAT(tgl_masuk, '%Y-%m') AS bulan, 
         total AS omzet, 0 AS biaya 
  FROM pesanan
  
  UNION ALL
  
  SELECT DATE_FORMAT(tgl_pengeluaran, '%Y-%m'), 0, jumlah 
  FROM pengeluaran
) t
GROUP BY bulan;

-- View 6: v_item_jual (Generalization: layanan + produk)
CREATE VIEW v_item_jual AS
SELECT 'LAYANAN' AS tipe, id_layanan AS id_item, 
       nama_layanan AS nama, harga, satuan 
FROM layanan

UNION ALL

SELECT 'PRODUK', id_produk, nama_produk, harga, 'pcs' 
FROM produk;

-- View 7: v_rincian_pesanan (Combined layanan + produk per order)
CREATE VIEW v_rincian_pesanan AS
SELECT 
  dl.id_pesanan, 
  'LAYANAN' AS tipe, 
  l.nama_layanan AS nama,
  dl.jumlah, 
  dl.harga_satuan, 
  dl.subtotal
FROM detail_layanan dl 
JOIN layanan l ON l.id_layanan = dl.id_layanan

UNION ALL

SELECT 
  dp.id_pesanan, 
  'PRODUK', 
  pr.nama_produk, 
  dp.qty, 
  dp.harga_satuan, 
  dp.subtotal
FROM detail_produk dp 
JOIN produk pr ON pr.id_produk = dp.id_produk;

-- View 8: v_pelanggan_samar (Masked phone for reports)
CREATE VIEW v_pelanggan_samar AS
SELECT 
  id_pelanggan, 
  nama,
  CONCAT(LEFT(no_hp, 4), '****', RIGHT(no_hp, 3)) AS no_hp_samar
FROM pelanggan;
```

---

## Phase 3: Node.js Integration

### 3.1 Wrap SQL Procedures dalam Node.js Services

**File:** `src/infrastructure/services/SqlProcedureService.js`

```javascript
const { PrismaClient } = require('@prisma/client');

class SqlProcedureService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Call: buat_pesanan
   * Returns: new order ID
   */
  async createPesanan(idPelanggan) {
    const result = await this.prisma.$queryRaw`
      CALL buat_pesanan(${idPelanggan}, @p_id);
      SELECT @p_id as id_pesanan;
    `;
    return result[result.length - 1].id_pesanan;
  }

  /**
   * Call: tambah_layanan
   */
  async addLayanan(idPesanan, idLayanan, jumlah) {
    await this.prisma.$executeRaw`
      CALL tambah_layanan(${idPesanan}, ${idLayanan}, ${jumlah})
    `;
  }

  /**
   * Call: tambah_produk
   */
  async addProduk(idPesanan, idProduk, qty) {
    await this.prisma.$executeRaw`
      CALL tambah_produk(${idPesanan}, ${idProduk}, ${qty})
    `;
  }

  /**
   * Call: tambah_pengiriman
   */
  async addPengiriman(idPesanan, jenis, alamat, biaya) {
    await this.prisma.$executeRaw`
      CALL tambah_pengiriman(${idPesanan}, ${jenis}, ${alamat}, ${biaya})
    `;
  }

  /**
   * Call: ubah_status_cucian
   */
  async updateStatusCucian(idPesanan, status) {
    await this.prisma.$executeRaw`
      CALL ubah_status_cucian(${idPesanan}, ${status})
    `;
  }

  /**
   * Call: catat_pembayaran (ACID transaction in SQL)
   */
  async recordPayment(idPesanan, jumlah, metode) {
    try {
      await this.prisma.$executeRaw`
        CALL catat_pembayaran(${idPesanan}, ${jumlah}, ${metode})
      `;
      return { success: true };
    } catch (error) {
      // SQL procedure will SIGNAL error messages
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Call: cari_pelanggan (SQL injection safe)
   */
  async searchPelanggan(keyword) {
    return await this.prisma.$queryRaw`
      CALL cari_pelanggan(${keyword})
    `;
  }

  /**
   * Call: laporan_omzet
   */
  async getLaporanOmzet(dari, sampai) {
    const result = await this.prisma.$queryRaw`
      CALL laporan_omzet(${dari}, ${sampai})
    `;
    return result[0];
  }

  /**
   * Use SQL Function: sisa_tagihan
   */
  async getSisaTagihan(idPesanan) {
    const result = await this.prisma.$queryRaw`
      SELECT sisa_tagihan(${idPesanan}) as sisa
    `;
    return result[0].sisa;
  }

  /**
   * Use SQL Function: laba_periode
   */
  async getLabaPeriode(dari, sampai) {
    const result = await this.prisma.$queryRaw`
      SELECT laba_periode(${dari}, ${sampai}) as laba
    `;
    return result[0].laba;
  }

  /**
   * Query Views
   */
  async getViewNotaBelumLunas() {
    return await this.prisma.$queryRaw`
      SELECT * FROM v_pesanan_belum_lunas
    `;
  }

  async getViewStokMenipis() {
    return await this.prisma.$queryRaw`
      SELECT * FROM v_stok_menipis
    `;
  }

  async getViewLabaBulanan() {
    return await this.prisma.$queryRaw`
      SELECT * FROM v_laba_bulanan ORDER BY bulan DESC
    `;
  }
}

module.exports = SqlProcedureService;
```

---

## Phase 4: Analytic Queries Implementation

### 4.1 Create Dedicated Query Service

**File:** `src/infrastructure/services/AnalyticQueryService.js`

```javascript
const { PrismaClient } = require('@prisma/client');

/**
 * Service untuk 17 query analitik (A1-A17)
 * Sesuai dengan stage5_query_sql.sql
 */
class AnalyticQueryService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * A1. Lima layanan terlaris
   * Menjawab: Kebutuhan 1 (layanan terlaris)
   */
  async getLayananTerlaris(limit = 5) {
    return await this.prisma.$queryRaw`
      SELECT l.nama_layanan,
             COUNT(*) AS jumlah_nota,
             SUM(dl.jumlah) AS total_kg,
             SUM(dl.subtotal) AS omzet
      FROM detail_layanan dl
      INNER JOIN layanan l ON l.id_layanan = dl.id_layanan
      GROUP BY l.id_layanan, l.nama_layanan
      ORDER BY omzet DESC
      LIMIT ${limit}
    `;
  }

  /**
   * A2. Lima produk terlaris
   */
  async getProdukTerlaris(limit = 5) {
    return await this.prisma.$queryRaw`
      SELECT pr.nama_produk,
             SUM(dp.qty) AS unit_terjual,
             SUM(dp.subtotal) AS omzet
      FROM detail_produk dp
      INNER JOIN produk pr ON pr.id_produk = dp.id_produk
      GROUP BY pr.id_produk, pr.nama_produk
      ORDER BY unit_terjual DESC, omzet DESC
      LIMIT ${limit}
    `;
  }

  /**
   * A3. Posisi stok semua produk
   * Menjawab: Kebutuhan 5 (stok menipis), Kebutuhan 6 (produk belum terjual)
   */
  async getPosisiStok() {
    return await this.prisma.$queryRaw`
      SELECT pr.nama_produk,
             pr.stok,
             COALESCE(SUM(dp.qty), 0) AS unit_terjual,
             CASE WHEN pr.stok < 5 THEN 'SEGERA ISI ULANG' ELSE 'aman' END AS keterangan
      FROM produk pr
      LEFT JOIN detail_produk dp ON dp.id_produk = pr.id_produk
      GROUP BY pr.id_produk, pr.nama_produk, pr.stok
      ORDER BY pr.stok ASC
    `;
  }

  /**
   * A4. Pesanan yang belum lunas
   * Menjawab: Kebutuhan 4 (pesanan belum lunas)
   */
  async getPesananBelumLunas() {
    return await this.prisma.$queryRaw`
      SELECT p.id_pesanan,
             pl.nama,
             pl.no_hp,
             p.total,
             COALESCE(SUM(b.jumlah), 0) AS sudah_dibayar,
             p.total - COALESCE(SUM(b.jumlah), 0) AS sisa_tagihan
      FROM pesanan p
      INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
      LEFT JOIN pembayaran b ON b.id_pesanan = p.id_pesanan AND b.status <> 'batal'
      GROUP BY p.id_pesanan, pl.nama, pl.no_hp, p.total
      HAVING p.total - COALESCE(SUM(b.jumlah), 0) > 0
      ORDER BY sisa_tagihan DESC
    `;
  }

  /**
   * A5. Pesanan yang melewati estimasi
   * Menjawab: Kebutuhan 7 (selesai melewati estimasi)
   */
  async getPesananTerlambat() {
    return await this.prisma.$queryRaw`
      SELECT p.id_pesanan,
             pl.nama,
             p.status_cucian,
             MAX(l.estimasi_hari) AS estimasi_hari,
             TIMESTAMPDIFF(HOUR, p.tgl_masuk, COALESCE(p.tgl_selesai, NOW())) AS jam_berjalan,
             TIMESTAMPDIFF(HOUR, p.tgl_masuk, COALESCE(p.tgl_selesai, NOW())) - MAX(l.estimasi_hari) * 24 AS jam_terlambat
      FROM pesanan p
      INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
      INNER JOIN detail_layanan dl ON dl.id_pesanan = p.id_pesanan
      INNER JOIN layanan l ON l.id_layanan = dl.id_layanan
      GROUP BY p.id_pesanan, pl.nama, p.status_cucian, p.tgl_masuk, p.tgl_selesai
      HAVING TIMESTAMPDIFF(HOUR, p.tgl_masuk, COALESCE(p.tgl_selesai, NOW())) > MAX(l.estimasi_hari) * 24
      ORDER BY jam_terlambat DESC
    `;
  }

  /**
   * A6. Rekap omzet per bulan
   * Menjawab: Kebutuhan 1 (omzet)
   */
  async getRekapOmzetBulanan() {
    return await this.prisma.$queryRaw`
      SELECT DATE_FORMAT(tgl_masuk, '%Y-%m') AS bulan,
             COUNT(*) AS jumlah_nota,
             SUM(total) AS omzet,
             ROUND(AVG(total), 0) AS rata_rata_nota,
             MIN(total) AS nota_terkecil,
             MAX(total) AS nota_terbesar
      FROM pesanan
      GROUP BY DATE_FORMAT(tgl_masuk, '%Y-%m')
      ORDER BY bulan
    `;
  }

  /**
   * A7. Laba bulanan (omzet - pengeluaran)
   * Menjawab: Kebutuhan 11 (selisih omzet dan pengeluaran)
   */
  async getLabaBulanan() {
    return await this.prisma.$queryRaw`
      SELECT bulan,
             SUM(omzet) AS omzet,
             SUM(biaya) AS pengeluaran,
             SUM(omzet) - SUM(biaya) AS laba
      FROM (
        SELECT DATE_FORMAT(tgl_masuk, '%Y-%m') AS bulan, total AS omzet, 0 AS biaya
        FROM pesanan
        UNION ALL
        SELECT DATE_FORMAT(tgl_pengeluaran, '%Y-%m'), 0, jumlah
        FROM pengeluaran
      ) t
      GROUP BY bulan
      ORDER BY bulan
    `;
  }

  /**
   * A8. Pelanggan dengan belanja > 100k
   * Menjawab: Kebutuhan 3 (pelanggan belanja terbesar)
   */
  async getPelangganTopSpender(minBelanja = 100000) {
    return await this.prisma.$queryRaw`
      SELECT pl.nama,
             pl.no_hp,
             COUNT(p.id_pesanan) AS jumlah_nota,
             SUM(p.total) AS total_belanja,
             MAX(p.tgl_masuk) AS nota_terakhir
      FROM pelanggan pl
      INNER JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
      GROUP BY pl.id_pelanggan, pl.nama, pl.no_hp
      HAVING SUM(p.total) > ${minBelanja}
      ORDER BY total_belanja DESC
    `;
  }

  /**
   * A14. Omzet layanan vs produk per bulan
   * Menjawab: Kebutuhan 2 (omzet layanan vs produk)
   */
  async getOmzetLayananVsProduk() {
    return await this.prisma.$queryRaw`
      SELECT bulan,
             SUM(omzet_layanan) AS omzet_layanan,
             SUM(omzet_produk) AS omzet_produk,
             SUM(omzet_layanan) + SUM(omzet_produk) AS omzet_gabungan,
             ROUND(100 * SUM(omzet_produk) /
                   (SUM(omzet_layanan) + SUM(omzet_produk)), 1) AS persen_produk
      FROM (
        SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m') AS bulan, 
               dl.subtotal AS omzet_layanan, 0 AS omzet_produk
        FROM detail_layanan dl
        INNER JOIN pesanan p ON p.id_pesanan = dl.id_pesanan
        UNION ALL
        SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m'), 0, dp.subtotal
        FROM detail_produk dp
        INNER JOIN pesanan p ON p.id_pesanan = dp.id_pesanan
      ) t
      GROUP BY bulan
      ORDER BY bulan
    `;
  }

  /**
   * A15. Rata-rata berat cucian per pelanggan
   * Menjawab: Kebutuhan 8 (rata-rata berat per pelanggan)
   */
  async getRataBeratPerPelanggan() {
    return await this.prisma.$queryRaw`
      SELECT pl.nama,
             COUNT(*) AS jumlah_nota,
             SUM(n.kg_nota) AS total_kg,
             ROUND(AVG(n.kg_nota), 2) AS rata_rata_kg_per_nota,
             MIN(n.kg_nota) AS nota_teringan,
             MAX(n.kg_nota) AS nota_terberat
      FROM (
        SELECT p.id_pesanan, p.id_pelanggan, SUM(dl.jumlah) AS kg_nota
        FROM pesanan p
        INNER JOIN detail_layanan dl ON dl.id_pesanan = p.id_pesanan
        INNER JOIN layanan l ON l.id_layanan = dl.id_layanan
        WHERE l.satuan = 'kg'
        GROUP BY p.id_pesanan, p.id_pelanggan
      ) n
      INNER JOIN pelanggan pl ON pl.id_pelanggan = n.id_pelanggan
      GROUP BY pl.id_pelanggan, pl.nama
      ORDER BY rata_rata_kg_per_nota DESC
    `;
  }

  /**
   * A16. Pengeluaran per bulan per kategori
   * Menjawab: Kebutuhan 10 (pengeluaran per bulan per kategori)
   */
  async getPengeluaranPerKategori() {
    return await this.prisma.$queryRaw`
      SELECT DATE_FORMAT(pg.tgl_pengeluaran, '%Y-%m') AS bulan,
             k.nama_kategori,
             COUNT(*) AS jumlah_catatan,
             SUM(pg.jumlah) AS total_pengeluaran
      FROM pengeluaran pg
      INNER JOIN kategori k ON k.id_kategori = pg.id_kategori
      GROUP BY DATE_FORMAT(pg.tgl_pengeluaran, '%Y-%m'), k.id_kategori, k.nama_kategori
      ORDER BY bulan, total_pengeluaran DESC
    `;
  }

  /**
   * A17. Status cucian seorang pelanggan (by phone)
   * Menjawab: Kebutuhan 9 (tahap cucian pelanggan)
   */
  async getStatusCucianByPhone(noHp) {
    return await this.prisma.$queryRaw`
      SELECT pl.nama, p.id_pesanan, p.status_cucian, p.tgl_masuk, p.tgl_selesai
      FROM pelanggan pl
      INNER JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
      WHERE pl.no_hp = ${noHp}
      ORDER BY p.tgl_masuk DESC
    `;
  }
}

module.exports = AnalyticQueryService;
```

---

## Phase 5: Implementation Checklist

### Week 1: Database Migration
- [ ] Replace current `prisma/schema.prisma` with `schema-final.prisma`
- [ ] Run `npx prisma migrate dev --name add_sql_features`
- [ ] Execute SQL migration for functions/procedures/triggers
- [ ] Test all functions via MySQL client
- [ ] Test all triggers with INSERT/UPDATE operations

### Week 2: Node.js Integration
- [ ] Create `SqlProcedureService.js`
- [ ] Create `AnalyticQueryService.js`
- [ ] Update existing controllers to use procedures
- [ ] Create new `/api/analytics` endpoints (A1-A17)
- [ ] Test all analytic queries

### Week 3: Testing & Documentation
- [ ] Write integration tests for procedures
- [ ] Write tests for analytic queries
- [ ] Create Postman collection for all 17 queries
- [ ] Document API endpoints
- [ ] Performance testing

### Week 4: Security & Finalization
- [ ] Setup MySQL users and roles (`app_kasir`, `app_laporan`, `app_pemilik`)
- [ ] Update `.env` with role-specific DATABASE_URL
- [ ] Implement role-based middleware in Node.js
- [ ] Final testing
- [ ] Create demo video/presentation

---

## Success Criteria

✅ All 10 tables match SQL requirement
✅ All 5 functions working
✅ All 11 procedures working
✅ All triggers firing correctly
✅ All 8 views accessible
✅ All 17 analytic queries (A1-A17) return correct results
✅ ACID principles demonstrated in `catat_pembayaran`
✅ SQL injection prevention demonstrated in `cari_pelanggan`
✅ Role-based security implemented

---

## Next Steps

Mau saya implementasikan salah satu fase sekarang? Contoh:
1. **Update Prisma schema** dan create migration
2. **Implement SqlProcedureService** 
3. **Create analytic API endpoints**
4. **Setup sample test data** sesuai project_database.sql

Pilih mana yang mau dikerjakan duluan!

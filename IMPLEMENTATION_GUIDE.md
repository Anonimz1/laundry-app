# Implementation Guide: Database Enhancement
## Panduan Implementasi Step-by-Step

---

## Step 1: Update Prisma Schema dengan Indexes dan Improvements

### File: `prisma/schema-enhanced.prisma`

```prisma
// Enhanced Prisma Schema dengan B+ Tree Indexes, Constraints, dan Best Practices
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextIndex", "fullTextSearch"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ============================================
// STRONG ENTITIES
// ============================================

model Pelanggan {
  id_pelanggan Int       @id @default(autoincrement())
  nama         String    @db.VarChar(100)
  no_hp        String    @unique @db.VarChar(15)
  alamat       String    @db.VarChar(255)
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt
  
  // Relationships
  pesanan      Pesanan[]

  // Indexes for performance
  @@index([nama])
  @@index([created_at])
  @@map("pelanggan")
}

model Kategori {
  id_kategori   Int              @id @default(autoincrement())
  nama_kategori String           @unique @db.VarChar(50)
  jenis         JenisKategori
  
  // Relationships
  layanan       Layanan[]
  produk        Produk[]
  pengeluaran   Pengeluaran[]

  // Composite unique (Temuan 9a dari normalisasi)
  @@unique([nama_kategori, jenis])
  @@index([jenis])
  @@map("kategori")
}

model Layanan {
  id_layanan     Int              @id @default(autoincrement())
  id_kategori    Int
  nama_layanan   String           @db.VarChar(100)
  harga          Decimal          @db.Decimal(10, 2)
  satuan         SatuanLayanan
  estimasi_hari  Int              @default(2) @db.TinyInt
  is_active      Boolean          @default(true)
  created_at     DateTime         @default(now())
  updated_at     DateTime         @updatedAt
  
  // Relationships
  kategori       Kategori         @relation(fields: [id_kategori], references: [id_kategori], onUpdate: Cascade, onDelete: Restrict)
  detail_layanan DetailLayanan[]

  // Indexes
  @@index([id_kategori])
  @@index([is_active])
  @@map("layanan")
}

model Produk {
  id_produk     Int            @id @default(autoincrement())
  id_kategori   Int
  nama_produk   String         @db.VarChar(100)
  harga         Decimal        @db.Decimal(10, 2)
  stok          Int            @default(0)
  min_stok      Int            @default(5)  // NEW: untuk alert
  is_active     Boolean        @default(true)
  created_at    DateTime       @default(now())
  updated_at    DateTime       @updatedAt
  
  // Relationships
  kategori      Kategori       @relation(fields: [id_kategori], references: [id_kategori], onUpdate: Cascade, onDelete: Restrict)
  detail_produk DetailProduk[]

  // Indexes
  @@index([id_kategori])
  @@index([is_active])
  @@index([stok])  // For low stock queries
  @@map("produk")
}

model Pesanan {
  id_pesanan     Int             @id @default(autoincrement())
  id_pelanggan   Int
  tgl_masuk      DateTime        @default(now())
  tgl_selesai    DateTime?
  status_cucian  StatusCucian    @default(diterima)
  total          Decimal         @default(0) @db.Decimal(12, 2)
  catatan        String?         @db.Text
  version        Int             @default(1)  // NEW: Optimistic locking
  created_at     DateTime        @default(now())
  updated_at     DateTime        @updatedAt
  
  // Relationships
  pelanggan      Pelanggan       @relation(fields: [id_pelanggan], references: [id_pelanggan], onUpdate: Cascade, onDelete: Restrict)
  detail_layanan DetailLayanan[]
  detail_produk  DetailProduk[]
  pembayaran     Pembayaran[]
  pengiriman     Pengiriman[]

  // Indexes for common queries
  @@index([id_pelanggan])
  @@index([status_cucian])
  @@index([tgl_masuk(sort: Desc)])
  @@index([status_cucian, tgl_masuk])  // Composite index
  @@map("pesanan")
}

// ============================================
// WEAK ENTITIES (Junction Tables)
// ============================================

model DetailLayanan {
  id_pesanan   Int
  id_layanan   Int
  jumlah       Decimal  @db.Decimal(6, 2)
  harga_satuan Decimal  @db.Decimal(10, 2)
  subtotal     Decimal  @db.Decimal(12, 2)
  catatan      String?  @db.VarChar(255)  // NEW: Descriptive attribute
  created_at   DateTime @default(now())
  
  // Relationships (Weak entity - existence depends on Pesanan)
  pesanan      Pesanan  @relation(fields: [id_pesanan], references: [id_pesanan], onUpdate: Cascade, onDelete: Cascade)
  layanan      Layanan  @relation(fields: [id_layanan], references: [id_layanan], onUpdate: Cascade, onDelete: Restrict)

  // Composite primary key
  @@id([id_pesanan, id_layanan])
  
  // Indexes for reporting
  @@index([id_layanan, jumlah, subtotal])  // Covering index
  @@map("detail_layanan")
}

model DetailProduk {
  id_pesanan   Int
  id_produk    Int
  qty          Int
  harga_satuan Decimal  @db.Decimal(10, 2)
  subtotal     Decimal  @db.Decimal(12, 2)
  catatan      String?  @db.VarChar(255)  // NEW: Descriptive attribute
  created_at   DateTime @default(now())
  
  // Relationships (Weak entity)
  pesanan      Pesanan  @relation(fields: [id_pesanan], references: [id_pesanan], onUpdate: Cascade, onDelete: Cascade)
  produk       Produk   @relation(fields: [id_produk], references: [id_produk], onUpdate: Cascade, onDelete: Restrict)

  // Composite primary key
  @@id([id_pesanan, id_produk])
  
  // Indexes for reporting
  @@index([id_produk, qty, subtotal])  // Covering index
  @@map("detail_produk")
}

// ============================================
// RELATED ENTITIES
// ============================================

model Pembayaran {
  id_pembayaran Int              @id @default(autoincrement())
  id_pesanan    Int
  metode        MetodePembayaran
  jumlah        Decimal          @db.Decimal(12, 2)
  tgl_bayar     DateTime         @default(now())
  status        StatusPembayaran @default(lunas)
  bukti_bayar   String?          @db.VarChar(255)  // NEW: Path to payment proof
  catatan       String?          @db.VarChar(255)
  created_at    DateTime         @default(now())
  created_by    Int?             // NEW: User who recorded payment
  
  // Relationships
  pesanan       Pesanan          @relation(fields: [id_pesanan], references: [id_pesanan], onUpdate: Cascade, onDelete: Restrict)

  // Indexes
  @@index([id_pesanan])
  @@index([status])
  @@index([tgl_bayar(sort: Desc)])
  @@index([metode, tgl_bayar])  // For payment method reports
  @@map("pembayaran")
}

model Pengiriman {
  id_pengiriman Int              @id @default(autoincrement())
  id_pesanan    Int
  jenis         JenisPengiriman
  alamat        String           @db.VarChar(255)
  biaya         Decimal          @default(0) @db.Decimal(10, 2)
  status        StatusPengiriman @default(dijadwalkan)
  tgl_dijadwalkan DateTime?
  tgl_selesai   DateTime?
  kurir_nama    String?          @db.VarChar(100)  // NEW: Courier name
  catatan       String?          @db.VarChar(255)
  created_at    DateTime         @default(now())
  updated_at    DateTime         @updatedAt
  
  // Relationships
  pesanan       Pesanan          @relation(fields: [id_pesanan], references: [id_pesanan], onUpdate: Cascade, onDelete: Cascade)

  // Unique constraint: max 1 jemput + 1 antar per pesanan (Temuan 9b)
  @@unique([id_pesanan, jenis])
  
  // Indexes
  @@index([id_pesanan])
  @@index([status])
  @@index([jenis, status])
  @@map("pengiriman")
}

model Pengeluaran {
  id_pengeluaran  Int              @id @default(autoincrement())
  id_kategori     Int
  tgl_pengeluaran DateTime         @db.Date
  keterangan      String           @db.VarChar(255)
  jumlah          Decimal          @db.Decimal(12, 2)
  metode          MetodePembayaran
  bukti           String?          @db.VarChar(255)  // NEW: Bukti/receipt path
  created_at      DateTime         @default(now())
  created_by      Int?             // NEW: User who recorded expense
  
  // Relationships
  kategori        Kategori         @relation(fields: [id_kategori], references: [id_kategori], onUpdate: Cascade, onDelete: Restrict)

  // Indexes
  @@index([id_kategori])
  @@index([tgl_pengeluaran(sort: Desc)])
  @@index([metode])
  @@map("pengeluaran")
}

// ============================================
// SECURITY & AUDIT
// ============================================

model User {
  id_user    Int       @id @default(autoincrement())
  username   String    @unique @db.VarChar(50)
  password   String    @db.VarChar(255)  // Hashed
  email      String?   @unique @db.VarChar(100)
  role       UserRole  @default(KASIR)
  is_active  Boolean   @default(true)
  last_login DateTime?
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  
  @@index([username])
  @@index([role, is_active])
  @@map("user")
}

model AuditLog {
  id            Int      @id @default(autoincrement())
  entity_type   String   @db.VarChar(50)
  entity_id     Int
  action        AuditAction
  user_id       Int?
  user_ip       String?  @db.VarChar(45)
  user_agent    String?  @db.VarChar(255)
  data_before   Json?
  data_after    Json?
  created_at    DateTime @default(now())
  
  @@index([entity_type, entity_id])
  @@index([user_id])
  @@index([created_at(sort: Desc)])
  @@index([action, created_at])
  @@map("audit_log")
}

// ============================================
// REPORTING & ANALYTICS (Denormalized)
// ============================================

model LaporanHarian {
  id                 Int      @id @default(autoincrement())
  tanggal            DateTime @unique @db.Date
  jumlah_pesanan     Int      @default(0)
  total_omzet        Decimal  @default(0) @db.Decimal(12, 2)
  total_tunai        Decimal  @default(0) @db.Decimal(12, 2)
  total_qris         Decimal  @default(0) @db.Decimal(12, 2)
  total_transfer     Decimal  @default(0) @db.Decimal(12, 2)
  total_pengeluaran  Decimal  @default(0) @db.Decimal(12, 2)
  berat_total_kg     Decimal  @default(0) @db.Decimal(10, 2)
  jumlah_pelanggan_baru Int   @default(0)
  last_updated       DateTime @default(now())
  
  @@index([tanggal(sort: Desc)])
  @@map("laporan_harian")
}

// ============================================
// ENUMS
// ============================================

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
  dibatalkan  // NEW
}

enum MetodePembayaran {
  tunai
  QRIS
  transfer
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
  dibatalkan  // NEW
}

enum UserRole {
  ADMIN
  KASIR
  PEMILIK
  KURIR
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  VIEW
  LOGIN
  LOGOUT
}
```

---

## Step 2: Create Database Migration dengan Stored Procedures

### File: `prisma/migrations/add_stored_procedures.sql`

```sql
-- ============================================
-- STORED FUNCTIONS
-- ============================================

-- Drop existing functions if any
DROP FUNCTION IF EXISTS fn_calculate_pesanan_total;
DROP FUNCTION IF EXISTS fn_get_payment_status;
DROP FUNCTION IF EXISTS fn_is_order_late;
DROP FUNCTION IF EXISTS fn_calculate_order_age;

DELIMITER $$

-- Function: Calculate total pesanan
CREATE FUNCTION fn_calculate_pesanan_total(p_id_pesanan INT)
RETURNS DECIMAL(12,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(12,2);
  
  SELECT 
    COALESCE(SUM(dl.subtotal), 0) + 
    COALESCE(SUM(dp.subtotal), 0) + 
    COALESCE(SUM(pg.biaya), 0)
  INTO v_total
  FROM pesanan p
  LEFT JOIN detail_layanan dl ON p.id_pesanan = dl.id_pesanan
  LEFT JOIN detail_produk dp ON p.id_pesanan = dp.id_pesanan
  LEFT JOIN pengiriman pg ON p.id_pesanan = pg.id_pesanan
  WHERE p.id_pesanan = p_id_pesanan;
  
  RETURN COALESCE(v_total, 0);
END$$

-- Function: Get payment status
CREATE FUNCTION fn_get_payment_status(p_id_pesanan INT)
RETURNS VARCHAR(20)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total_pesanan DECIMAL(12,2);
  DECLARE v_total_bayar DECIMAL(12,2);
  
  SELECT total INTO v_total_pesanan FROM pesanan WHERE id_pesanan = p_id_pesanan;
  
  SELECT COALESCE(SUM(jumlah), 0) INTO v_total_bayar
  FROM pembayaran
  WHERE id_pesanan = p_id_pesanan AND status != 'batal';
  
  IF v_total_bayar = 0 THEN
    RETURN 'belum_bayar';
  ELSEIF v_total_bayar >= v_total_pesanan THEN
    RETURN 'lunas';
  ELSE
    RETURN 'sebagian';
  END IF;
END$$

-- Function: Check if order is late
CREATE FUNCTION fn_is_order_late(p_id_pesanan INT)
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_max_estimasi INT;
  DECLARE v_tgl_masuk DATETIME;
  DECLARE v_status VARCHAR(20);
  DECLARE v_umur_hari INT;
  
  SELECT tgl_masuk, status_cucian
  INTO v_tgl_masuk, v_status
  FROM pesanan
  WHERE id_pesanan = p_id_pesanan;
  
  IF v_status = 'selesai' THEN
    RETURN FALSE;
  END IF;
  
  SELECT MAX(l.estimasi_hari) INTO v_max_estimasi
  FROM detail_layanan dl
  JOIN layanan l ON dl.id_layanan = l.id_layanan
  WHERE dl.id_pesanan = p_id_pesanan;
  
  SET v_umur_hari = DATEDIFF(NOW(), v_tgl_masuk);
  
  RETURN v_umur_hari > v_max_estimasi;
END$$

-- Function: Calculate order age in days
CREATE FUNCTION fn_calculate_order_age(p_tgl_masuk DATETIME)
RETURNS INT
DETERMINISTIC
BEGIN
  RETURN DATEDIFF(NOW(), p_tgl_masuk);
END$$

DELIMITER ;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DROP PROCEDURE IF EXISTS sp_create_pesanan;
DROP PROCEDURE IF EXISTS sp_process_payment;
DROP PROCEDURE IF EXISTS sp_update_order_status;
DROP PROCEDURE IF EXISTS sp_cancel_order;
DROP PROCEDURE IF EXISTS sp_laporan_omzet;

DELIMITER $$

-- Procedure: Create pesanan (simplified version)
CREATE PROCEDURE sp_process_payment(
  IN p_id_pesanan INT,
  IN p_metode VARCHAR(20),
  IN p_jumlah DECIMAL(12,2),
  OUT p_id_pembayaran INT,
  OUT p_status_result VARCHAR(20)
)
BEGIN
  DECLARE v_total_pesanan DECIMAL(12,2);
  DECLARE v_total_bayar DECIMAL(12,2);
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  SELECT total INTO v_total_pesanan FROM pesanan WHERE id_pesanan = p_id_pesanan;
  
  SELECT COALESCE(SUM(jumlah), 0) INTO v_total_bayar
  FROM pembayaran
  WHERE id_pesanan = p_id_pesanan AND status != 'batal';
  
  IF p_jumlah <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jumlah harus lebih dari 0';
  END IF;
  
  IF (v_total_bayar + p_jumlah) >= v_total_pesanan THEN
    SET p_status_result = 'lunas';
  ELSE
    SET p_status_result = 'sebagian';
  END IF;
  
  INSERT INTO pembayaran (id_pesanan, metode, jumlah, tgl_bayar, status)
  VALUES (p_id_pesanan, p_metode, p_jumlah, NOW(), p_status_result);
  
  SET p_id_pembayaran = LAST_INSERT_ID();
  
  COMMIT;
END$$

-- Procedure: Update order status
CREATE PROCEDURE sp_update_order_status(
  IN p_id_pesanan INT,
  IN p_new_status VARCHAR(20)
)
BEGIN
  DECLARE v_current VARCHAR(20);
  
  SELECT status_cucian INTO v_current FROM pesanan WHERE id_pesanan = p_id_pesanan;
  
  -- Validate transition
  IF NOT (
    (v_current = 'diterima' AND p_new_status = 'dicuci') OR
    (v_current = 'dicuci' AND p_new_status = 'disetrika') OR
    (v_current = 'disetrika' AND p_new_status = 'siap') OR
    (v_current = 'siap' AND p_new_status = 'selesai')
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid status transition';
  END IF;
  
  UPDATE pesanan
  SET status_cucian = p_new_status,
      tgl_selesai = IF(p_new_status = 'selesai', NOW(), tgl_selesai),
      updated_at = NOW()
  WHERE id_pesanan = p_id_pesanan;
END$$

-- Procedure: Laporan omzet
CREATE PROCEDURE sp_laporan_omzet(
  IN p_tanggal_mulai DATE,
  IN p_tanggal_akhir DATE
)
BEGIN
  SELECT 
    DATE(p.tgl_masuk) as tanggal,
    COUNT(DISTINCT p.id_pesanan) as jumlah_pesanan,
    SUM(p.total) as total_omzet,
    SUM(CASE WHEN pm.metode = 'tunai' THEN pm.jumlah ELSE 0 END) as tunai,
    SUM(CASE WHEN pm.metode = 'QRIS' THEN pm.jumlah ELSE 0 END) as qris,
    SUM(CASE WHEN pm.metode = 'transfer' THEN pm.jumlah ELSE 0 END) as transfer
  FROM pesanan p
  LEFT JOIN pembayaran pm ON p.id_pesanan = pm.id_pesanan AND pm.status != 'batal'
  WHERE DATE(p.tgl_masuk) BETWEEN p_tanggal_mulai AND p_tanggal_akhir
  GROUP BY DATE(p.tgl_masuk)
  ORDER BY tanggal DESC;
END$$

DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS trg_detail_layanan_subtotal_insert;
DROP TRIGGER IF EXISTS trg_detail_layanan_subtotal_update;
DROP TRIGGER IF EXISTS trg_detail_produk_subtotal_insert;
DROP TRIGGER IF EXISTS trg_detail_produk_subtotal_update;
DROP TRIGGER IF EXISTS trg_update_pesanan_total;
DROP TRIGGER IF EXISTS trg_check_pengiriman_limit;

DELIMITER $$

-- Auto-calculate subtotal for detail_layanan
CREATE TRIGGER trg_detail_layanan_subtotal_insert
BEFORE INSERT ON detail_layanan
FOR EACH ROW
BEGIN
  SET NEW.subtotal = NEW.jumlah * NEW.harga_satuan;
END$$

CREATE TRIGGER trg_detail_layanan_subtotal_update
BEFORE UPDATE ON detail_layanan
FOR EACH ROW
BEGIN
  SET NEW.subtotal = NEW.jumlah * NEW.harga_satuan;
END$$

-- Auto-calculate subtotal for detail_produk
CREATE TRIGGER trg_detail_produk_subtotal_insert
BEFORE INSERT ON detail_produk
FOR EACH ROW
BEGIN
  SET NEW.subtotal = NEW.qty * NEW.harga_satuan;
END$$

CREATE TRIGGER trg_detail_produk_subtotal_update
BEFORE UPDATE ON detail_produk
FOR EACH ROW
BEGIN
  SET NEW.subtotal = NEW.qty * NEW.harga_satuan;
END$$

-- Update pesanan total when details change
CREATE TRIGGER trg_update_pesanan_total
AFTER INSERT ON detail_layanan
FOR EACH ROW
BEGIN
  UPDATE pesanan
  SET total = fn_calculate_pesanan_total(NEW.id_pesanan)
  WHERE id_pesanan = NEW.id_pesanan;
END$$

-- Enforce max 2 pengiriman per pesanan
CREATE TRIGGER trg_check_pengiriman_limit
BEFORE INSERT ON pengiriman
FOR EACH ROW
BEGIN
  DECLARE v_count INT;
  DECLARE v_exists INT;
  
  SELECT COUNT(*) INTO v_count
  FROM pengiriman
  WHERE id_pesanan = NEW.id_pesanan;
  
  IF v_count >= 2 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Maksimal 2 pengiriman per pesanan';
  END IF;
  
  SELECT COUNT(*) INTO v_exists
  FROM pengiriman
  WHERE id_pesanan = NEW.id_pesanan AND jenis = NEW.jenis;
  
  IF v_exists > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Jenis pengiriman sudah ada untuk pesanan ini';
  END IF;
END$$

DELIMITER ;
```

---

## Step 3: Implementation Priority

### Priority 1 (Week 1):
1. Update Prisma schema dengan enhanced version
2. Run migration
3. Create stored procedures dan triggers
4. Test all database constraints

### Priority 2 (Week 2):
5. Implement Enhanced Unit of Work
6. Add Authorization middleware
7. Setup Audit logging
8. Security audit

### Priority 3 (Week 3):
9. Performance testing dengan indexes
10. Create reporting views
11. Backup & recovery setup
12. Documentation

Mau saya lanjutkan dengan implementasi salah satu bagian?

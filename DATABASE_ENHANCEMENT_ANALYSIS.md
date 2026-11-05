# Database Enhancement Analysis: Clean Up Laundry
## Penerapan Prinsip Database Modern dan Advanced Patterns

**Dokumen ini menganalisis dan merekomendasikan perbaikan database Clean Up Laundry berdasarkan prinsip-prinsip database modern.**

---

## 1. B+ Tree Indexing Strategy

### 1.1 Konsep B+ Tree
B+ tree adalah struktur data yang digunakan oleh database untuk mempercepat pencarian. Semua data ada di leaf node dan leaf nodes saling terhubung (linked list) untuk range query.

### 1.2 Index yang Perlu Ditambahkan

```sql
-- Index untuk Foreign Keys (meningkatkan JOIN performance)
CREATE INDEX idx_pesanan_pelanggan ON pesanan(id_pelanggan);
CREATE INDEX idx_layanan_kategori ON layanan(id_kategori);
CREATE INDEX idx_produk_kategori ON produk(id_kategori);
CREATE INDEX idx_pembayaran_pesanan ON pembayaran(id_pesanan);
CREATE INDEX idx_pengiriman_pesanan ON pengiriman(id_pesanan);

-- Composite Index untuk query yang sering
CREATE INDEX idx_pesanan_status_tgl ON pesanan(status_cucian, tgl_masuk);
CREATE INDEX idx_pembayaran_status_tgl ON pembayaran(status, tgl_bayar);
CREATE INDEX idx_pelanggan_nohp ON pelanggan(no_hp); -- sudah UNIQUE, otomatis ter-index

-- Index untuk sorting dan filtering
CREATE INDEX idx_pesanan_tgl_masuk ON pesanan(tgl_masuk DESC);
CREATE INDEX idx_pengeluaran_tgl ON pengeluaran(tgl_pengeluaran DESC);

-- Covering Index untuk laporan
CREATE INDEX idx_detail_layanan_covering ON detail_layanan(id_layanan, jumlah, subtotal);
CREATE INDEX idx_detail_produk_covering ON detail_produk(id_produk, qty, subtotal);
```

### 1.3 Implementasi di Prisma Schema

```prisma
model Pesanan {
  id_pesanan     Int             @id @default(autoincrement())
  id_pelanggan   Int
  tgl_masuk      DateTime        @default(now())
  tgl_selesai    DateTime?
  status_cucian  StatusCucian    @default(diterima)
  total          Decimal         @default(0) @db.Decimal(12, 2)
  
  pelanggan      Pelanggan       @relation(fields: [id_pelanggan], references: [id_pelanggan])
  
  // Indexes
  @@index([id_pelanggan])
  @@index([status_cucian, tgl_masuk])
  @@index([tgl_masuk(sort: Desc)])
  @@map("pesanan")
}

model Pembayaran {
  id_pembayaran Int            @id @default(autoincrement())
  id_pesanan    Int
  metode        MetodePembayaran
  jumlah        Decimal        @db.Decimal(12, 2)
  tgl_bayar     DateTime       @default(now())
  status        StatusPembayaran @default(lunas)
  
  pesanan       Pesanan        @relation(fields: [id_pesanan], references: [id_pesanan])
  
  @@index([id_pesanan])
  @@index([status, tgl_bayar])
  @@index([tgl_bayar(sort: Desc)])
  @@map("pembayaran")
}
```

---

## 2. Relationship Sets & Descriptive Attributes

### 2.1 Relationship Sets dalam ERD

Saat ini ada **8 relationship sets**:

| Relationship | Type | Descriptive Attributes | Keterangan |
|-------------|------|------------------------|------------|
| PELANGGAN → PESANAN | 1:N | - | Atribut ada di PESANAN |
| KATEGORI → LAYANAN | 1:N | - | Atribut ada di LAYANAN |
| KATEGORI → PRODUK | 1:N | - | Atribut ada di PRODUK |
| KATEGORI → PENGELUARAN | 1:N | - | Atribut ada di PENGELUARAN |
| PESANAN ↔ LAYANAN | M:N | **jumlah, harga_satuan, subtotal** | Di DETAIL_LAYANAN |
| PESANAN ↔ PRODUK | M:N | **qty, harga_satuan, subtotal** | Di DETAIL_PRODUK |
| PESANAN → PEMBAYARAN | 1:N | - | Atribut ada di PEMBAYARAN |
| PESANAN → PENGIRIMAN | 1:N | - | Atribut ada di PENGIRIMAN |

### 2.2 Descriptive Attributes Analysis

**✓ Sudah Benar:**
- `DETAIL_LAYANAN` memiliki descriptive attributes: `jumlah`, `harga_satuan`, `subtotal`
- `DETAIL_PRODUK` memiliki descriptive attributes: `qty`, `harga_satuan`, `subtotal`

**Rekomendasi Tambahan:**
Pertimbangkan menambahkan atribut deskriptif untuk tracking:

```prisma
model DetailLayanan {
  id_pesanan   Int
  id_layanan   Int
  jumlah       Decimal @db.Decimal(6, 2)
  harga_satuan Decimal @db.Decimal(10, 2)
  subtotal     Decimal @db.Decimal(12, 2)
  catatan      String? @db.VarChar(255)  // NEW: catatan khusus per item
  created_at   DateTime @default(now())  // NEW: kapan item ditambahkan
  
  @@id([id_pesanan, id_layanan])
}
```

---

## 3. Degree of Relationship Sets

### 3.1 Klasifikasi Berdasarkan Degree

| Degree | Relationship | Entities Involved |
|--------|-------------|-------------------|
| **Binary (2)** | PELANGGAN-PESANAN | PELANGGAN, PESANAN |
| **Binary (2)** | KATEGORI-LAYANAN | KATEGORI, LAYANAN |
| **Binary (2)** | KATEGORI-PRODUK | KATEGORI, PRODUK |
| **Binary (2)** | KATEGORI-PENGELUARAN | KATEGORI, PENGELUARAN |
| **Binary (2)** | PESANAN-LAYANAN | PESANAN, LAYANAN |
| **Binary (2)** | PESANAN-PRODUK | PESANAN, PRODUK |
| **Binary (2)** | PESANAN-PEMBAYARAN | PESANAN, PEMBAYARAN |
| **Binary (2)** | PESANAN-PENGIRIMAN | PESANAN, PENGIRIMAN |

**Status:** ✓ Semua relationship adalah binary (optimal dan sederhana)

### 3.2 Rekomendasi: Potensial Ternary Relationship

Jika di masa depan ingin track **siapa kasir** yang menangani pembayaran:

```
TERNARY: PESANAN - PEMBAYARAN - KARYAWAN
```

Namun untuk saat ini, binary relationships sudah cukup.

---

## 4. Complex Attributes

### 4.1 Atomic vs Complex Attributes

**Status Saat Ini: ✓ Semua Attributes Sudah Atomic**

| Atribut | Status | Analisis |
|---------|--------|----------|
| `nama` | ✓ Atomic | Tidak perlu dipecah untuk laundry |
| `no_hp` | ✓ Atomic | Satu string, sudah tepat |
| `alamat` | ⚠️ Single Value | Bisa dipecah jika perlu detail geografis |

### 4.2 Rekomendasi: Composite Attribute untuk Alamat

Jika perlu analisis geografis (laporan per area):

```prisma
model Pelanggan {
  id_pelanggan Int       @id @default(autoincrement())
  nama         String    @db.VarChar(100)
  no_hp        String    @unique @db.VarChar(15)
  
  // Composite Address - Option 1: Tetap satu field
  alamat       String    @db.VarChar(255)
  
  // Composite Address - Option 2: Dipecah (jika perlu analisis geografis)
  // jalan        String?   @db.VarChar(100)
  // kelurahan    String?   @db.VarChar(50)
  // kecamatan    String?   @db.VarChar(50)
  // kota         String    @db.VarChar(50) @default("Singaraja")
  // kode_pos     String?   @db.VarChar(10)
  
  created_at   DateTime  @default(now())
  pesanan      Pesanan[]
}
```

**Rekomendasi:** Tetap gunakan `alamat` single field untuk kesederhanaan, kecuali ada kebutuhan bisnis untuk analisis per wilayah.

### 4.3 Multi-valued Attributes

**Status:** Tidak ada multi-valued attributes ✓

**Contoh jika perlu ditambahkan:**
- Jika pelanggan bisa punya **multiple phone numbers**:

```prisma
model Pelanggan {
  id_pelanggan Int       @id @default(autoincrement())
  nama         String    @db.VarChar(100)
  no_hp        String    @unique @db.VarChar(15)  // HP utama
  
  // Multi-valued: nomor HP tambahan
  nomor_hp_tambahan NomorHPTambahan[]
}

model NomorHPTambahan {
  id           Int       @id @default(autoincrement())
  id_pelanggan Int
  nomor        String    @db.VarChar(15)
  label        String    @db.VarChar(50)  // "kantor", "rumah", dll
  
  pelanggan    Pelanggan @relation(fields: [id_pelanggan], references: [id_pelanggan])
  
  @@index([id_pelanggan])
}
```

---

## 5. Mapping Cardinalities

### 5.1 Current Cardinality Mappings

| Relationship | Cardinality | Min,Max Notation | Implementation |
|-------------|-------------|------------------|----------------|
| PELANGGAN → PESANAN | 1:N | (0,N) - (1,1) | ✓ Foreign Key di PESANAN |
| KATEGORI → LAYANAN | 1:N | (0,N) - (1,1) | ✓ Foreign Key di LAYANAN |
| KATEGORI → PRODUK | 1:N | (0,N) - (1,1) | ✓ Foreign Key di PRODUK |
| KATEGORI → PENGELUARAN | 1:N | (0,N) - (1,1) | ✓ Foreign Key di PENGELUARAN |
| PESANAN ↔ LAYANAN | M:N | (1,N) - (0,N) | ✓ Junction Table |
| PESANAN ↔ PRODUK | M:N | (0,N) - (0,N) | ✓ Junction Table |
| PESANAN → PEMBAYARAN | 1:N | (0,N) - (1,1) | ✓ Foreign Key di PEMBAYARAN |
| PESANAN → PENGIRIMAN | 1:N | **(0,2)** - (1,1) | ✓ Foreign Key di PENGIRIMAN |

### 5.2 Cardinality Enforcement

**Cardinality yang Perlu Database Constraint:**

```sql
-- PESANAN harus punya minimal 1 DETAIL_LAYANAN
-- Implementasi: trigger atau application logic

DELIMITER $$
CREATE TRIGGER check_pesanan_has_layanan
BEFORE UPDATE ON pesanan
FOR EACH ROW
BEGIN
  IF NEW.status_cucian != 'diterima' THEN
    IF (SELECT COUNT(*) FROM detail_layanan WHERE id_pesanan = NEW.id_pesanan) = 0 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Pesanan harus memiliki minimal 1 layanan';
    END IF;
  END IF;
END$$
DELIMITER ;

-- PENGIRIMAN: maksimal 2 per pesanan (1 jemput, 1 antar)
DELIMITER $$
CREATE TRIGGER check_pengiriman_limit
BEFORE INSERT ON pengiriman
FOR EACH ROW
BEGIN
  DECLARE jml_pengiriman INT;
  DECLARE jml_jenis INT;
  
  SELECT COUNT(*) INTO jml_pengiriman
  FROM pengiriman
  WHERE id_pesanan = NEW.id_pesanan;
  
  IF jml_pengiriman >= 2 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Pesanan maksimal 2 pengiriman (jemput dan antar)';
  END IF;
  
  SELECT COUNT(*) INTO jml_jenis
  FROM pengiriman
  WHERE id_pesanan = NEW.id_pesanan AND jenis = NEW.jenis;
  
  IF jml_jenis > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Jenis pengiriman sudah ada untuk pesanan ini';
  END IF;
END$$
DELIMITER ;
```

---

## 6. Cardinality Limits

### 6.1 Explicit Cardinality Constraints

| Entity/Relationship | Constraint | Enforcement Method |
|---------------------|------------|-------------------|
| PESANAN → LAYANAN | min: 1, max: ∞ | ✓ Trigger / App Logic |
| PESANAN → PRODUK | min: 0, max: ∞ | ✓ Natural (optional) |
| PESANAN → PENGIRIMAN | min: 0, **max: 2** | ⚠️ Need Trigger/Unique |
| PESANAN → PEMBAYARAN | min: 0, max: ∞ | ✓ Natural |
| PELANGGAN → PESANAN | min: 0, max: ∞ | ✓ Natural |

### 6.2 Implementation di Prisma + Trigger

**Option 1: Unique Constraint untuk Pengiriman**

```prisma
model Pengiriman {
  id_pengiriman Int              @id @default(autoincrement())
  id_pesanan    Int
  jenis         JenisPengiriman
  alamat        String           @db.VarChar(255)
  biaya         Decimal          @default(0) @db.Decimal(10, 2)
  status        StatusPengiriman @default(dijadwalkan)
  
  pesanan       Pesanan          @relation(fields: [id_pesanan], references: [id_pesanan])
  
  @@unique([id_pesanan, jenis])  // ✓ Enforce: max 1 jemput + 1 antar
  @@index([id_pesanan])
  @@map("pengiriman")
}
```

---

## 7. Weak Entity Sets

### 7.1 Analisis Weak vs Strong Entities

| Entity | Type | Reason |
|--------|------|--------|
| PELANGGAN | **Strong** | Punya kunci sendiri (id_pelanggan) |
| KATEGORI | **Strong** | Punya kunci sendiri (id_kategori) |
| LAYANAN | **Strong** | Punya kunci sendiri (id_layanan) |
| PRODUK | **Strong** | Punya kunci sendiri (id_produk) |
| PESANAN | **Strong** | Punya kunci sendiri (id_pesanan) |
| PEMBAYARAN | **Strong** | Punya kunci sendiri (id_pembayaran) |
| PENGIRIMAN | **Strong** | Punya kunci sendiri (id_pengiriman) |
| PENGELUARAN | **Strong** | Punya kunci sendiri (id_pengeluaran) |
| DETAIL_LAYANAN | **Weak** | Kunci gabungan (id_pesanan, id_layanan) |
| DETAIL_PRODUK | **Weak** | Kunci gabungan (id_pesanan, id_produk) |

### 7.2 Weak Entities yang Ada

**✓ DETAIL_LAYANAN dan DETAIL_PRODUK sudah correctly implemented as weak entities:**

- Tidak punya kunci independen
- Tergantung existence-nya pada PESANAN (owner entity)
- Cascade delete when PESANAN dihapus ✓

```prisma
model DetailLayanan {
  id_pesanan   Int
  id_layanan   Int
  // ... attributes
  
  pesanan      Pesanan @relation(
    fields: [id_pesanan], 
    references: [id_pesanan], 
    onDelete: Cascade  // ✓ Weak entity behavior
  )
  
  @@id([id_pesanan, id_layanan])  // ✓ Partial key
}
```

### 7.3 Rekomendasi: Potensial Weak Entity

**PENGELUARAN_ITEM** (jika pengeluaran perlu detail item):

```prisma
// Strong Entity
model Pengeluaran {
  id_pengeluaran   Int      @id @default(autoincrement())
  tgl_pengeluaran  DateTime
  keterangan       String
  total            Decimal  @db.Decimal(12, 2)
  metode           MetodePembayaran
  
  items            PengeluaranItem[]  // Weak entity
}

// Weak Entity: tidak bisa exist tanpa Pengeluaran
model PengeluaranItem {
  id_pengeluaran   Int
  nomor_urut       Int      // partial key (1, 2, 3, ...)
  id_kategori      Int
  nama_item        String
  jumlah           Decimal
  
  pengeluaran      Pengeluaran @relation(
    fields: [id_pengeluaran],
    references: [id_pengeluaran],
    onDelete: Cascade
  )
  
  @@id([id_pengeluaran, nomor_urut])  // Composite key
}
```

---

## 8. Specialization & Generalization

### 8.1 Current Design Analysis

Saat ini **KATEGORI** menggunakan discriminator `jenis` untuk 3 tipe:
- LAYANAN
- PRODUK
- PENGELUARAN (belum di schema, sesuai dokumen)

Ini adalah bentuk **Generalization** sederhana.

### 8.2 Specialization Options

**Option 1: Single Table (Current - BEST untuk kasus ini)**

```prisma
model Kategori {
  id_kategori   Int       @id @default(autoincrement())
  nama_kategori String    @unique @db.VarChar(50)
  jenis         JenisKategori  // Discriminator
  
  layanan       Layanan[]
  produk        Produk[]
  pengeluaran   Pengeluaran[]
}

enum JenisKategori {
  LAYANAN
  PRODUK
  PENGELUARAN
}
```

**✓ Keuntungan:**
- Sederhana
- Query mudah
- Tidak ada tabel tambahan

**✗ Kerugian:**
- Tidak ada atribut spesifik per jenis

---

**Option 2: Class Table Inheritance (jika perlu atribut spesifik)**

```prisma
// Superclass
model Kategori {
  id_kategori   Int       @id @default(autoincrement())
  nama_kategori String    @db.VarChar(50)
  jenis         JenisKategori
}

// Subclass untuk LAYANAN
model KategoriLayanan {
  id_kategori        Int      @id
  durasi_standar_min Int?     // Atribut khusus layanan
  prioritas          Int?     @default(1)
  
  kategori           Kategori @relation(fields: [id_kategori], references: [id_kategori])
  layanan            Layanan[]
}

// Subclass untuk PRODUK
model KategoriProduk {
  id_kategori    Int      @id
  satuan_default String?  // Atribut khusus produk
  margin_persen  Decimal? @db.Decimal(5,2)
  
  kategori       Kategori @relation(fields: [id_kategori], references: [id_kategori])
  produk         Produk[]
}
```

**Rekomendasi:** Tetap gunakan **Option 1** (single table) karena:
1. Tidak ada atribut spesifik yang signifikan per jenis kategori
2. Lebih sederhana untuk maintain
3. Performance lebih baik (no additional joins)

### 8.3 Potensial Specialization: PENGGUNA System

Jika di masa depan ada user management:

```prisma
// Generalization: Pengguna
model Pengguna {
  id_pengguna Int      @id @default(autoincrement())
  username    String   @unique
  password    String
  email       String   @unique
  role        RolePengguna
  created_at  DateTime @default(now())
}

enum RolePengguna {
  ADMIN
  KASIR
  PEMILIK
  KURIR
}

// Specialization: Karyawan (kasir, kurir)
model Karyawan {
  id_karyawan  Int      @id @default(autoincrement())
  id_pengguna  Int      @unique
  nama         String
  no_hp        String
  alamat       String
  tgl_bergabung DateTime @default(now())
  gaji_pokok   Decimal  @db.Decimal(12,2)
  
  pengguna     Pengguna @relation(fields: [id_pengguna], references: [id_pengguna])
  
  // Relationships
  pesanan_ditangani Pesanan[] @relation("KasirPesanan")
  pengiriman        Pengiriman[] @relation("KurirPengiriman")
}
```

---

## 9. Aggregation

### 9.1 Konsep Aggregation

Aggregation adalah relationship antara relationship dengan entity. Berguna ketika kita perlu menghubungkan sebuah relationship sebagai satu kesatuan dengan entity lain.

### 9.2 Current Design: Tidak Ada Aggregation (OK)

Untuk kasus laundry sederhana ini, aggregation tidak diperlukan.

### 9.3 Contoh Potensial Aggregation

**Scenario: EVALUASI Kualitas Layanan**

Jika ingin pelanggan bisa review **kombinasi pesanan-layanan tertentu**:

```
AGREGASI: (PESANAN - LAYANAN) → EVALUASI
```

```prisma
// Relationship yang diagregasi
model DetailLayanan {
  id_pesanan   Int
  id_layanan   Int
  jumlah       Decimal
  harga_satuan Decimal
  subtotal     Decimal
  
  pesanan      Pesanan @relation(fields: [id_pesanan], references: [id_pesanan])
  layanan      Layanan @relation(fields: [id_layanan], references: [id_layanan])
  
  // Aggregation: Evaluasi untuk kombinasi pesanan-layanan ini
  evaluasi     EvaluasiLayanan?
  
  @@id([id_pesanan, id_layanan])
}

// Entity yang merelasikan aggregation
model EvaluasiLayanan {
  id_evaluasi  Int      @id @default(autoincrement())
  id_pesanan   Int
  id_layanan   Int
  rating       Int      @db.TinyInt  // 1-5
  komentar     String?  @db.Text
  tgl_evaluasi DateTime @default(now())
  
  detail_layanan DetailLayanan @relation(
    fields: [id_pesanan, id_layanan],
    references: [id_pesanan, id_layanan]
  )
  
  @@unique([id_pesanan, id_layanan])
}
```

---

## 10. Binary vs N-ary Relationship Sets

### 10.1 Current Status: All Binary ✓

Semua relationship dalam database Clean Up Laundry adalah **binary** (melibatkan 2 entity).

**Keuntungan:**
- Lebih mudah dipahami
- Lebih mudah di-maintain
- Mapping ke relational model straightforward

### 10.2 When to Use N-ary (Ternary)?

**Contoh Ternary Relationship yang Mungkin Diperlukan:**

**Scenario: PENUGASAN Pengiriman ke Kurir**

```
TERNARY: PESANAN - PENGIRIMAN - KARYAWAN (kurir)
```

Relasi ini menunjukkan: "Pesanan X dengan Pengiriman jenis Y ditugaskan ke Karyawan Z"

```prisma
model PenugasanPengiriman {
  id_penugasan  Int      @id @default(autoincrement())
  id_pesanan    Int
  id_pengiriman Int      @unique
  id_karyawan   Int      // Kurir yang bertugas
  tgl_penugasan DateTime @default(now())
  catatan       String?  @db.Text
  
  pesanan       Pesanan     @relation(fields: [id_pesanan], references: [id_pesanan])
  pengiriman    Pengiriman  @relation(fields: [id_pengiriman], references: [id_pengiriman])
  karyawan      Karyawan    @relation(fields: [id_karyawan], references: [id_karyawan])
  
  @@index([id_pesanan])
  @@index([id_karyawan])
}
```

**Rekomendasi:** Untuk saat ini, tetap gunakan binary relationships. Tambahkan ternary hanya jika ada kebutuhan bisnis yang jelas.

---

## 11. Functional Dependencies

### 11.1 FD Analysis (dari Dokumen Normalisasi)

Sudah dianalisis dengan baik di dokumen normalisasi Anda. Berikut ringkasannya:

**DETAIL_LAYANAN:**
- `(id_pesanan, id_layanan)` → `jumlah, harga_satuan, subtotal`
- `id_layanan` → `nama_layanan, id_kategori, harga, satuan, estimasi_hari` ✓ (dipisah ke LAYANAN)
- `(jumlah, harga_satuan)` → `subtotal` ⚠️ (derived attribute)

**DETAIL_PRODUK:**
- `(id_pesanan, id_produk)` → `qty, harga_satuan, subtotal`
- `id_produk` → `nama_produk, id_kategori, harga, stok` ✓ (dipisah ke PRODUK)
- `(qty, harga_satuan)` → `subtotal` ⚠️ (derived attribute)

**PESANAN:**
- `id_pesanan` → `id_pelanggan, tgl_masuk, tgl_selesai, status_cucian, total`
- `id_pelanggan` → `nama, no_hp, alamat` ✓ (dipisah ke PELANGGAN)

**PELANGGAN:**
- `id_pelanggan` → `nama, no_hp, alamat`
- `no_hp` → `id_pelanggan, nama, alamat` ✓ (candidate key)

### 11.2 Additional FD untuk Validation

```sql
-- Functional Dependencies yang perlu divalidasi via trigger/app logic:

-- FD1: Status pembayaran tergantung total bayar vs total pesanan
-- total_bayar >= total_pesanan → status_pembayaran = 'lunas'
-- total_bayar < total_pesanan → status_pembayaran = 'sebagian'

-- FD2: Status cucian memiliki sequence
-- 'diterima' → 'dicuci' → 'disetrika' → 'siap' → 'selesai'

-- FD3: tgl_selesai hanya terisi jika status_cucian = 'selesai'
```

---

## 12. Normalization (Extended Analysis)

### 12.1 Current Normalization Status

**✓ Semua tabel sudah dalam BCNF**, kecuali:
- `subtotal` di DETAIL_LAYANAN (derived)
- `subtotal` di DETAIL_PRODUK (derived)
- `total` di PESANAN (derived)

### 12.2 Denormalization Decisions (Controlled)

**Decision 1: Keep `subtotal` and `total`**

✓ **Justified** karena:
1. Performance: Cepat untuk laporan omzet
2. Historical integrity: Nilai nota tidak berubah
3. Controlled: Dijaga oleh trigger/computed column

**Implementation:**

```sql
-- Option 1: Computed/Generated Column (MySQL 5.7+)
ALTER TABLE detail_layanan
MODIFY COLUMN subtotal DECIMAL(12,2) 
AS (jumlah * harga_satuan) STORED;

-- Option 2: Trigger (lebih flexible)
DELIMITER $$
CREATE TRIGGER calculate_detail_layanan_subtotal
BEFORE INSERT ON detail_layanan
FOR EACH ROW
BEGIN
  SET NEW.subtotal = NEW.jumlah * NEW.harga_satuan;
END$$

CREATE TRIGGER update_detail_layanan_subtotal
BEFORE UPDATE ON detail_layanan
FOR EACH ROW
BEGIN
  SET NEW.subtotal = NEW.jumlah * NEW.harga_satuan;
END$$
DELIMITER ;
```

### 12.3 Normalization untuk Query Optimization

**Denormalization Strategy untuk Laporan:**

```prisma
// Materialized View sebagai tabel terpisah
model LaporanHarian {
  id          Int      @id @default(autoincrement())
  tanggal     DateTime @db.Date
  jumlah_pesanan     Int
  total_omzet        Decimal @db.Decimal(12,2)
  total_tunai        Decimal @db.Decimal(12,2)
  total_qris         Decimal @db.Decimal(12,2)
  total_transfer     Decimal @db.Decimal(12,2)
  berat_total_kg     Decimal @db.Decimal(10,2)
  last_updated       DateTime @default(now())
  
  @@unique([tanggal])
  @@map("laporan_harian")
}
```

---

**(Bersambung ke Part 2...)**

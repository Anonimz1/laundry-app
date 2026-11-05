# Database Enhancement Analysis: Clean Up Laundry - Part 2
## Stored Procedures, Functions, Security, ORM Patterns

---

## 13. Stored Functions

### 13.1 Functions untuk Business Logic

```sql
-- Function: Hitung total pesanan
DELIMITER $$
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
DELIMITER ;

-- Usage:
-- SELECT id_pesanan, fn_calculate_pesanan_total(id_pesanan) as total FROM pesanan;
```

```sql
-- Function: Cek status pembayaran pesanan
DELIMITER $$
CREATE FUNCTION fn_get_payment_status(p_id_pesanan INT)
RETURNS VARCHAR(20)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total_pesanan DECIMAL(12,2);
  DECLARE v_total_bayar DECIMAL(12,2);
  DECLARE v_status VARCHAR(20);
  
  -- Get total pesanan
  SELECT total INTO v_total_pesanan
  FROM pesanan
  WHERE id_pesanan = p_id_pesanan;
  
  -- Get total sudah dibayar
  SELECT COALESCE(SUM(jumlah), 0) INTO v_total_bayar
  FROM pembayaran
  WHERE id_pesanan = p_id_pesanan 
    AND status != 'batal';
  
  -- Determine status
  IF v_total_bayar = 0 THEN
    SET v_status = 'belum_bayar';
  ELSEIF v_total_bayar >= v_total_pesanan THEN
    SET v_status = 'lunas';
  ELSE
    SET v_status = 'sebagian';
  END IF;
  
  RETURN v_status;
END$$
DELIMITER ;
```

```sql
-- Function: Hitung umur pesanan (dalam hari)
DELIMITER $$
CREATE FUNCTION fn_calculate_order_age(p_tgl_masuk DATETIME)
RETURNS INT
DETERMINISTIC
BEGIN
  RETURN DATEDIFF(NOW(), p_tgl_masuk);
END$$
DELIMITER ;
```

```sql
-- Function: Cek apakah pesanan terlambat
DELIMITER $$
CREATE FUNCTION fn_is_order_late(
  p_id_pesanan INT,
  p_tgl_masuk DATETIME,
  p_status_cucian VARCHAR(20)
)
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_max_estimasi INT;
  DECLARE v_umur_pesanan INT;
  
  -- Ambil estimasi terlama dari layanan yang dipesan
  SELECT MAX(l.estimasi_hari) INTO v_max_estimasi
  FROM detail_layanan dl
  JOIN layanan l ON dl.id_layanan = l.id_layanan
  WHERE dl.id_pesanan = p_id_pesanan;
  
  -- Hitung umur pesanan
  SET v_umur_pesanan = DATEDIFF(NOW(), p_tgl_masuk);
  
  -- Pesanan terlambat jika belum selesai dan melewati estimasi
  IF p_status_cucian != 'selesai' AND v_umur_pesanan > v_max_estimasi THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END$$
DELIMITER ;
```

```sql
-- Function: Format nomor HP
DELIMITER $$
CREATE FUNCTION fn_format_phone(p_no_hp VARCHAR(15))
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
  -- Convert 08xx to +628xx
  IF LEFT(p_no_hp, 1) = '0' THEN
    RETURN CONCAT('+62', SUBSTRING(p_no_hp, 2));
  ELSE
    RETURN p_no_hp;
  END IF;
END$$
DELIMITER ;
```

---

## 14. Stored Procedures

### 14.1 Procedures untuk Transactions

```sql
-- Procedure: Create pesanan lengkap (with transaction)
DELIMITER $$
CREATE PROCEDURE sp_create_pesanan(
  IN p_id_pelanggan INT,
  IN p_layanan_json JSON,  -- [{"id_layanan":1, "jumlah":5}]
  IN p_produk_json JSON,   -- [{"id_produk":1, "qty":2}]
  IN p_jenis_kirim VARCHAR(20),
  IN p_alamat_kirim VARCHAR(255),
  IN p_biaya_kirim DECIMAL(10,2),
  OUT p_id_pesanan INT
)
BEGIN
  DECLARE v_idx INT DEFAULT 0;
  DECLARE v_count INT;
  DECLARE v_id_layanan INT;
  DECLARE v_jumlah DECIMAL(6,2);
  DECLARE v_harga DECIMAL(10,2);
  DECLARE v_id_produk INT;
  DECLARE v_qty INT;
  DECLARE v_stok INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- 1. Insert pesanan
  INSERT INTO pesanan (id_pelanggan, tgl_masuk, status_cucian, total)
  VALUES (p_id_pelanggan, NOW(), 'diterima', 0);
  
  SET p_id_pesanan = LAST_INSERT_ID();
  
  -- 2. Insert detail layanan
  SET v_count = JSON_LENGTH(p_layanan_json);
  WHILE v_idx < v_count DO
    SET v_id_layanan = JSON_EXTRACT(p_layanan_json, CONCAT('$[', v_idx, '].id_layanan'));
    SET v_jumlah = JSON_EXTRACT(p_layanan_json, CONCAT('$[', v_idx, '].jumlah'));
    
    -- Get current price
    SELECT harga INTO v_harga FROM layanan WHERE id_layanan = v_id_layanan;
    
    INSERT INTO detail_layanan (id_pesanan, id_layanan, jumlah, harga_satuan, subtotal)
    VALUES (p_id_pesanan, v_id_layanan, v_jumlah, v_harga, v_jumlah * v_harga);
    
    SET v_idx = v_idx + 1;
  END WHILE;
  
  -- 3. Insert detail produk (if any)
  IF p_produk_json IS NOT NULL THEN
    SET v_idx = 0;
    SET v_count = JSON_LENGTH(p_produk_json);
    
    WHILE v_idx < v_count DO
      SET v_id_produk = JSON_EXTRACT(p_produk_json, CONCAT('$[', v_idx, '].id_produk'));
      SET v_qty = JSON_EXTRACT(p_produk_json, CONCAT('$[', v_idx, '].qty'));
      
      -- Check stock
      SELECT harga, stok INTO v_harga, v_stok 
      FROM produk 
      WHERE id_produk = v_id_produk;
      
      IF v_stok < v_qty THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Stok produk tidak mencukupi';
      END IF;
      
      -- Insert detail
      INSERT INTO detail_produk (id_pesanan, id_produk, qty, harga_satuan, subtotal)
      VALUES (p_id_pesanan, v_id_produk, v_qty, v_harga, v_qty * v_harga);
      
      -- Update stock
      UPDATE produk SET stok = stok - v_qty WHERE id_produk = v_id_produk;
      
      SET v_idx = v_idx + 1;
    END WHILE;
  END IF;
  
  -- 4. Insert pengiriman (if any)
  IF p_jenis_kirim IS NOT NULL THEN
    INSERT INTO pengiriman (id_pesanan, jenis, alamat, biaya, status)
    VALUES (p_id_pesanan, p_jenis_kirim, p_alamat_kirim, p_biaya_kirim, 'dijadwalkan');
  END IF;
  
  -- 5. Update total pesanan
  UPDATE pesanan 
  SET total = fn_calculate_pesanan_total(p_id_pesanan)
  WHERE id_pesanan = p_id_pesanan;
  
  COMMIT;
END$$
DELIMITER ;

-- Usage:
-- CALL sp_create_pesanan(
--   1, 
--   '[{"id_layanan":1, "jumlah":5}]',
--   '[{"id_produk":1, "qty":2}]',
--   'antar',
--   'Jl. Test 123',
--   5000,
--   @new_id_pesanan
-- );
-- SELECT @new_id_pesanan;
```

```sql
-- Procedure: Process pembayaran
DELIMITER $$
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
  DECLARE v_sisa DECIMAL(12,2);
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- Get total pesanan
  SELECT total INTO v_total_pesanan
  FROM pesanan
  WHERE id_pesanan = p_id_pesanan;
  
  -- Get total sudah dibayar
  SELECT COALESCE(SUM(jumlah), 0) INTO v_total_bayar
  FROM pembayaran
  WHERE id_pesanan = p_id_pesanan AND status != 'batal';
  
  -- Calculate remaining
  SET v_sisa = v_total_pesanan - v_total_bayar;
  
  -- Validate payment amount
  IF p_jumlah <= 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Jumlah pembayaran harus lebih dari 0';
  END IF;
  
  IF p_jumlah > v_sisa THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Jumlah pembayaran melebihi sisa tagihan';
  END IF;
  
  -- Determine status
  IF (v_total_bayar + p_jumlah) >= v_total_pesanan THEN
    SET p_status_result = 'lunas';
  ELSE
    SET p_status_result = 'sebagian';
  END IF;
  
  -- Insert payment
  INSERT INTO pembayaran (id_pesanan, metode, jumlah, tgl_bayar, status)
  VALUES (p_id_pesanan, p_metode, p_jumlah, NOW(), p_status_result);
  
  SET p_id_pembayaran = LAST_INSERT_ID();
  
  COMMIT;
END$$
DELIMITER ;
```

```sql
-- Procedure: Update status pesanan
DELIMITER $$
CREATE PROCEDURE sp_update_order_status(
  IN p_id_pesanan INT,
  IN p_new_status VARCHAR(20)
)
BEGIN
  DECLARE v_current_status VARCHAR(20);
  DECLARE v_valid BOOLEAN DEFAULT FALSE;
  
  -- Get current status
  SELECT status_cucian INTO v_current_status
  FROM pesanan
  WHERE id_pesanan = p_id_pesanan;
  
  -- Validate status transition
  IF v_current_status = 'diterima' AND p_new_status = 'dicuci' THEN
    SET v_valid = TRUE;
  ELSEIF v_current_status = 'dicuci' AND p_new_status = 'disetrika' THEN
    SET v_valid = TRUE;
  ELSEIF v_current_status = 'disetrika' AND p_new_status = 'siap' THEN
    SET v_valid = TRUE;
  ELSEIF v_current_status = 'siap' AND p_new_status = 'selesai' THEN
    SET v_valid = TRUE;
  END IF;
  
  IF NOT v_valid THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Invalid status transition';
  END IF;
  
  -- Update status
  UPDATE pesanan
  SET status_cucian = p_new_status,
      tgl_selesai = IF(p_new_status = 'selesai', NOW(), tgl_selesai)
  WHERE id_pesanan = p_id_pesanan;
END$$
DELIMITER ;
```

```sql
-- Procedure: Cancel pesanan
DELIMITER $$
CREATE PROCEDURE sp_cancel_order(
  IN p_id_pesanan INT,
  IN p_reason VARCHAR(255)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  
  START TRANSACTION;
  
  -- Restore product stock
  UPDATE produk p
  JOIN detail_produk dp ON p.id_produk = dp.id_produk
  SET p.stok = p.stok + dp.qty
  WHERE dp.id_pesanan = p_id_pesanan;
  
  -- Cancel all payments
  UPDATE pembayaran
  SET status = 'batal'
  WHERE id_pesanan = p_id_pesanan;
  
  -- Log cancellation (optional: create audit table)
  -- INSERT INTO audit_log (entity_type, entity_id, action, reason, created_at)
  -- VALUES ('pesanan', p_id_pesanan, 'CANCEL', p_reason, NOW());
  
  -- Delete order (cascade will handle details)
  DELETE FROM pesanan WHERE id_pesanan = p_id_pesanan;
  
  COMMIT;
END$$
DELIMITER ;
```

### 14.2 Procedures untuk Laporan

```sql
-- Procedure: Generate laporan omzet harian
DELIMITER $$
CREATE PROCEDURE sp_laporan_omzet_harian(
  IN p_tanggal_mulai DATE,
  IN p_tanggal_akhir DATE
)
BEGIN
  SELECT 
    DATE(p.tgl_masuk) as tanggal,
    COUNT(DISTINCT p.id_pesanan) as jumlah_pesanan,
    SUM(p.total) as total_omzet,
    SUM(CASE WHEN pm.metode = 'tunai' THEN pm.jumlah ELSE 0 END) as total_tunai,
    SUM(CASE WHEN pm.metode = 'QRIS' THEN pm.jumlah ELSE 0 END) as total_qris,
    SUM(CASE WHEN pm.metode = 'transfer' THEN pm.jumlah ELSE 0 END) as total_transfer,
    SUM(dl.jumlah) as total_kg_cucian
  FROM pesanan p
  LEFT JOIN pembayaran pm ON p.id_pesanan = pm.id_pesanan AND pm.status != 'batal'
  LEFT JOIN detail_layanan dl ON p.id_pesanan = dl.id_pesanan
  WHERE DATE(p.tgl_masuk) BETWEEN p_tanggal_mulai AND p_tanggal_akhir
  GROUP BY DATE(p.tgl_masuk)
  ORDER BY tanggal DESC;
END$$
DELIMITER ;
```

```sql
-- Procedure: Layanan terpopuler
DELIMITER $$
CREATE PROCEDURE sp_layanan_terpopuler(
  IN p_limit INT
)
BEGIN
  SELECT 
    l.id_layanan,
    l.nama_layanan,
    k.nama_kategori,
    COUNT(dl.id_pesanan) as jumlah_transaksi,
    SUM(dl.jumlah) as total_kg,
    SUM(dl.subtotal) as total_pendapatan
  FROM layanan l
  JOIN kategori k ON l.id_kategori = k.id_kategori
  LEFT JOIN detail_layanan dl ON l.id_layanan = dl.id_layanan
  GROUP BY l.id_layanan, l.nama_layanan, k.nama_kategori
  ORDER BY total_pendapatan DESC
  LIMIT p_limit;
END$$
DELIMITER ;
```

---

## 15. Data Access Layer (DAL)

### 15.1 Repository Pattern Implementation

```javascript
// src/domain/repositories/IPesananRepository.js
class IPesananRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findAll(filters) { throw new Error('Not implemented'); }
  async create(pesanan) { throw new Error('Not implemented'); }
  async update(id, data) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
  async findByStatus(status) { throw new Error('Not implemented'); }
  async findByPelanggan(idPelanggan) { throw new Error('Not implemented'); }
  async findOverdue() { throw new Error('Not implemented'); }
}

module.exports = IPesananRepository;
```

```javascript
// src/infrastructure/repositories/PesananRepository.js
const { PrismaClient } = require('@prisma/client');
const IPesananRepository = require('../../domain/repositories/IPesananRepository');

class PesananRepository extends IPesananRepository {
  constructor(prismaClient) {
    super();
    this.prisma = prismaClient;
  }

  async findById(id) {
    return await this.prisma.pesanan.findUnique({
      where: { id_pesanan: id },
      include: {
        pelanggan: true,
        detail_layanan: {
          include: { layanan: true }
        },
        detail_produk: {
          include: { produk: true }
        },
        pembayaran: true,
        pengiriman: true
      }
    });
  }

  async findAll(filters = {}) {
    const where = {};
    
    if (filters.status) {
      where.status_cucian = filters.status;
    }
    
    if (filters.pelangganId) {
      where.id_pelanggan = filters.pelangganId;
    }
    
    if (filters.tanggalMulai && filters.tanggalAkhir) {
      where.tgl_masuk = {
        gte: filters.tanggalMulai,
        lte: filters.tanggalAkhir
      };
    }
    
    return await this.prisma.pesanan.findMany({
      where,
      include: {
        pelanggan: true,
        detail_layanan: { include: { layanan: true } },
        detail_produk: { include: { produk: true } },
        pembayaran: true,
        pengiriman: true
      },
      orderBy: { tgl_masuk: 'desc' }
    });
  }

  async create(pesanan) {
    return await this.prisma.pesanan.create({
      data: pesanan,
      include: {
        pelanggan: true,
        detail_layanan: true,
        detail_produk: true
      }
    });
  }

  async update(id, data) {
    return await this.prisma.pesanan.update({
      where: { id_pesanan: id },
      data
    });
  }

  async delete(id) {
    return await this.prisma.pesanan.delete({
      where: { id_pesanan: id }
    });
  }

  async findByStatus(status) {
    return await this.prisma.pesanan.findMany({
      where: { status_cucian: status },
      include: {
        pelanggan: true,
        detail_layanan: { include: { layanan: true } }
      },
      orderBy: { tgl_masuk: 'asc' }
    });
  }

  async findByPelanggan(idPelanggan) {
    return await this.prisma.pesanan.findMany({
      where: { id_pelanggan: idPelanggan },
      include: {
        detail_layanan: { include: { layanan: true } },
        detail_produk: { include: { produk: true } },
        pembayaran: true,
        pengiriman: true
      },
      orderBy: { tgl_masuk: 'desc' }
    });
  }

  async findOverdue() {
    // Pesanan yang melewati estimasi tapi belum selesai
    const pesananAktif = await this.prisma.pesanan.findMany({
      where: {
        status_cucian: {
          not: 'selesai'
        }
      },
      include: {
        pelanggan: true,
        detail_layanan: {
          include: { layanan: true }
        }
      }
    });

    // Filter yang terlambat (manual karena butuh kalkulasi)
    return pesananAktif.filter(pesanan => {
      const maxEstimasi = Math.max(
        ...pesanan.detail_layanan.map(dl => dl.layanan.estimasi_hari)
      );
      const umurPesanan = Math.floor(
        (Date.now() - pesanan.tgl_masuk.getTime()) / (1000 * 60 * 60 * 24)
      );
      return umurPesanan > maxEstimasi;
    });
  }

  // Advanced: Pagination
  async findAllPaginated(page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const where = this._buildWhereClause(filters);

    const [data, total] = await Promise.all([
      this.prisma.pesanan.findMany({
        where,
        skip,
        take: limit,
        include: {
          pelanggan: true,
          detail_layanan: { include: { layanan: true } }
        },
        orderBy: { tgl_masuk: 'desc' }
      }),
      this.prisma.pesanan.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  _buildWhereClause(filters) {
    const where = {};
    
    if (filters.status) where.status_cucian = filters.status;
    if (filters.pelangganId) where.id_pelanggan = parseInt(filters.pelangganId);
    if (filters.search) {
      where.pelanggan = {
        OR: [
          { nama: { contains: filters.search } },
          { no_hp: { contains: filters.search } }
        ]
      };
    }
    
    return where;
  }
}

module.exports = PesananRepository;
```

### 15.2 Generic Repository Pattern

```javascript
// src/infrastructure/repositories/BaseRepository.js
class BaseRepository {
  constructor(prisma, modelName) {
    this.prisma = prisma;
    this.model = prisma[modelName];
  }

  async findById(id, include = {}) {
    const idField = `id_${this.model.name}`;
    return await this.model.findUnique({
      where: { [idField]: id },
      include
    });
  }

  async findAll(where = {}, include = {}, orderBy = {}) {
    return await this.model.findMany({
      where,
      include,
      orderBy
    });
  }

  async create(data) {
    return await this.model.create({ data });
  }

  async update(id, data) {
    const idField = `id_${this.model.name}`;
    return await this.model.update({
      where: { [idField]: id },
      data
    });
  }

  async delete(id) {
    const idField = `id_${this.model.name}`;
    return await this.model.delete({
      where: { [idField]: id }
    });
  }

  async count(where = {}) {
    return await this.model.count({ where });
  }

  async exists(id) {
    const idField = `id_${this.model.name}`;
    const count = await this.model.count({
      where: { [idField]: id }
    });
    return count > 0;
  }
}

module.exports = BaseRepository;
```

---

## 16. ORM Best Practices with Prisma

### 16.1 Query Optimization

```javascript
// BAD: N+1 Query Problem
async function getPesananBad() {
  const pesananList = await prisma.pesanan.findMany();
  
  for (const pesanan of pesananList) {
    // N queries untuk pelanggan
    pesanan.pelanggan = await prisma.pelanggan.findUnique({
      where: { id_pelanggan: pesanan.id_pelanggan }
    });
  }
  
  return pesananList;
}

// GOOD: Single Query with Include
async function getPesananGood() {
  return await prisma.pesanan.findMany({
    include: {
      pelanggan: true,  // Eager loading, only 1 query
      detail_layanan: {
        include: { layanan: true }
      },
      pembayaran: true
    }
  });
}
```

```javascript
// Select only needed fields
async function getPesananMinimal() {
  return await prisma.pesanan.findMany({
    select: {
      id_pesanan: true,
      tgl_masuk: true,
      status_cucian: true,
      total: true,
      pelanggan: {
        select: {
          nama: true,
          no_hp: true
        }
      }
    }
  });
}
```

### 16.2 Transaction Management

```javascript
// src/application/services/PesananService.js
class PesananService {
  constructor(unitOfWork) {
    this.uow = unitOfWork;
  }

  async createPesananWithDetails(data) {
    return await this.uow.executeTransaction(async (prisma) => {
      // 1. Create pesanan
      const pesanan = await prisma.pesanan.create({
        data: {
          id_pelanggan: data.idPelanggan,
          tgl_masuk: new Date(),
          status_cucian: 'diterima',
          total: 0
        }
      });

      // 2. Create detail layanan
      let totalLayanan = 0;
      for (const item of data.layanan) {
        const layanan = await prisma.layanan.findUnique({
          where: { id_layanan: item.idLayanan }
        });

        const subtotal = item.jumlah * layanan.harga;
        totalLayanan += subtotal;

        await prisma.detailLayanan.create({
          data: {
            id_pesanan: pesanan.id_pesanan,
            id_layanan: item.idLayanan,
            jumlah: item.jumlah,
            harga_satuan: layanan.harga,
            subtotal
          }
        });
      }

      // 3. Create detail produk & update stock
      let totalProduk = 0;
      if (data.produk) {
        for (const item of data.produk) {
          const produk = await prisma.produk.findUnique({
            where: { id_produk: item.idProduk }
          });

          if (produk.stok < item.qty) {
            throw new Error(`Stok ${produk.nama_produk} tidak mencukupi`);
          }

          const subtotal = item.qty * produk.harga;
          totalProduk += subtotal;

          await prisma.detailProduk.create({
            data: {
              id_pesanan: pesanan.id_pesanan,
              id_produk: item.idProduk,
              qty: item.qty,
              harga_satuan: produk.harga,
              subtotal
            }
          });

          // Update stock
          await prisma.produk.update({
            where: { id_produk: item.idProduk },
            data: { stok: { decrement: item.qty } }
          });
        }
      }

      // 4. Create pengiriman if needed
      let biayaKirim = 0;
      if (data.pengiriman) {
        const pengiriman = await prisma.pengiriman.create({
          data: {
            id_pesanan: pesanan.id_pesanan,
            jenis: data.pengiriman.jenis,
            alamat: data.pengiriman.alamat,
            biaya: data.pengiriman.biaya,
            status: 'dijadwalkan'
          }
        });
        biayaKirim = data.pengiriman.biaya;
      }

      // 5. Update total pesanan
      const totalPesanan = totalLayanan + totalProduk + biayaKirim;
      await prisma.pesanan.update({
        where: { id_pesanan: pesanan.id_pesanan },
        data: { total: totalPesanan }
      });

      // Return full pesanan with relations
      return await prisma.pesanan.findUnique({
        where: { id_pesanan: pesanan.id_pesanan },
        include: {
          pelanggan: true,
          detail_layanan: { include: { layanan: true } },
          detail_produk: { include: { produk: true } },
          pengiriman: true
        }
      });
    });
  }
}

module.exports = PesananService;
```

### 16.3 Connection Pooling

```javascript
// src/infrastructure/database/prisma.client.js (Enhanced)
const { PrismaClient } = require('@prisma/client');

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
    
    // Connection pool configuration
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    
    // Query optimization
    errorFormat: 'pretty',
  });
};

// Global singleton pattern
if (!global.prisma) {
  global.prisma = prismaClientSingleton();
}

const prisma = global.prisma;

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
```

---

## 17. CQRS Pattern (Command Query Responsibility Segregation)

### 17.1 Separation of Commands and Queries

```javascript
// Commands (Write Operations)
// src/application/commands/CreatePesananCommand.js
class CreatePesananCommand {
  constructor(data) {
    this.idPelanggan = data.idPelanggan;
    this.layanan = data.layanan;
    this.produk = data.produk;
    this.pengiriman = data.pengiriman;
  }

  validate() {
    if (!this.idPelanggan) {
      throw new Error('ID Pelanggan harus diisi');
    }
    if (!this.layanan || this.layanan.length === 0) {
      throw new Error('Minimal 1 layanan harus dipilih');
    }
    // ... validation logic
  }
}

module.exports = CreatePesananCommand;
```

```javascript
// src/application/handlers/CreatePesananHandler.js
class CreatePesananHandler {
  constructor(pesananRepository, unitOfWork) {
    this.pesananRepository = pesananRepository;
    this.uow = unitOfWork;
  }

  async handle(command) {
    command.validate();
    
    return await this.uow.executeTransaction(async (prisma) => {
      // Transaction logic here
      const pesanan = await this.pesananRepository.create({
        id_pelanggan: command.idPelanggan,
        // ...
      });
      
      // ... create details, update stock, etc
      
      return pesanan;
    });
  }
}

module.exports = CreatePesananHandler;
```

```javascript
// Queries (Read Operations)
// src/application/queries/GetPesananByIdQuery.js
class GetPesananByIdQuery {
  constructor(idPesanan) {
    this.idPesanan = idPesanan;
  }
}

module.exports = GetPesananByIdQuery;
```

```javascript
// src/application/handlers/GetPesananByIdHandler.js
class GetPesananByIdHandler {
  constructor(pesananRepository) {
    this.pesananRepository = pesananRepository;
  }

  async handle(query) {
    const pesanan = await this.pesananRepository.findById(query.idPesanan);
    
    if (!pesanan) {
      throw new Error('Pesanan tidak ditemukan');
    }
    
    // Transform to DTO (Data Transfer Object)
    return {
      idPesanan: pesanan.id_pesanan,
      pelanggan: {
        nama: pesanan.pelanggan.nama,
        noHp: pesanan.pelanggan.no_hp
      },
      tglMasuk: pesanan.tgl_masuk,
      status: pesanan.status_cucian,
      total: pesanan.total,
      detailLayanan: pesanan.detail_layanan.map(dl => ({
        layanan: dl.layanan.nama_layanan,
        jumlah: dl.jumlah,
        harga: dl.harga_satuan,
        subtotal: dl.subtotal
      })),
      // ...
    };
  }
}

module.exports = GetPesananByIdHandler;
```

### 17.2 Read Model untuk Laporan

```javascript
// src/application/queries/GetLaporanOmzetQuery.js
class GetLaporanOmzetQuery {
  constructor(tanggalMulai, tanggalAkhir, groupBy = 'day') {
    this.tanggalMulai = tanggalMulai;
    this.tanggalAkhir = tanggalAkhir;
    this.groupBy = groupBy; // 'day', 'week', 'month'
  }
}

// src/application/handlers/GetLaporanOmzetHandler.js
class GetLaporanOmzetHandler {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async handle(query) {
    // Use raw SQL for complex reporting
    const result = await this.prisma.$queryRaw`
      SELECT 
        DATE(p.tgl_masuk) as tanggal,
        COUNT(DISTINCT p.id_pesanan) as jumlah_pesanan,
        SUM(p.total) as total_omzet,
        SUM(CASE WHEN pm.metode = 'tunai' THEN pm.jumlah ELSE 0 END) as total_tunai,
        SUM(CASE WHEN pm.metode = 'QRIS' THEN pm.jumlah ELSE 0 END) as total_qris
      FROM pesanan p
      LEFT JOIN pembayaran pm ON p.id_pesanan = pm.id_pesanan 
        AND pm.status != 'batal'
      WHERE p.tgl_masuk BETWEEN ${query.tanggalMulai} AND ${query.tanggalAkhir}
      GROUP BY DATE(p.tgl_masuk)
      ORDER BY tanggal DESC
    `;
    
    return result;
  }
}

module.exports = { GetLaporanOmzetQuery, GetLaporanOmzetHandler };
```

---

**(Bersambung ke Part 3...)**

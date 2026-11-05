# Database Enhancement Analysis: Clean Up Laundry - Part 3
## ACID Principles, Unit of Work, Security, SQL Injection Prevention

---

## 18. ACID Principles Implementation

### 18.1 Atomicity (All or Nothing)

**Scenario:** Create pesanan dengan multiple details harus sukses semua atau gagal semua.

```javascript
// src/infrastructure/unit-of-work/UnitOfWork.js (Enhanced)
class UnitOfWork {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Execute operations in a transaction (ATOMICITY)
   * All operations succeed or all fail
   */
  async executeTransaction(callback) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        return await callback(tx);
      }, {
        maxWait: 5000, // Wait max 5s for transaction
        timeout: 10000, // Transaction timeout 10s
        isolationLevel: 'Serializable' // Highest isolation
      });
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Execute with retry logic for deadlocks
   */
  async executeWithRetry(callback, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeTransaction(callback);
      } catch (error) {
        lastError = error;
        
        // Retry only for deadlock errors
        if (error.code === 'P2034' || error.message.includes('deadlock')) {
          console.log(`Deadlock detected, retrying (${attempt}/${maxRetries})...`);
          await this._delay(100 * attempt); // Exponential backoff
          continue;
        }
        
        throw error; // Other errors, don't retry
      }
    }
    
    throw lastError;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = UnitOfWork;
```

**Test Atomicity:**

```javascript
// Test: Pesanan creation fails if stock insufficient
async function testAtomicity() {
  const uow = new UnitOfWork(prisma);
  
  try {
    await uow.executeTransaction(async (tx) => {
      // 1. Create pesanan - SUCCESS
      const pesanan = await tx.pesanan.create({
        data: { id_pelanggan: 1, status_cucian: 'diterima', total: 0 }
      });
      
      // 2. Create detail layanan - SUCCESS
      await tx.detailLayanan.create({
        data: {
          id_pesanan: pesanan.id_pesanan,
          id_layanan: 1,
          jumlah: 5,
          harga_satuan: 8000,
          subtotal: 40000
        }
      });
      
      // 3. Create detail produk - WILL FAIL (insufficient stock)
      const produk = await tx.produk.findUnique({ where: { id_produk: 1 } });
      if (produk.stok < 100) {
        throw new Error('Stok tidak mencukupi'); // ← ROLLBACK triggered here
      }
      
      // This won't be reached
      await tx.detailProduk.create({
        data: { id_pesanan: pesanan.id_pesanan, id_produk: 1, qty: 100 }
      });
    });
  } catch (error) {
    // Result: Pesanan NOT created (rolled back) ✓
    // Result: DetailLayanan NOT created (rolled back) ✓
    console.log('Transaction rolled back:', error.message);
  }
}
```

### 18.2 Consistency (Valid State)

Consistency memastikan database selalu dalam state yang valid sesuai constraint.

**Database Constraints:**

```sql
-- Domain Constraints
ALTER TABLE layanan ADD CONSTRAINT check_harga_positive 
  CHECK (harga > 0);

ALTER TABLE produk ADD CONSTRAINT check_stok_non_negative 
  CHECK (stok >= 0);

ALTER TABLE detail_layanan ADD CONSTRAINT check_jumlah_positive 
  CHECK (jumlah > 0);

-- Referential Integrity
ALTER TABLE pesanan ADD CONSTRAINT fk_pesanan_pelanggan
  FOREIGN KEY (id_pelanggan) REFERENCES pelanggan(id_pelanggan)
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- Business Rule Constraints
ALTER TABLE pesanan ADD CONSTRAINT check_tgl_selesai_after_masuk
  CHECK (tgl_selesai IS NULL OR tgl_selesai >= tgl_masuk);
```

**Application-Level Consistency:**

```javascript
// src/domain/entities/Pesanan.js
class Pesanan {
  constructor(data) {
    this.id_pesanan = data.id_pesanan;
    this.id_pelanggan = data.id_pelanggan;
    this.tgl_masuk = data.tgl_masuk;
    this.tgl_selesai = data.tgl_selesai;
    this.status_cucian = data.status_cucian;
    this.total = data.total;
    
    this.validate();
  }

  validate() {
    // Invariants (must always be true)
    if (!this.id_pelanggan) {
      throw new Error('Pesanan must have a customer');
    }
    
    if (this.total < 0) {
      throw new Error('Total cannot be negative');
    }
    
    if (this.tgl_selesai && this.tgl_selesai < this.tgl_masuk) {
      throw new Error('Completion date cannot be before entry date');
    }
    
    // Status transitions validation
    const validStatuses = ['diterima', 'dicuci', 'disetrika', 'siap', 'selesai'];
    if (!validStatuses.includes(this.status_cucian)) {
      throw new Error(`Invalid status: ${this.status_cucian}`);
    }
  }

  // Business logic
  canBeUpdated() {
    return this.status_cucian !== 'selesai';
  }

  canBeCancelled() {
    return ['diterima', 'dicuci'].includes(this.status_cucian);
  }

  complete() {
    if (this.status_cucian !== 'siap') {
      throw new Error('Pesanan must be in "siap" status to be completed');
    }
    this.status_cucian = 'selesai';
    this.tgl_selesai = new Date();
  }
}

module.exports = Pesanan;
```

**Trigger untuk Consistency:**

```sql
-- Trigger: Pastikan pesanan punya minimal 1 layanan sebelum diproses
DELIMITER $$
CREATE TRIGGER enforce_pesanan_has_layanan
BEFORE UPDATE ON pesanan
FOR EACH ROW
BEGIN
  DECLARE detail_count INT;
  
  -- Only check if status is changing from 'diterima'
  IF OLD.status_cucian = 'diterima' AND NEW.status_cucian != 'diterima' THEN
    SELECT COUNT(*) INTO detail_count
    FROM detail_layanan
    WHERE id_pesanan = NEW.id_pesanan;
    
    IF detail_count = 0 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Pesanan harus memiliki minimal 1 layanan sebelum diproses';
    END IF;
  END IF;
END$$
DELIMITER ;

-- Trigger: Auto-calculate subtotal (Consistency)
DELIMITER $$
CREATE TRIGGER calculate_subtotal_before_insert
BEFORE INSERT ON detail_layanan
FOR EACH ROW
BEGIN
  SET NEW.subtotal = NEW.jumlah * NEW.harga_satuan;
END$$

CREATE TRIGGER calculate_subtotal_before_update
BEFORE UPDATE ON detail_layanan
FOR EACH ROW
BEGIN
  SET NEW.subtotal = NEW.jumlah * NEW.harga_satuan;
END$$
DELIMITER ;

-- Trigger: Update pesanan total when details change
DELIMITER $$
CREATE TRIGGER update_pesanan_total_after_detail_insert
AFTER INSERT ON detail_layanan
FOR EACH ROW
BEGIN
  UPDATE pesanan
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0) FROM detail_layanan WHERE id_pesanan = NEW.id_pesanan
  ) + (
    SELECT COALESCE(SUM(subtotal), 0) FROM detail_produk WHERE id_pesanan = NEW.id_pesanan
  ) + (
    SELECT COALESCE(SUM(biaya), 0) FROM pengiriman WHERE id_pesanan = NEW.id_pesanan
  )
  WHERE id_pesanan = NEW.id_pesanan;
END$$
DELIMITER ;
```

### 18.3 Isolation (Concurrent Transactions)

Isolation memastikan transaksi concurrent tidak saling mengganggu.

**Isolation Levels:**

```javascript
// Read Uncommitted - Lowest isolation (NOT RECOMMENDED)
await prisma.$transaction(
  async (tx) => { /* ... */ },
  { isolationLevel: 'ReadUncommitted' }
);

// Read Committed - Default for most databases
await prisma.$transaction(
  async (tx) => { /* ... */ },
  { isolationLevel: 'ReadCommitted' }
);

// Repeatable Read - Prevents non-repeatable reads
await prisma.$transaction(
  async (tx) => { /* ... */ },
  { isolationLevel: 'RepeatableRead' }
);

// Serializable - Highest isolation (prevents phantom reads)
await prisma.$transaction(
  async (tx) => { /* ... */ },
  { isolationLevel: 'Serializable' }
);
```

**Example: Prevent Double Booking (Race Condition)**

```javascript
// BAD: Race condition
async function bookLayananBad(idLayanan, jumlah) {
  // Thread A and B both check stock
  const layanan = await prisma.layanan.findUnique({
    where: { id_layanan: idLayanan }
  });
  
  // Both see enough capacity
  if (layanan.kapasitas_tersedia >= jumlah) {
    // Both proceed to book → OVERBOOKING!
    await prisma.layanan.update({
      where: { id_layanan: idLayanan },
      data: { kapasitas_tersedia: { decrement: jumlah } }
    });
  }
}

// GOOD: Use transaction with proper isolation
async function bookLayananGood(idLayanan, jumlah) {
  return await prisma.$transaction(async (tx) => {
    // SELECT FOR UPDATE - locks the row
    const layanan = await tx.$queryRaw`
      SELECT * FROM layanan WHERE id_layanan = ${idLayanan} FOR UPDATE
    `;
    
    if (layanan[0].kapasitas_tersedia < jumlah) {
      throw new Error('Kapasitas tidak mencukupi');
    }
    
    // Safe to update, row is locked
    return await tx.layanan.update({
      where: { id_layanan: idLayanan },
      data: { kapasitas_tersedia: { decrement: jumlah } }
    });
  }, {
    isolationLevel: 'Serializable'
  });
}
```

**Optimistic Locking:**

```prisma
model Pesanan {
  id_pesanan     Int       @id @default(autoincrement())
  // ... other fields
  version        Int       @default(1)  // ← Optimistic lock version
  
  @@map("pesanan")
}
```

```javascript
async function updatePesananOptimistic(id, newData) {
  const pesanan = await prisma.pesanan.findUnique({
    where: { id_pesanan: id }
  });
  
  try {
    return await prisma.pesanan.update({
      where: {
        id_pesanan: id,
        version: pesanan.version  // ← Check version
      },
      data: {
        ...newData,
        version: { increment: 1 }  // ← Increment version
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('Data has been modified by another user. Please refresh.');
    }
    throw error;
  }
}
```

### 18.4 Durability (Persistence)

Durability memastikan committed transaction tetap persisted walaupun system crash.

**MySQL Configuration (my.cnf):**

```ini
[mysqld]
# InnoDB settings for durability
innodb_flush_log_at_trx_commit = 1  # Flush log to disk at each commit (safest)
innodb_doublewrite = 1               # Enable doublewrite buffer
sync_binlog = 1                      # Sync binary log at each commit

# Backup settings
innodb_backup_dir = /var/backup/mysql
```

**Application-Level Durability:**

```javascript
// Audit log untuk important transactions
async function createPesananWithAudit(data) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create pesanan
    const pesanan = await tx.pesanan.create({ data: /* ... */ });
    
    // 2. Create audit log (durability backup)
    await tx.auditLog.create({
      data: {
        entity_type: 'pesanan',
        entity_id: pesanan.id_pesanan,
        action: 'CREATE',
        user_id: data.userId,
        data_snapshot: JSON.stringify(pesanan),
        created_at: new Date()
      }
    });
    
    return pesanan;
  });
}
```

**Backup Strategy:**

```bash
#!/bin/bash
# Automated backup script

# Daily full backup
mysqldump -u root -p laundry_db --single-transaction --routines --triggers \
  > /backup/laundry_db_$(date +%Y%m%d).sql

# Weekly backup with compression
mysqldump -u root -p laundry_db --single-transaction | gzip \
  > /backup/weekly/laundry_db_$(date +%Y_week%W).sql.gz

# Point-in-time recovery (binary logs)
mysqlbinlog --start-datetime="2026-11-05 09:00:00" \
            --stop-datetime="2026-11-05 10:00:00" \
            /var/log/mysql/mysql-bin.000001 \
  | mysql -u root -p laundry_db
```

---

## 19. Unit of Work Pattern (Advanced)

### 19.1 Enhanced Unit of Work

```javascript
// src/infrastructure/unit-of-work/UnitOfWork.js (Complete)
const { PrismaClient } = require('@prisma/client');

class UnitOfWork {
  constructor(prisma) {
    this.prisma = prisma;
    this._repositories = new Map();
    this._trackChanges = [];
  }

  /**
   * Get repository instance (cached)
   */
  getRepository(RepositoryClass) {
    const className = RepositoryClass.name;
    
    if (!this._repositories.has(className)) {
      this._repositories.set(className, new RepositoryClass(this.prisma));
    }
    
    return this._repositories.get(className);
  }

  /**
   * Execute transaction with all repositories
   */
  async executeTransaction(callback) {
    this._trackChanges = [];
    
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Replace prisma client with transaction client for all repos
        const originalPrisma = this.prisma;
        
        // Temporarily swap to transaction client
        for (const repo of this._repositories.values()) {
          repo.prisma = tx;
        }
        
        try {
          return await callback(tx);
        } finally {
          // Restore original prisma client
          for (const repo of this._repositories.values()) {
            repo.prisma = originalPrisma;
          }
        }
      }, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: 'RepeatableRead'
      });
      
      // Transaction committed successfully
      await this._afterCommit();
      return result;
      
    } catch (error) {
      // Transaction rolled back
      await this._afterRollback(error);
      throw error;
    }
  }

  /**
   * Track entity changes for audit
   */
  trackChange(entity, operation, data) {
    this._trackChanges.push({
      entity,
      operation,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Hook: After successful commit
   */
  async _afterCommit() {
    // Log audit trail
    if (this._trackChanges.length > 0) {
      console.log(`Transaction committed with ${this._trackChanges.length} changes`);
      // Could send to audit service, event bus, etc.
    }
    
    this._trackChanges = [];
  }

  /**
   * Hook: After rollback
   */
  async _afterRollback(error) {
    console.error('Transaction rolled back:', error.message);
    // Could log to error tracking service
    this._trackChanges = [];
  }

  /**
   * Batch operations with single transaction
   */
  async executeBatch(operations) {
    return await this.executeTransaction(async (tx) => {
      const results = [];
      
      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }
      
      return results;
    });
  }

  /**
   * Savepoint support (nested transactions)
   */
  async executeSavepoint(name, callback) {
    await this.prisma.$executeRaw`SAVEPOINT ${name}`;
    
    try {
      const result = await callback();
      await this.prisma.$executeRaw`RELEASE SAVEPOINT ${name}`;
      return result;
    } catch (error) {
      await this.prisma.$executeRaw`ROLLBACK TO SAVEPOINT ${name}`;
      throw error;
    }
  }
}

module.exports = UnitOfWork;
```

### 19.2 Usage Example

```javascript
// src/application/services/OrderService.js
const UnitOfWork = require('../../infrastructure/unit-of-work/UnitOfWork');
const PesananRepository = require('../../infrastructure/repositories/PesananRepository');
const PelangganRepository = require('../../infrastructure/repositories/PelangganRepository');
const ProdukRepository = require('../../infrastructure/repositories/ProdukRepository');

class OrderService {
  constructor(prisma) {
    this.uow = new UnitOfWork(prisma);
  }

  async createOrder(orderData) {
    return await this.uow.executeTransaction(async (tx) => {
      // Get repositories
      const pesananRepo = this.uow.getRepository(PesananRepository);
      const pelangganRepo = this.uow.getRepository(PelangganRepository);
      const produkRepo = this.uow.getRepository(ProdukRepository);
      
      // 1. Validate customer
      const pelanggan = await pelangganRepo.findById(orderData.idPelanggan);
      if (!pelanggan) {
        throw new Error('Pelanggan tidak ditemukan');
      }
      
      // 2. Create pesanan
      const pesanan = await pesananRepo.create({
        id_pelanggan: orderData.idPelanggan,
        tgl_masuk: new Date(),
        status_cucian: 'diterima',
        total: 0
      });
      
      this.uow.trackChange('pesanan', 'CREATE', pesanan);
      
      // 3. Process layanan details
      let total = 0;
      for (const item of orderData.layanan) {
        const layanan = await tx.layanan.findUnique({
          where: { id_layanan: item.idLayanan }
        });
        
        const subtotal = item.jumlah * layanan.harga;
        total += subtotal;
        
        await tx.detailLayanan.create({
          data: {
            id_pesanan: pesanan.id_pesanan,
            id_layanan: item.idLayanan,
            jumlah: item.jumlah,
            harga_satuan: layanan.harga,
            subtotal
          }
        });
      }
      
      // 4. Process produk details and update stock
      if (orderData.produk) {
        for (const item of orderData.produk) {
          const produk = await produkRepo.findById(item.idProduk);
          
          if (produk.stok < item.qty) {
            throw new Error(`Stok ${produk.nama_produk} tidak mencukupi`);
          }
          
          const subtotal = item.qty * produk.harga;
          total += subtotal;
          
          await tx.detailProduk.create({
            data: {
              id_pesanan: pesanan.id_pesanan,
              id_produk: item.idProduk,
              qty: item.qty,
              harga_satuan: produk.harga,
              subtotal
            }
          });
          
          // Decrement stock
          await tx.produk.update({
            where: { id_produk: item.idProduk },
            data: { stok: { decrement: item.qty } }
          });
          
          this.uow.trackChange('produk', 'UPDATE_STOCK', {
            id: item.idProduk,
            qty: -item.qty
          });
        }
      }
      
      // 5. Update total
      await pesananRepo.update(pesanan.id_pesanan, { total });
      
      // 6. Return complete order
      return await pesananRepo.findById(pesanan.id_pesanan);
    });
  }
}

module.exports = OrderService;
```

---

## 20. Database Security

### 20.1 Prevent SQL Injection

**✓ Prisma ORM Automatically Prevents SQL Injection:**

```javascript
// SAFE: Prisma uses parameterized queries
async function searchPelangganSafe(searchTerm) {
  return await prisma.pelanggan.findMany({
    where: {
      OR: [
        { nama: { contains: searchTerm } },
        { no_hp: { contains: searchTerm } }
      ]
    }
  });
}

// Even with raw queries, use parameterization
async function searchPelangganRaw(searchTerm) {
  // SAFE: Prisma automatically parameterizes
  return await prisma.$queryRaw`
    SELECT * FROM pelanggan 
    WHERE nama LIKE ${`%${searchTerm}%`} 
       OR no_hp LIKE ${`%${searchTerm}%`}
  `;
}
```

**❌ DANGEROUS: String concatenation (NEVER DO THIS)**

```javascript
// VULNERABLE to SQL injection
async function searchPelangganDangerous(searchTerm) {
  // If searchTerm = "'; DROP TABLE pelanggan; --"
  const query = `SELECT * FROM pelanggan WHERE nama LIKE '%${searchTerm}%'`;
  return await prisma.$queryRawUnsafe(query);  // ← DANGER!
}
```

**Best Practices:**

```javascript
// 1. Always use Prisma query builder
await prisma.pelanggan.findMany({ where: { nama: userInput } }); // ✓ Safe

// 2. If using raw SQL, ALWAYS parameterize
await prisma.$queryRaw`SELECT * FROM pelanggan WHERE id = ${userId}`; // ✓ Safe

// 3. NEVER use $queryRawUnsafe with user input
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = ${userId}`); // ✗ Unsafe

// 4. Validate and sanitize input
function validatePelangganInput(data) {
  const schema = {
    nama: /^[a-zA-Z\s]{3,100}$/,
    no_hp: /^08[0-9]{9,12}$/,
    alamat: /^[a-zA-Z0-9\s,.-]{5,255}$/
  };
  
  for (const [field, pattern] of Object.entries(schema)) {
    if (data[field] && !pattern.test(data[field])) {
      throw new Error(`Invalid ${field} format`);
    }
  }
}
```

### 20.2 PreparedStatement Pattern

```javascript
// Prisma handles prepared statements automatically, but here's manual approach:

class PelangganRepository {
  constructor(prisma) {
    this.prisma = prisma;
    
    // Prepare statement (conceptual - Prisma does this internally)
    this.statements = {
      findByPhone: prisma.$queryRaw`
        SELECT * FROM pelanggan WHERE no_hp = ?
      `,
      findByName: prisma.$queryRaw`
        SELECT * FROM pelanggan WHERE nama LIKE ?
      `
    };
  }

  async findByPhone(noHp) {
    // Execute prepared statement with parameter
    return await this.prisma.$queryRaw`
      SELECT * FROM pelanggan WHERE no_hp = ${noHp}
    `;
  }

  async findByNamePattern(pattern) {
    return await this.prisma.$queryRaw`
      SELECT * FROM pelanggan WHERE nama LIKE ${`%${pattern}%`}
    `;
  }
}
```

### 20.3 Application-Level Authorization

```javascript
// src/presentation/middlewares/authorization.js

class AuthorizationMiddleware {
  /**
   * Check if user has permission to perform action
   */
  static checkPermission(requiredPermission) {
    return async (req, res, next) => {
      const user = req.user; // From authentication middleware
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const hasPermission = await this.userHasPermission(
        user.id, 
        requiredPermission
      );
      
      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `You don't have permission to ${requiredPermission}`
        });
      }
      
      next();
    };
  }

  /**
   * Check role-based access
   */
  static checkRole(allowedRoles) {
    return (req, res, next) => {
      const user = req.user;
      
      if (!user || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'Insufficient role privileges'
        });
      }
      
      next();
    };
  }

  /**
   * Check resource ownership
   */
  static checkOwnership(resourceType) {
    return async (req, res, next) => {
      const user = req.user;
      const resourceId = req.params.id;
      
      const isOwner = await this.checkResourceOwner(
        user.id, 
        resourceType, 
        resourceId
      );
      
      if (!isOwner && user.role !== 'ADMIN') {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You can only access your own resources'
        });
      }
      
      next();
    };
  }

  static async userHasPermission(userId, permission) {
    // Query dari database
    const userPermissions = await prisma.userPermission.findMany({
      where: { user_id: userId },
      include: { permission: true }
    });
    
    return userPermissions.some(up => up.permission.name === permission);
  }

  static async checkResourceOwner(userId, resourceType, resourceId) {
    switch (resourceType) {
      case 'pesanan':
        const pesanan = await prisma.pesanan.findUnique({
          where: { id_pesanan: parseInt(resourceId) },
          include: { pelanggan: true }
        });
        return pesanan?.pelanggan.user_id === userId;
      
      default:
        return false;
    }
  }
}

module.exports = AuthorizationMiddleware;
```

**Usage in Routes:**

```javascript
// src/presentation/routes/pesanan.routes.js
const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middlewares/authentication');
const AuthzMiddleware = require('../middlewares/authorization');
const PesananController = require('../controllers/PesananController');

// Public routes (no auth)
router.get('/status/:orderId', PesananController.checkStatus);

// Protected routes (require authentication)
router.use(AuthMiddleware.authenticate);

// List all pesanan - admin only
router.get('/', 
  AuthzMiddleware.checkRole(['ADMIN', 'KASIR']),
  PesananController.index
);

// Create pesanan - authenticated users
router.post('/', 
  AuthzMiddleware.checkPermission('create:pesanan'),
  PesananController.create
);

// View specific pesanan - owner or admin
router.get('/:id',
  AuthzMiddleware.checkOwnership('pesanan'),
  PesananController.show
);

// Update pesanan - kasir or admin only
router.put('/:id',
  AuthzMiddleware.checkRole(['ADMIN', 'KASIR']),
  PesananController.update
);

// Delete pesanan - admin only
router.delete('/:id',
  AuthzMiddleware.checkRole(['ADMIN']),
  PesananController.delete
);

module.exports = router;
```

### 20.4 Row-Level Security (RLS)

```javascript
// Policy-based data access
class DataAccessPolicy {
  /**
   * Apply row-level security filter
   */
  static applyPolicy(query, user, action) {
    if (!user) {
      throw new Error('User context required');
    }

    // Admin sees everything
    if (user.role === 'ADMIN') {
      return query;
    }

    // Kasir sees only their store's orders
    if (user.role === 'KASIR') {
      query.where = {
        ...query.where,
        store_id: user.store_id
      };
    }

    // Customer sees only their own orders
    if (user.role === 'CUSTOMER') {
      query.where = {
        ...query.where,
        pelanggan: {
          user_id: user.id
        }
      };
    }

    return query;
  }
}

// Usage in repository
class PesananRepository {
  constructor(prisma, userContext) {
    this.prisma = prisma;
    this.user = userContext;
  }

  async findAll(filters = {}) {
    let query = {
      where: filters,
      include: {
        pelanggan: true,
        detail_layanan: true
      }
    };

    // Apply row-level security
    query = DataAccessPolicy.applyPolicy(query, this.user, 'read');

    return await this.prisma.pesanan.findMany(query);
  }
}
```

### 20.5 Encryption & Sensitive Data

```javascript
// src/shared/utils/encryption.js
const crypto = require('crypto');

class EncryptionUtil {
  static algorithm = 'aes-256-gcm';
  static key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

  /**
   * Encrypt sensitive data
   */
  static encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return: iv + authTag + encrypted
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Hash password (one-way)
   */
  static async hashPassword(password) {
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password, hash) {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }
}

module.exports = EncryptionUtil;
```

**Usage: Encrypt sensitive fields**

```javascript
// src/domain/entities/Pelanggan.js
const EncryptionUtil = require('../../shared/utils/encryption');

class Pelanggan {
  constructor(data) {
    this.id_pelanggan = data.id_pelanggan;
    this.nama = data.nama;
    this._no_hp = data.no_hp; // Private
    this.alamat = data.alamat;
  }

  // Getter: decrypt on read
  get no_hp() {
    return this._no_hp.startsWith('ENC:') 
      ? EncryptionUtil.decrypt(this._no_hp.substring(4))
      : this._no_hp;
  }

  // Setter: encrypt on write
  set no_hp(value) {
    this._no_hp = 'ENC:' + EncryptionUtil.encrypt(value);
  }

  // Mask for display
  get no_hp_masked() {
    const phone = this.no_hp;
    return phone.substring(0, 4) + '****' + phone.substring(phone.length - 3);
  }
}
```

### 20.6 Audit Logging

```prisma
model AuditLog {
  id            Int      @id @default(autoincrement())
  entity_type   String   @db.VarChar(50)
  entity_id     Int
  action        String   @db.VarChar(20)  // CREATE, UPDATE, DELETE, VIEW
  user_id       Int?
  user_ip       String?  @db.VarChar(45)
  user_agent    String?  @db.VarChar(255)
  data_before   Json?
  data_after    Json?
  created_at    DateTime @default(now())
  
  @@index([entity_type, entity_id])
  @@index([user_id])
  @@index([created_at])
  @@map("audit_log")
}
```

```javascript
// src/infrastructure/services/AuditService.js
class AuditService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async log(params) {
    return await this.prisma.auditLog.create({
      data: {
        entity_type: params.entityType,
        entity_id: params.entityId,
        action: params.action,
        user_id: params.userId,
        user_ip: params.userIp,
        user_agent: params.userAgent,
        data_before: params.dataBefore,
        data_after: params.dataAfter,
        created_at: new Date()
      }
    });
  }

  async getAuditTrail(entityType, entityId) {
    return await this.prisma.auditLog.findMany({
      where: {
        entity_type: entityType,
        entity_id: entityId
      },
      orderBy: { created_at: 'desc' }
    });
  }
}

module.exports = AuditService;
```

---

## 21. Summary & Implementation Checklist

### ✓ Implemented
- [x] BCNF Normalization (10 tables)
- [x] Prisma ORM with proper relationships
- [x] Repository Pattern (DAL)
- [x] Basic Unit of Work
- [x] CQRS separation (Commands/Queries)

### 📋 To Implement

**High Priority:**
- [ ] B+ Tree indexes (add to schema)
- [ ] Stored procedures (CREATE, UPDATE status transitions)
- [ ] Stored functions (calculate totals, check late orders)
- [ ] Triggers (auto-calculate subtotals, enforce constraints)
- [ ] Enhanced Unit of Work with audit
- [ ] Transaction isolation for concurrent operations
- [ ] SQL injection prevention audit
- [ ] Application-level authorization

**Medium Priority:**
- [ ] Weak entity enforcement (cascade deletes)
- [ ] Cardinality constraints (max 2 pengiriman per pesanan)
- [ ] Optimistic locking (version column)
- [ ] Audit logging system
- [ ] Encryption for sensitive data
- [ ] Row-level security policies

**Low Priority (Future):**
- [ ] Ternary relationships (if adding KARYAWAN)
- [ ] Specialization (if adding user types)
- [ ] Aggregation (if adding EVALUASI)
- [ ] Materialized views for reports
- [ ] Backup & recovery procedures

---

## 22. Next Steps

1. **Update Prisma Schema** dengan indexes dan constraints
2. **Create Migration** untuk stored procedures dan triggers
3. **Implement Enhanced UnitOfWork**
4. **Add Authorization Middleware**
5. **Setup Audit Logging**
6. **Write Integration Tests** untuk ACID compliance
7. **Security Audit** untuk SQL injection

Apakah Anda ingin saya implementasikan salah satu bagian ini terlebih dahulu?

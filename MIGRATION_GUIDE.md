# 🔄 Migration Guide: mysql2 → Prisma

Panduan lengkap untuk migrasi dari mysql2 ke Prisma ORM.

## 📋 Daftar Isi
1. [Instalasi](#instalasi)
2. [Perbandingan Syntax](#perbandingan-syntax)
3. [Migrasi Route by Route](#migrasi-route-by-route)
4. [Best Practices](#best-practices)
5. [Common Patterns](#common-patterns)

---

## 🚀 Instalasi

### Step 1: Install Dependencies
```bash
npm install prisma @prisma/client
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Test Connection
```bash
npm run test:prisma
```

---

## 📊 Perbandingan Syntax

### SELECT All Records

**mysql2:**
```javascript
const [rows] = await db.query('SELECT * FROM pelanggan');
```

**Prisma:**
```javascript
const rows = await prisma.pelanggan.findMany();
```

---

### SELECT with WHERE

**mysql2:**
```javascript
const [rows] = await db.query(
  'SELECT * FROM pelanggan WHERE id_pelanggan = ?',
  [id]
);
```

**Prisma:**
```javascript
const row = await prisma.pelanggan.findUnique({
  where: { id_pelanggan: id }
});
```

---

### SELECT with LIKE

**mysql2:**
```javascript
const [rows] = await db.query(
  "SELECT * FROM pelanggan WHERE nama LIKE ?",
  [`%${search}%`]
);
```

**Prisma:**
```javascript
const rows = await prisma.pelanggan.findMany({
  where: {
    nama: { contains: search }
  }
});
```

---

### SELECT with JOIN

**mysql2:**
```javascript
const [rows] = await db.query(`
  SELECT p.*, k.nama_kategori
  FROM produk p
  JOIN kategori k ON k.id_kategori = p.id_kategori
`);
```

**Prisma:**
```javascript
const rows = await prisma.produk.findMany({
  include: {
    kategori: true
  }
});
```

---

### INSERT

**mysql2:**
```javascript
const [result] = await db.query(
  'INSERT INTO pelanggan (nama, no_hp, alamat) VALUES (?, ?, ?)',
  [nama, no_hp, alamat]
);
const newId = result.insertId;
```

**Prisma:**
```javascript
const newRecord = await prisma.pelanggan.create({
  data: { nama, no_hp, alamat }
});
const newId = newRecord.id_pelanggan;
```

---

### UPDATE

**mysql2:**
```javascript
await db.query(
  'UPDATE pelanggan SET nama = ?, no_hp = ?, alamat = ? WHERE id_pelanggan = ?',
  [nama, no_hp, alamat, id]
);
```

**Prisma:**
```javascript
await prisma.pelanggan.update({
  where: { id_pelanggan: id },
  data: { nama, no_hp, alamat }
});
```

---

### DELETE

**mysql2:**
```javascript
await db.query('DELETE FROM pelanggan WHERE id_pelanggan = ?', [id]);
```

**Prisma:**
```javascript
await prisma.pelanggan.delete({
  where: { id_pelanggan: id }
});
```

---

### COUNT

**mysql2:**
```javascript
const [rows] = await db.query('SELECT COUNT(*) as total FROM pelanggan');
const total = rows[0].total;
```

**Prisma:**
```javascript
const total = await prisma.pelanggan.count();
```

---

### SUM / AVG / MIN / MAX

**mysql2:**
```javascript
const [rows] = await db.query(
  'SELECT SUM(total) as sum, AVG(total) as avg FROM pesanan'
);
```

**Prisma:**
```javascript
const result = await prisma.pesanan.aggregate({
  _sum: { total: true },
  _avg: { total: true }
});
```

---

### ORDER BY

**mysql2:**
```javascript
const [rows] = await db.query(
  'SELECT * FROM pelanggan ORDER BY created_at DESC'
);
```

**Prisma:**
```javascript
const rows = await prisma.pelanggan.findMany({
  orderBy: { created_at: 'desc' }
});
```

---

### LIMIT & OFFSET

**mysql2:**
```javascript
const [rows] = await db.query(
  'SELECT * FROM pelanggan LIMIT ? OFFSET ?',
  [limit, offset]
);
```

**Prisma:**
```javascript
const rows = await prisma.pelanggan.findMany({
  take: limit,
  skip: offset
});
```

---

### Complex WHERE (AND/OR)

**mysql2:**
```javascript
const [rows] = await db.query(`
  SELECT * FROM produk 
  WHERE (stok < ? OR stok IS NULL)
  AND id_kategori = ?
`, [5, kategoriId]);
```

**Prisma:**
```javascript
const rows = await prisma.produk.findMany({
  where: {
    AND: [
      {
        OR: [
          { stok: { lt: 5 } },
          { stok: null }
        ]
      },
      { id_kategori: kategoriId }
    ]
  }
});
```

---

### Transaction

**mysql2:**
```javascript
const connection = await db.getConnection();
try {
  await connection.beginTransaction();
  
  await connection.query('INSERT INTO pesanan ...');
  await connection.query('INSERT INTO detail_layanan ...');
  
  await connection.commit();
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
}
```

**Prisma:**
```javascript
await prisma.$transaction(async (tx) => {
  await tx.pesanan.create({ data: {...} });
  await tx.detail_layanan.create({ data: {...} });
});
```

---

## 🔄 Migrasi Route by Route

### 1. Pelanggan Route

**Sebelum (mysql2):**
```javascript
router.get('/', async (req, res) => {
  const [pelanggan] = await db.query('SELECT * FROM pelanggan');
  res.render('pelanggan/index', { pelanggan });
});
```

**Sesudah (Prisma):**
```javascript
router.get('/', async (req, res) => {
  const pelanggan = await prisma.pelanggan.findMany();
  res.render('pelanggan/index', { pelanggan });
});
```

---

### 2. Produk with Kategori

**Sebelum (mysql2):**
```javascript
router.get('/', async (req, res) => {
  const [produk] = await db.query(`
    SELECT p.*, k.nama_kategori 
    FROM produk p 
    JOIN kategori k ON k.id_kategori = p.id_kategori
  `);
  res.render('produk/index', { produk });
});
```

**Sesudah (Prisma):**
```javascript
router.get('/', async (req, res) => {
  const produk = await prisma.produk.findMany({
    include: { kategori: true }
  });
  res.render('produk/index', { produk });
});
```

---

### 3. Dashboard dengan Multiple Queries

**Sebelum (mysql2):**
```javascript
router.get('/', async (req, res) => {
  const [pelanggan] = await db.query('SELECT COUNT(*) as total FROM pelanggan');
  const [pesanan] = await db.query('SELECT COUNT(*) as total FROM pesanan');
  const [omzet] = await db.query('SELECT SUM(total) as sum FROM pesanan');
  
  res.render('dashboard', {
    totalPelanggan: pelanggan[0].total,
    totalPesanan: pesanan[0].total,
    totalOmzet: omzet[0].sum
  });
});
```

**Sesudah (Prisma):**
```javascript
router.get('/', async (req, res) => {
  const [totalPelanggan, totalPesanan, omzet] = await Promise.all([
    prisma.pelanggan.count(),
    prisma.pesanan.count(),
    prisma.pesanan.aggregate({ _sum: { total: true } })
  ]);
  
  res.render('dashboard', {
    totalPelanggan,
    totalPesanan,
    totalOmzet: omzet._sum.total || 0
  });
});
```

---

## ✅ Best Practices

### 1. Use Singleton Pattern
```javascript
// prisma/client.js
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
module.exports = prisma;
```

### 2. Error Handling
```javascript
try {
  const result = await prisma.pelanggan.create({ data });
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    res.status(400).send('Data already exists');
  } else {
    throw error;
  }
}
```

### 3. Use Transactions for Complex Operations
```javascript
await prisma.$transaction(async (tx) => {
  const pesanan = await tx.pesanan.create({ data: pesananData });
  await tx.detail_layanan.create({ 
    data: { id_pesanan: pesanan.id_pesanan, ...detailData }
  });
});
```

### 4. Select Only What You Need
```javascript
const users = await prisma.pelanggan.findMany({
  select: {
    id_pelanggan: true,
    nama: true,
    no_hp: true
    // tidak ambil alamat & created_at
  }
});
```

---

## 🎯 Common Patterns

### Pattern 1: Pagination
```javascript
const page = parseInt(req.query.page) || 1;
const limit = 10;
const skip = (page - 1) * limit;

const [data, total] = await Promise.all([
  prisma.pelanggan.findMany({
    take: limit,
    skip: skip,
    orderBy: { created_at: 'desc' }
  }),
  prisma.pelanggan.count()
]);

res.render('pelanggan/index', {
  data,
  currentPage: page,
  totalPages: Math.ceil(total / limit)
});
```

### Pattern 2: Search & Filter
```javascript
const { search, kategori } = req.query;

const where = {};
if (search) {
  where.nama_produk = { contains: search };
}
if (kategori) {
  where.id_kategori = parseInt(kategori);
}

const produk = await prisma.produk.findMany({ where });
```

### Pattern 3: Soft Delete
```javascript
// Add deleted_at field to model
model Pelanggan {
  // ... other fields
  deleted_at DateTime?
}

// Soft delete
await prisma.pelanggan.update({
  where: { id_pelanggan: id },
  data: { deleted_at: new Date() }
});

// Find active only
const active = await prisma.pelanggan.findMany({
  where: { deleted_at: null }
});
```

---

## 🔧 Troubleshooting

### Error: `@prisma/client` did not initialize yet
**Solution:** Run `npx prisma generate`

### Error: Can't reach database server
**Solution:** Check DATABASE_URL in .env file

### Error: P2002: Unique constraint failed
**Solution:** Data yang di-insert sudah ada (duplicate unique field)

---

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Client API Reference](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma Examples](https://github.com/prisma/prisma-examples)

---

## 🎓 Next Steps

1. ✅ Install Prisma
2. ✅ Generate client: `npx prisma generate`
3. ✅ Test connection: `npm run test:prisma`
4. 🔄 Migrate routes one by one
5. 🧪 Test each route after migration
6. 🚀 Deploy to production

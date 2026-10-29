# Setup Prisma untuk Laundry App

## 📦 Instalasi

Jalankan command berikut di terminal:

```bash
npm install prisma @prisma/client --save
```

## 🔧 Konfigurasi

### 1. Database URL
File `.env` sudah dikonfigurasi dengan:
```env
DATABASE_URL="mysql://root:Singaraja14@localhost:3306/laundry_db"
```

### 2. Prisma Schema
File `prisma/schema.prisma` sudah dibuat dengan semua model yang sesuai dengan database MySQL Anda.

## 🚀 Generate Prisma Client

Setelah install prisma, jalankan:

```bash
npx prisma generate
```

Command ini akan membuat Prisma Client berdasarkan schema.

## 🔄 Introspect Database (Opsional)

Jika Anda ingin Prisma membaca struktur database yang sudah ada:

```bash
npx prisma db pull
```

## 📊 Prisma Studio (Database GUI)

Untuk membuka GUI database:

```bash
npx prisma studio
```

Akan membuka browser di `http://localhost:5555` dengan interface untuk melihat dan edit data.

## 🔌 Cara Menggunakan Prisma di Routes

### Import Prisma Client
```javascript
const prisma = require('../prisma/client');
```

### Contoh Query

#### SELECT - FindMany
```javascript
const pelanggan = await prisma.pelanggan.findMany();
```

#### SELECT dengan WHERE
```javascript
const pelanggan = await prisma.pelanggan.findMany({
  where: {
    nama: {
      contains: 'Sari'
    }
  }
});
```

#### SELECT dengan JOIN (include)
```javascript
const produk = await prisma.produk.findMany({
  include: {
    kategori: true
  }
});
```

#### INSERT
```javascript
await prisma.pelanggan.create({
  data: {
    nama: 'Made Sari',
    no_hp: '081234567890',
    alamat: 'Jl. Sunset Road'
  }
});
```

#### UPDATE
```javascript
await prisma.pelanggan.update({
  where: {
    id_pelanggan: 1
  },
  data: {
    nama: 'Made Sari Updated'
  }
});
```

#### DELETE
```javascript
await prisma.pelanggan.delete({
  where: {
    id_pelanggan: 1
  }
});
```

#### COUNT
```javascript
const total = await prisma.pelanggan.count();
```

#### AGGREGATE
```javascript
const result = await prisma.pesanan.aggregate({
  _sum: {
    total: true
  },
  _avg: {
    total: true
  }
});
```

## 📁 File-file Prisma yang Sudah Dibuat

1. **`prisma/schema.prisma`** - Schema database dengan semua model
2. **`prisma/client.js`** - Singleton Prisma Client instance
3. **`routes/*-prisma.js`** - Contoh routes menggunakan Prisma:
   - `pelanggan-prisma.js` - CRUD pelanggan
   - `produk-prisma.js` - CRUD produk dengan relasi kategori
   - `dashboard-prisma.js` - Dashboard dengan statistik

## 🔄 Migrasi dari mysql2 ke Prisma

### Cara 1: Ganti Route Secara Bertahap
Anda bisa mengganti route satu per satu:
```javascript
// Di app.js, ganti:
app.use('/pelanggan', require('./routes/pelanggan'));
// Menjadi:
app.use('/pelanggan', require('./routes/pelanggan-prisma'));
```

### Cara 2: Menggunakan Keduanya
Anda bisa menggunakan mysql2 dan Prisma bersamaan:
- mysql2 untuk stored procedures dan functions
- Prisma untuk CRUD operations

## 🎯 Keuntungan Prisma

1. **Type-safe** - Auto-complete dan type checking
2. **Mudah dibaca** - Query lebih readable
3. **Auto-completion** - IDE support
4. **Migration** - Built-in migration tool
5. **Prisma Studio** - GUI untuk database
6. **Relations** - Mudah handle relasi antar tabel

## ⚠️ Catatan Penting

1. **Triggers & Stored Procedures**: Prisma tidak menjalankan triggers MySQL. Jika Anda punya trigger untuk update subtotal atau total, pertimbangkan untuk:
   - Menghitung di application layer (recommended dengan Prisma)
   - Atau tetap menggunakan mysql2 untuk operasi yang memerlukan trigger

2. **Transactions**: Untuk operasi kompleks, gunakan Prisma transactions:
```javascript
await prisma.$transaction(async (tx) => {
  await tx.pesanan.create({ data: {...} });
  await tx.detail_layanan.create({ data: {...} });
});
```

## 📚 Dokumentasi Lebih Lanjut

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma Client API](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference)
- [Prisma MySQL Guide](https://www.prisma.io/docs/concepts/database-connectors/mysql)

## 🧪 Testing

Test koneksi Prisma:
```javascript
// test-prisma.js
const prisma = require('./prisma/client');

async function main() {
  const pelanggan = await prisma.pelanggan.findMany();
  console.log('Pelanggan:', pelanggan);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Jalankan: `node test-prisma.js`

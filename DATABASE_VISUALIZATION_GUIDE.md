# 🎨 Database Visualization Guide

## Cara Melihat Diagram Relasi Database

### 🚀 Metode 1: Prisma Studio (Paling Mudah & Gratis)

**Built-in dengan Prisma, sudah terinstall!**

```bash
# Buka Prisma Studio
npm run prisma:studio

# Atau
npx prisma studio
```

Kemudian buka browser di: `http://localhost:5555`

**Fitur:**
- ✅ Lihat semua tabel
- ✅ Klik tabel untuk lihat relasi
- ✅ Edit data langsung
- ✅ Filter dan search
- ✅ Real-time updates

---

### 🖼️ Metode 2: GitHub (Automatic Rendering)

File `ERD.md` yang sudah dibuat akan otomatis di-render sebagai diagram di GitHub.

1. Push ke GitHub (sudah dilakukan)
2. Buka: `https://github.com/Anonimz1/laundry-app/blob/main/ERD.md`
3. GitHub akan render Mermaid diagram otomatis

---

### 💻 Metode 3: VS Code Extensions

#### a) Markdown Preview Mermaid Support

1. Install extension:
   ```
   Name: Markdown Preview Mermaid Support
   Id: bierner.markdown-mermaid
   ```

2. Buka `ERD.md`
3. Tekan `Ctrl + Shift + V` untuk preview
4. Diagram akan muncul!

#### b) Draw.io Integration

1. Install extension:
   ```
   Name: Draw.io Integration
   Id: hediet.vscode-drawio
   ```

2. Buat file baru: `database-erd.drawio`
3. Draw ERD manually dengan drag & drop

---

### 🌐 Metode 4: Online Tools (Instant, No Install)

#### a) Mermaid Live Editor
- URL: https://mermaid.live/
- Copy code dari `ERD.md` (bagian mermaid)
- Paste di editor
- Lihat diagram real-time
- Export as PNG/SVG

#### b) dbdiagram.io
- URL: https://dbdiagram.io/
- Free, powerful ERD tool
- Can import from SQL or define schema
- Export as PNG/PDF/SQL

**Cara menggunakan:**
1. Klik "Go to App"
2. Paste SQL schema atau define manual
3. Diagram otomatis terbentuk

#### c) QuickDBD
- URL: https://www.quickdatabasediagrams.com/
- Simple text-based ERD
- Export as PNG/PDF

---

### 🗄️ Metode 5: Database Client Tools

#### a) **DBeaver** (Recommended - Free & Powerful)

**Download:** https://dbeaver.io/download/

**Setup:**
1. Install DBeaver
2. Create New Connection → MySQL
3. Input credentials:
   - Host: `localhost`
   - Port: `3306`
   - Database: `laundry_db`
   - Username: `root`
   - Password: `Singaraja14`

**Generate ERD:**
1. Right-click database → "View Diagram"
2. DBeaver akan generate ERD otomatis
3. Bisa di-customize dan export

**Kelebihan:**
- ✅ Auto-generate dari database existing
- ✅ Interactive (zoom, pan)
- ✅ Export as image
- ✅ Show constraints & indexes
- ✅ Gratis & open-source

#### b) **MySQL Workbench** (Official MySQL Tool)

**Download:** https://dev.mysql.com/downloads/workbench/

**Setup:**
1. Install MySQL Workbench
2. Create connection dengan credentials yang sama

**Generate ERD:**
1. Database → Reverse Engineer
2. Select your database
3. ERD akan di-generate otomatis

**Kelebihan:**
- ✅ Official MySQL tool
- ✅ Professional diagrams
- ✅ Can sync changes back to DB
- ✅ Gratis

#### c) **TablePlus** (Premium, Beautiful UI)

**Download:** https://tableplus.com/

**Trial version available**

**Setup:**
1. Install TablePlus
2. Create connection
3. Select database

**Generate ERD:**
1. Right panel → "Design" tab
2. Lihat visual relationships

**Kelebihan:**
- ✅ Beautiful modern UI
- ✅ Fast & responsive
- ✅ Multi-database support
- ❌ Paid (ada trial)

#### d) **phpMyAdmin** (Web-based)

Jika Anda pakai XAMPP/WAMP:

1. Buka `http://localhost/phpmyadmin`
2. Pilih database `laundry_db`
3. Tab "Designer"
4. Lihat ERD visual

---

### 📐 Metode 6: Generate from Prisma Schema

Prisma punya tool untuk generate ERD dari schema:

```bash
# Install prisma-erd-generator
npm install -D prisma-erd-generator @mermaid-js/mermaid-cli

# Add to prisma/schema.prisma
# generator erd {
#   provider = "prisma-erd-generator"
# }

# Generate
npx prisma generate
```

Akan generate file ERD otomatis!

---

## 🎯 Rekomendasi Berdasarkan Kebutuhan

### Untuk Development (Quick Check)
→ **Prisma Studio** - Paling cepat, sudah installed

### Untuk Dokumentasi
→ **Mermaid (ERD.md)** - Version controlled, di GitHub

### Untuk Presentasi/Laporan
→ **DBeaver** atau **MySQL Workbench** - Professional look, bisa export

### Untuk Collaborative Editing
→ **dbdiagram.io** - Online, bisa share link

### Untuk Quick Sketch
→ **Mermaid Live Editor** - Instant, no install

---

## 📊 ASCII ERD (Simple View)

```
┌─────────────┐
│  PELANGGAN  │
│─────────────│
│ id_pelanggan│◄─┐
│ nama        │  │
│ no_hp       │  │ 1
│ alamat      │  │
└─────────────┘  │
                 │
                 │ N
              ┌──▼────────┐
              │  PESANAN  │
              │───────────│
              │id_pesanan │◄─────┐
              │id_pelanggan  FK  │
              │tgl_masuk  │      │
              │status     │      │ 1
              │total      │      │
              └───────────┘      │
                 │               │
                 │ 1             │
          ┌──────┴──────┐        │
          │             │        │
          │ N           │ N      │ N
    ┌─────▼──────┐  ┌──▼──────────┐
    │DETAIL_     │  │DETAIL_      │
    │LAYANAN     │  │PRODUK       │
    │────────────│  │─────────────│
    │id_pesanan  FK│id_pesanan   FK
    │id_layanan  FK│id_produk    FK
    │jumlah      │  │qty          │
    │subtotal    │  │subtotal     │
    └────┬───────┘  └──┬──────────┘
         │             │
         │ N           │ N
         │             │
    ┌────▼───────┐  ┌─▼──────────┐
    │  LAYANAN   │  │  PRODUK    │
    │────────────│  │────────────│
    │id_layanan  │  │id_produk   │
    │id_kategori FK │id_kategori FK
    │nama        │  │nama        │
    │harga       │  │harga       │
    │satuan      │  │stok        │
    └────┬───────┘  └──┬─────────┘
         │             │
         │ N           │ N
         │             │
         └──────┬──────┘
                │
                │ 1
         ┌──────▼────────┐
         │   KATEGORI    │
         │───────────────│
         │ id_kategori   │
         │ nama_kategori │
         │ jenis         │
         └───────────────┘
```

---

## 🎨 Color Legend (for visual tools)

- **Yellow**: Master Data (Pelanggan, Kategori, Layanan, Produk)
- **Blue**: Transaction Headers (Pesanan, Pembayaran, Pengiriman)
- **Green**: Transaction Details (Detail_Layanan, Detail_Produk)

---

## 📝 Quick Reference

### Relationship Types
- **1:1** → One to One
- **1:N** → One to Many
- **N:M** → Many to Many (via junction table)

### Symbols
- **PK** → Primary Key
- **FK** → Foreign Key
- **UK** → Unique Key
- **◄─** → Relationship arrow
- **N** → Many
- **1** → One

---

## 🔧 Troubleshooting

### Prisma Studio tidak muncul diagram?
- Pastikan semua relations di `schema.prisma` sudah benar
- Run `npx prisma generate` dulu
- Refresh browser

### DBeaver tidak bisa connect?
- Cek MySQL service jalan
- Cek credentials di `.env`
- Test dengan: `mysql -u root -p`

### Mermaid tidak render di VS Code?
- Install extension "Markdown Preview Mermaid Support"
- Restart VS Code
- Buka preview dengan Ctrl+Shift+V

---

## 💡 Tips

1. **Gunakan Prisma Studio** untuk quick check daily
2. **Export dari DBeaver** untuk dokumentasi/laporan
3. **Simpan ERD.md** di git untuk version control
4. **Update ERD** setiap ada perubahan schema
5. **Share dbdiagram.io link** untuk diskusi tim

---

Selamat mengeksplorasi database Anda! 🎉

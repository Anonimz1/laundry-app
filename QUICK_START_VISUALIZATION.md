# 🚀 Quick Start: Lihat Diagram Relasi Database

## ✅ Prisma Studio Sudah Running!

Prisma Studio sekarang berjalan di: **http://localhost:5556**

### 📋 Langkah-langkah:

#### 1️⃣ **Buka Prisma Studio**
```
Buka browser dan akses: http://localhost:5556
```

#### 2️⃣ **Navigasi Antar Tabel**
Di sidebar kiri, Anda akan melihat semua tabel:
- ✅ pelanggan
- ✅ kategori
- ✅ layanan
- ✅ produk
- ✅ pesanan
- ✅ detail_layanan
- ✅ detail_produk
- ✅ pembayaran
- ✅ pengiriman

#### 3️⃣ **Lihat Relasi Tabel**
**Contoh: Melihat relasi PELANGGAN**

1. Klik **"pelanggan"** di sidebar
2. Klik salah satu row data pelanggan
3. Di panel detail kanan, Anda akan melihat:
   - 📊 **pesanan** (relasi: pesanan yang dibuat pelanggan ini)
   - Klik link "pesanan" untuk navigate ke pesanan tersebut

**Contoh: Melihat relasi PESANAN**

1. Klik **"pesanan"** di sidebar
2. Klik salah satu row pesanan
3. Di panel detail kanan, lihat:
   - 👤 **pelanggan** (link ke pelanggan yang buat pesanan)
   - 🧺 **detail_layanan** (list layanan dalam pesanan ini)
   - 📦 **detail_produk** (list produk dalam pesanan ini)
   - 💰 **pembayaran** (list pembayaran untuk pesanan ini)
   - 🚚 **pengiriman** (list pengiriman untuk pesanan ini)

**Contoh: Melihat relasi PRODUK**

1. Klik **"produk"**
2. Klik salah satu produk
3. Lihat relasi:
   - 🏷️ **kategori** (kategori produk ini)
   - 📋 **detail_produk** (pesanan yang menggunakan produk ini)

---

## 🖼️ Lihat Diagram ERD Visual

### Option 1: GitHub (Otomatis Rendered)

File ERD sudah di-push ke GitHub. Buka:

```
https://github.com/Anonimz1/laundry-app/blob/main/ERD.md
```

GitHub akan otomatis render diagram Mermaid dengan indah! 🎨

### Option 2: VS Code (Local)

1. Buka VS Code
2. Install extension: **"Markdown Preview Mermaid Support"**
   - Tekan `Ctrl+Shift+X`
   - Search: "Markdown Preview Mermaid Support"
   - Install by bierner

3. Buka file: `ERD.md`
4. Tekan: `Ctrl+Shift+V` (Preview Mode)
5. Diagram akan muncul! ✨

### Option 3: Online Instant (No Install)

1. Buka: https://mermaid.live/
2. Copy code dari `ERD.md` (bagian yang di dalam ```mermaid```)
3. Paste di editor
4. Lihat diagram real-time
5. Export as PNG jika mau

---

## 📊 Relasi Utama (Ringkasan)

```
PELANGGAN (1) ──────► (N) PESANAN
    │
    └─► Satu pelanggan bisa punya banyak pesanan

PESANAN (1) ──────► (N) DETAIL_LAYANAN ◄────── (N) LAYANAN
    │                                               │
    │                                               │
    └─► (N) DETAIL_PRODUK ◄────── (N) PRODUK      │
    │                                               │
    │                                               │
    └─► (N) PEMBAYARAN                             │
    │                                               │
    └─► (N) PENGIRIMAN                             │
                                                    │
KATEGORI (1) ──────► (N) LAYANAN                  │
    │                                               │
    └─────────────────► (N) PRODUK ────────────────┘
```

### Penjelasan:

1. **PELANGGAN → PESANAN** (1:N)
   - Satu pelanggan bisa membuat banyak pesanan
   - Setiap pesanan pasti punya satu pelanggan

2. **PESANAN → DETAIL_LAYANAN → LAYANAN** (M:N)
   - Pesanan bisa punya banyak layanan (cuci, setrika, dll)
   - Layanan bisa ada di banyak pesanan
   - Junction table: `detail_layanan`

3. **PESANAN → DETAIL_PRODUK → PRODUK** (M:N)
   - Pesanan bisa punya banyak produk
   - Produk bisa dijual di banyak pesanan
   - Junction table: `detail_produk`

4. **PESANAN → PEMBAYARAN** (1:N)
   - Pesanan bisa punya banyak pembayaran (cicilan)

5. **PESANAN → PENGIRIMAN** (1:N)
   - Pesanan bisa punya banyak pengiriman (jemput + antar)

6. **KATEGORI → LAYANAN/PRODUK** (1:N)
   - Kategori mengorganisir layanan dan produk

---

## 🎯 Tips Eksplorasi di Prisma Studio

### 💡 Tip 1: Filter Data
- Gunakan filter icon di header kolom
- Filter by value, contains, greater than, dll

### 💡 Tip 2: Search
- Search box di top-right untuk cari data cepat

### 💡 Tip 3: Edit Data
- Double-click cell untuk edit
- Klik "Save 1 change" untuk simpan
- **Hati-hati!** Ini langsung edit database

### 💡 Tip 4: Navigate Relasi
- Klik angka biru di relasi untuk lihat detail
- Contoh: jika pesanan punya 3 detail_layanan, klik "3"

### 💡 Tip 5: Create Data
- Klik "Add record" untuk tambah data baru
- Isi field yang required
- Save

---

## 🛑 Stop Prisma Studio

Ketika selesai, stop Prisma Studio:

```bash
# Di terminal yang running Prisma Studio
Tekan: Ctrl + C
```

Atau jalankan lagi kapan saja:
```bash
npm run prisma:studio
# atau
npx prisma studio
```

---

## 📸 Screenshot Guide

### Di Prisma Studio Anda akan melihat:

**Left Sidebar:**
```
┌─────────────────┐
│ 🗂️ Models       │
├─────────────────┤
│ ◆ pelanggan     │
│ ◆ kategori      │
│ ◆ layanan       │
│ ◆ produk        │
│ ◆ pesanan       │
│ ◆ detail_layanan│
│ ◆ detail_produk │
│ ◆ pembayaran    │
│ ◆ pengiriman    │
└─────────────────┘
```

**Main Panel (Table View):**
```
┌────────────────────────────────────────────┐
│ pelanggan                          ⚙️ 🔍  │
├──────┬────────────┬──────────────┬────────┤
│ id   │ nama       │ no_hp        │ alamat │
├──────┼────────────┼──────────────┼────────┤
│ 1    │ Made Sari  │ 081200000001 │ Jl...  │
│ 2    │ Kadek Rama │ 081200000002 │ Jl...  │
└──────┴────────────┴──────────────┴────────┘
```

**Right Panel (Detail & Relations):**
```
┌─────────────────────────────────┐
│ Details                         │
├─────────────────────────────────┤
│ id_pelanggan: 1                 │
│ nama: Made Sari                 │
│ no_hp: 081200000001            │
│ alamat: Jl. Sunset Road...      │
├─────────────────────────────────┤
│ Relations                       │
├─────────────────────────────────┤
│ pesanan: 2 records → [View]    │
└─────────────────────────────────┘
```

---

## 🎨 Alternative: DBeaver (Professional Tool)

Jika mau tools yang lebih powerful untuk ERD:

### Install DBeaver (Free)

1. Download: https://dbeaver.io/download/
2. Install DBeaver Community Edition
3. Create New Connection:
   - Database: MySQL
   - Host: localhost
   - Port: 3306
   - Database: laundry_db
   - Username: root
   - Password: Singaraja14

4. Generate ERD:
   - Right-click database → "View Diagram"
   - Atau: Database → ER Diagram
   - Akan muncul visual ERD yang indah!

5. Features:
   - ✅ Auto-layout
   - ✅ Show all constraints
   - ✅ Export as PNG/SVG/PDF
   - ✅ Print-ready

---

## 📚 Dokumentasi Lengkap

- **ERD.md** - Mermaid diagram + penjelasan relasi
- **DATABASE_VISUALIZATION_GUIDE.md** - All methods lengkap
- **ARCHITECTURE.md** - System architecture
- **README.md** - Getting started

---

## ✅ Checklist

- [x] Prisma Studio running di http://localhost:5556
- [ ] Buka browser dan eksplorasi relasi
- [ ] Lihat ERD.md di GitHub
- [ ] (Optional) Install DBeaver untuk ERD professional

---

**Happy Exploring! 🎉**

Jika ada pertanyaan, tanya saja! 😊

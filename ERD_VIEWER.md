# 🎨 Cara Lihat Diagram ERD

## 🌐 ONLINE (Paling Cepat!)

### Step 1: Copy Mermaid Code
Buka file `ERD.md`, copy bagian ini:

```mermaid
erDiagram
    PELANGGAN ||--o{ PESANAN : "membuat"
    KATEGORI ||--o{ LAYANAN : "memiliki"
    KATEGORI ||--o{ PRODUK : "memiliki"
    PESANAN ||--o{ DETAIL_LAYANAN : "berisi"
    PESANAN ||--o{ DETAIL_PRODUK : "berisi"
    PESANAN ||--o{ PEMBAYARAN : "memiliki"
    PESANAN ||--o{ PENGIRIMAN : "memiliki"
    LAYANAN ||--o{ DETAIL_LAYANAN : "digunakan_dalam"
    PRODUK ||--o{ DETAIL_PRODUK : "digunakan_dalam"

    PELANGGAN {
        int id_pelanggan PK
        varchar nama
        varchar no_hp UK
        varchar alamat
        timestamp created_at
    }

    KATEGORI {
        int id_kategori PK
        varchar nama_kategori UK
        enum jenis
    }

    LAYANAN {
        int id_layanan PK
        int id_kategori FK
        varchar nama_layanan
        decimal harga
        enum satuan
        tinyint estimasi_hari
    }

    PRODUK {
        int id_produk PK
        int id_kategori FK
        varchar nama_produk
        decimal harga
        int stok
    }

    PESANAN {
        int id_pesanan PK
        int id_pelanggan FK
        datetime tgl_masuk
        datetime tgl_selesai
        enum status_cucian
        decimal total
    }

    DETAIL_LAYANAN {
        int id_pesanan PK_FK
        int id_layanan PK_FK
        decimal jumlah
        decimal harga_satuan
        decimal subtotal
    }

    DETAIL_PRODUK {
        int id_pesanan PK_FK
        int id_produk PK_FK
        int qty
        decimal harga_satuan
        decimal subtotal
    }

    PEMBAYARAN {
        int id_pembayaran PK
        int id_pesanan FK
        enum metode
        decimal jumlah
        datetime tgl_bayar
        enum status
    }

    PENGIRIMAN {
        int id_pengiriman PK
        int id_pesanan FK
        enum jenis
        varchar alamat
        decimal biaya
        enum status
    }
```

### Step 2: Buka Website
**URL:** https://mermaid.live/

### Step 3: Paste & View
1. Hapus code default di editor
2. Paste code Mermaid Anda
3. Diagram otomatis muncul! 🎨

### Step 4: Export (Opsional)
Klik tombol **"Actions"** → **"PNG"** atau **"SVG"** untuk download

---

## 🖥️ VS CODE (Recommended!)

### Install Extension:
1. `Ctrl+Shift+X` → Search "Markdown Preview Mermaid Support"
2. Install extension
3. Buka `ERD.md`
4. `Ctrl+Shift+V` untuk preview

---

## 🗄️ DATABASE TOOLS

### MySQL Workbench (Free)
**Download:** https://dev.mysql.com/downloads/workbench/

**Cara:**
1. Connect ke database laundry_db
2. Menu: Database → Reverse Engineer
3. Select tables
4. Auto-generate ERD!

### DBeaver (Recommended, Free)
**Download:** https://dbeaver.io/

**Cara:**
1. Connect ke MySQL (localhost:3306)
2. Klik database `laundry_db`
3. Klik tab **"ER Diagram"**
4. Drag tables ke canvas
5. Right-click → Auto-arrange

### HeidiSQL (Lightweight, Free)
**Download:** https://www.heidisql.com/

---

## 🎨 PRISMA STUDIO (Already Running!)

**URL:** http://localhost:5555

**Cara:**
1. Buka Prisma Studio
2. Klik tabel manapun (misal: `pesanan`)
3. Lihat kolom dengan icon 🔗 (ini relasi)
4. Klik untuk navigate ke tabel related

**Keunggulan:** Interactive! Bisa klik dan explore

---

## 📊 ARCHITECTURE DIAGRAM

Untuk visualisasi architecture layers:
- Lihat file `ARCHITECTURE.md`
- Atau buka `APPLICATION_STATUS.md`


const router = require('express').Router();
const pool = require('../db');

// READ - Tampilkan semua pesanan
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, pl.nama AS nama_pelanggan, pl.no_hp
      FROM pesanan p
      JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
      ORDER BY p.tgl_masuk DESC
    `);
    res.render('pesanan/index', { rows, error: null, success: null });
  } catch (error) {
    res.render('pesanan/index', { rows: [], error: error.message, success: null });
  }
});

// Halaman tambah pesanan
router.get('/tambah', async (req, res) => {
  try {
    const [pelanggan] = await pool.query('SELECT * FROM pelanggan ORDER BY nama');
    const [layanan] = await pool.query('SELECT * FROM layanan ORDER BY nama_layanan');
    const [produk] = await pool.query('SELECT * FROM produk WHERE stok > 0 ORDER BY nama_produk');
    
    res.render('pesanan/form', { 
      pelanggan,
      layanan,
      produk,
      error: null 
    });
  } catch (error) {
    res.redirect('/pesanan?error=' + error.message);
  }
});

// CREATE - Buat pesanan baru dengan transaksi & Stored Procedures
router.post('/', async (req, res) => {
  const { 
    id_pelanggan, 
    layanan_ids = [], 
    layanan_jumlah = [], 
    produk_ids = [], 
    produk_qty = [],
    perlu_antar,
    alamat_antar
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Buat pesanan via Stored Procedure: buat_pesanan
    await conn.query('CALL buat_pesanan(?, @id)', [id_pelanggan]);
    const [[{ id: idPesanan }]] = await conn.query('SELECT @id AS id');

    // 2. Tambah detail layanan via Stored Procedure: tambah_layanan
    // (Subtotal & total pesanan otomatis dihitung oleh trigger trg_dl_bi & trg_dl_ai)
    const layananArray = Array.isArray(layanan_ids) ? layanan_ids : (layanan_ids ? [layanan_ids] : []);
    const layananJumlahArray = Array.isArray(layanan_jumlah) ? layanan_jumlah : (layanan_jumlah ? [layanan_jumlah] : []);
    
    for (let i = 0; i < layananArray.length; i++) {
      if (layananArray[i] && layananJumlahArray[i] && parseFloat(layananJumlahArray[i]) > 0) {
        await conn.query(
          'CALL tambah_layanan(?, ?, ?)',
          [idPesanan, layananArray[i], parseFloat(layananJumlahArray[i])]
        );
      }
    }

    // 3. Tambah detail produk via Stored Procedure: tambah_produk
    // (Stok dicek & dikurangi otomatis oleh trigger trg_dp_bi & trg_dp_ai)
    const produkArray = Array.isArray(produk_ids) ? produk_ids : (produk_ids ? [produk_ids] : []);
    const produkQtyArray = Array.isArray(produk_qty) ? produk_qty : (produk_qty ? [produk_qty] : []);
    
    for (let i = 0; i < produkArray.length; i++) {
      if (produkArray[i] && produkQtyArray[i] && parseInt(produkQtyArray[i]) > 0) {
        await conn.query(
          'CALL tambah_produk(?, ?, ?)',
          [idPesanan, produkArray[i], parseInt(produkQtyArray[i])]
        );
      }
    }

    // 4. Pengiriman jika perlu antar (Trigger trg_kirim_ai otomatis menambahkan ongkir ke total pesanan)
    if (perlu_antar === 'ya' && alamat_antar) {
      await conn.query(
        'INSERT INTO pengiriman (id_pesanan, jenis, alamat, biaya) VALUES (?, ?, ?, ?)',
        [idPesanan, 'antar', alamat_antar, 5000]
      );
    }

    await conn.commit();
    res.redirect(`/pesanan/${idPesanan}?success=Pesanan berhasil dibuat`);
  } catch (error) {
    await conn.rollback();
    const pesan = error.sqlState === '45000' ? error.sqlMessage : error.message;
    res.redirect('/pesanan/tambah?error=' + encodeURIComponent(pesan));
  } finally {
    conn.release();
  }
});

// Alias untuk tambah pesanan baru
router.get('/baru', (req, res) => res.redirect('/pesanan/tambah'));

// Detail pesanan
router.get('/:id', async (req, res) => {
  try {
    const [[pesanan]] = await pool.query(`
      SELECT p.*, pl.nama AS nama_pelanggan, pl.no_hp, pl.alamat AS alamat_pelanggan
      FROM pesanan p
      JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
      WHERE p.id_pesanan = ?
    `, [req.params.id]);

    if (!pesanan) {
      return res.redirect('/pesanan?error=Pesanan tidak ditemukan');
    }

    const [detail_layanan] = await pool.query(`
      SELECT dl.*, l.nama_layanan, l.satuan
      FROM detail_layanan dl
      JOIN layanan l ON l.id_layanan = dl.id_layanan
      WHERE dl.id_pesanan = ?
    `, [req.params.id]);

    const [detail_produk] = await pool.query(`
      SELECT dp.*, pr.nama_produk
      FROM detail_produk dp
      JOIN produk pr ON pr.id_produk = dp.id_produk
      WHERE dp.id_pesanan = ?
    `, [req.params.id]);

    const [pengiriman] = await pool.query(`
      SELECT * FROM pengiriman WHERE id_pesanan = ?
    `, [req.params.id]);

    const [pembayaran] = await pool.query(`
      SELECT * FROM pembayaran WHERE id_pesanan = ? ORDER BY tgl_bayar DESC
    `, [req.params.id]);

    const [[{ sisa }]] = await pool.query('SELECT sisa_tagihan(?) AS sisa', [req.params.id]);
    const sisaNominal = Number(sisa !== null ? sisa : 0);
    const total_dibayar = Number(pesanan.total) - sisaNominal;

    res.render('pesanan/detail', {
      pesanan,
      detail_layanan,
      detail_produk,
      pengiriman,
      pembayaran,
      total_dibayar,
      sisa: sisaNominal,
      error: null,
      success: null
    });
  } catch (error) {
    res.redirect('/pesanan?error=' + error.message);
  }
});

// Update status cucian (Trigger trg_pesanan_bu otomatis mengisi tgl_selesai jika status 'selesai')
router.post('/:id/status', async (req, res) => {
  const { status_cucian } = req.body;
  try {
    await pool.query(
      "UPDATE pesanan SET status_cucian = ? WHERE id_pesanan = ?",
      [status_cucian, req.params.id]
    );
    res.redirect(`/pesanan/${req.params.id}?success=Status berhasil diubah`);
  } catch (error) {
    res.redirect(`/pesanan/${req.params.id}?error=` + error.message);
  }
});

// Tambah pembayaran via Stored Procedure: catat_pembayaran
// (Aturan bisnis: cek sisa via sisa_tagihan, kunci baris FOR UPDATE, dan set status lunas/sebagian)
router.post('/:id/bayar', async (req, res) => {
  const { metode, jumlah } = req.body;
  try {
    await pool.query('CALL catat_pembayaran(?, ?, ?)', [req.params.id, parseFloat(jumlah), metode]);
    res.redirect(`/pesanan/${req.params.id}?success=Pembayaran berhasil ditambahkan`);
  } catch (error) {
    const pesan = error.sqlState === '45000' ? error.sqlMessage : error.message;
    res.redirect(`/pesanan/${req.params.id}?error=` + encodeURIComponent(pesan));
  }
});

module.exports = router;

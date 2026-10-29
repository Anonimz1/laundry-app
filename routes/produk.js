const router = require('express').Router();
const pool = require('../db');

// READ - Tampilkan semua produk
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, k.nama_kategori 
      FROM produk p
      JOIN kategori k ON k.id_kategori = p.id_kategori
      ORDER BY p.nama_produk
    `);
    res.render('produk/index', { rows, error: null, success: null });
  } catch (error) {
    res.render('produk/index', { rows: [], error: error.message, success: null });
  }
});

// Halaman tambah produk
router.get('/tambah', async (req, res) => {
  try {
    const [kategori] = await pool.query(
      "SELECT * FROM kategori WHERE jenis = 'PRODUK' ORDER BY nama_kategori"
    );
    res.render('produk/form', { 
      data: { id_produk: null, id_kategori: '', nama_produk: '', harga: '', stok: '' },
      kategori,
      error: null 
    });
  } catch (error) {
    res.redirect('/produk?error=' + error.message);
  }
});

// CREATE - Tambah produk baru
router.post('/', async (req, res) => {
  const { id_kategori, nama_produk, harga, stok } = req.body;
  try {
    await pool.query(
      'INSERT INTO produk (id_kategori, nama_produk, harga, stok) VALUES (?, ?, ?, ?)',
      [id_kategori, nama_produk, harga, stok]
    );
    res.redirect('/produk?success=Produk berhasil ditambahkan');
  } catch (error) {
    const [kategori] = await pool.query(
      "SELECT * FROM kategori WHERE jenis = 'PRODUK' ORDER BY nama_kategori"
    );
    res.render('produk/form', {
      data: { id_produk: null, id_kategori, nama_produk, harga, stok },
      kategori,
      error: error.message
    });
  }
});

// Halaman edit produk
router.get('/:id/edit', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM produk WHERE id_produk = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.redirect('/produk?error=Produk tidak ditemukan');
    }
    const [kategori] = await pool.query(
      "SELECT * FROM kategori WHERE jenis = 'PRODUK' ORDER BY nama_kategori"
    );
    res.render('produk/form', { data: rows[0], kategori, error: null });
  } catch (error) {
    res.redirect('/produk?error=' + error.message);
  }
});

// UPDATE - Ubah data produk
router.post('/:id/edit', async (req, res) => {
  const { id_kategori, nama_produk, harga, stok } = req.body;
  try {
    await pool.query(
      'UPDATE produk SET id_kategori = ?, nama_produk = ?, harga = ?, stok = ? WHERE id_produk = ?',
      [id_kategori, nama_produk, harga, stok, req.params.id]
    );
    res.redirect('/produk?success=Produk berhasil diubah');
  } catch (error) {
    const [kategori] = await pool.query(
      "SELECT * FROM kategori WHERE jenis = 'PRODUK' ORDER BY nama_kategori"
    );
    res.render('produk/form', {
      data: { id_produk: req.params.id, id_kategori, nama_produk, harga, stok },
      kategori,
      error: error.message
    });
  }
});

// DELETE - Hapus produk
router.post('/:id/hapus', async (req, res) => {
  try {
    await pool.query('DELETE FROM produk WHERE id_produk = ?', [req.params.id]);
    res.redirect('/produk?success=Produk berhasil dihapus');
  } catch (error) {
    const message = error.code === 'ER_ROW_IS_REFERENCED_2'
      ? 'Tidak bisa dihapus, produk masih ada dalam pesanan'
      : error.message;
    res.redirect('/produk?error=' + message);
  }
});

module.exports = router;

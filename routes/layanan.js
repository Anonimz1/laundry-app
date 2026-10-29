const router = require('express').Router();
const pool = require('../db');

// READ - Tampilkan semua layanan
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT l.*, k.nama_kategori 
      FROM layanan l
      JOIN kategori k ON k.id_kategori = l.id_kategori
      ORDER BY l.nama_layanan
    `);
    res.render('layanan/index', { rows, error: null, success: null });
  } catch (error) {
    res.render('layanan/index', { rows: [], error: error.message, success: null });
  }
});

// Halaman tambah layanan
router.get('/tambah', async (req, res) => {
  try {
    const [kategori] = await pool.query(
      "SELECT * FROM kategori WHERE jenis = 'LAYANAN' ORDER BY nama_kategori"
    );
    res.render('layanan/form', { 
      data: { 
        id_layanan: null, 
        id_kategori: '', 
        nama_layanan: '', 
        harga: '', 
        satuan: 'kg',
        estimasi_hari: '2'
      },
      kategori,
      error: null 
    });
  } catch (error) {
    res.redirect('/layanan?error=' + error.message);
  }
});

// CREATE - Tambah layanan baru
router.post('/', async (req, res) => {
  const { id_kategori, nama_layanan, harga, satuan, estimasi_hari } = req.body;
  try {
    await pool.query(
      'INSERT INTO layanan (id_kategori, nama_layanan, harga, satuan, estimasi_hari) VALUES (?, ?, ?, ?, ?)',
      [id_kategori, nama_layanan, harga, satuan, estimasi_hari]
    );
    res.redirect('/layanan?success=Layanan berhasil ditambahkan');
  } catch (error) {
    const [kategori] = await pool.query(
      "SELECT * FROM kategori WHERE jenis = 'LAYANAN' ORDER BY nama_kategori"
    );
    res.render('layanan/form', {
      data: { id_layanan: null, id_kategori, nama_layanan, harga, satuan, estimasi_hari },
      kategori,
      error: error.message
    });
  }
});

// Halaman edit layanan
router.get('/:id/edit', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM layanan WHERE id_layanan = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.redirect('/layanan?error=Layanan tidak ditemukan');
    }
    const [kategori] = await pool.query(
      "SELECT * FROM kategori WHERE jenis = 'LAYANAN' ORDER BY nama_kategori"
    );
    res.render('layanan/form', { data: rows[0], kategori, error: null });
  } catch (error) {
    res.redirect('/layanan?error=' + error.message);
  }
});

// UPDATE - Ubah data layanan
router.post('/:id/edit', async (req, res) => {
  const { id_kategori, nama_layanan, harga, satuan, estimasi_hari } = req.body;
  try {
    await pool.query(
      'UPDATE layanan SET id_kategori = ?, nama_layanan = ?, harga = ?, satuan = ?, estimasi_hari = ? WHERE id_layanan = ?',
      [id_kategori, nama_layanan, harga, satuan, estimasi_hari, req.params.id]
    );
    res.redirect('/layanan?success=Layanan berhasil diubah');
  } catch (error) {
    const [kategori] = await pool.query(
      "SELECT * FROM kategori WHERE jenis = 'LAYANAN' ORDER BY nama_kategori"
    );
    res.render('layanan/form', {
      data: { id_layanan: req.params.id, id_kategori, nama_layanan, harga, satuan, estimasi_hari },
      kategori,
      error: error.message
    });
  }
});

// DELETE - Hapus layanan
router.post('/:id/hapus', async (req, res) => {
  try {
    await pool.query('DELETE FROM layanan WHERE id_layanan = ?', [req.params.id]);
    res.redirect('/layanan?success=Layanan berhasil dihapus');
  } catch (error) {
    const message = error.code === 'ER_ROW_IS_REFERENCED_2'
      ? 'Tidak bisa dihapus, layanan masih ada dalam pesanan'
      : error.message;
    res.redirect('/layanan?error=' + message);
  }
});

module.exports = router;

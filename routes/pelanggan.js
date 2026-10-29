const router = require('express').Router();
const pool = require('../db');

// READ - Tampilkan semua pelanggan
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM pelanggan ORDER BY nama'
    );
    res.render('pelanggan/index', { rows, error: null, success: null });
  } catch (error) {
    res.render('pelanggan/index', { rows: [], error: error.message, success: null });
  }
});

// Halaman tambah pelanggan
router.get('/tambah', (req, res) => {
  res.render('pelanggan/form', { 
    data: { id_pelanggan: null, nama: '', no_hp: '', alamat: '' },
    error: null 
  });
});

// CREATE - Tambah pelanggan baru
router.post('/', async (req, res) => {
  const { nama, no_hp, alamat } = req.body;
  try {
    await pool.query(
      'INSERT INTO pelanggan (nama, no_hp, alamat) VALUES (?, ?, ?)',
      [nama, no_hp, alamat]
    );
    res.redirect('/pelanggan?success=Pelanggan berhasil ditambahkan');
  } catch (error) {
    res.render('pelanggan/form', {
      data: { id_pelanggan: null, nama, no_hp, alamat },
      error: error.code === 'ER_DUP_ENTRY' 
        ? 'Nomor HP sudah terdaftar' 
        : error.message
    });
  }
});

// Halaman edit pelanggan
router.get('/:id/edit', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM pelanggan WHERE id_pelanggan = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.redirect('/pelanggan?error=Pelanggan tidak ditemukan');
    }
    res.render('pelanggan/form', { data: rows[0], error: null });
  } catch (error) {
    res.redirect('/pelanggan?error=' + error.message);
  }
});

// UPDATE - Ubah data pelanggan
router.post('/:id/edit', async (req, res) => {
  const { nama, no_hp, alamat } = req.body;
  try {
    await pool.query(
      'UPDATE pelanggan SET nama = ?, no_hp = ?, alamat = ? WHERE id_pelanggan = ?',
      [nama, no_hp, alamat, req.params.id]
    );
    res.redirect('/pelanggan?success=Pelanggan berhasil diubah');
  } catch (error) {
    res.render('pelanggan/form', {
      data: { id_pelanggan: req.params.id, nama, no_hp, alamat },
      error: error.code === 'ER_DUP_ENTRY' 
        ? 'Nomor HP sudah terdaftar' 
        : error.message
    });
  }
});

// DELETE - Hapus pelanggan
router.post('/:id/hapus', async (req, res) => {
  try {
    await pool.query('DELETE FROM pelanggan WHERE id_pelanggan = ?', [req.params.id]);
    res.redirect('/pelanggan?success=Pelanggan berhasil dihapus');
  } catch (error) {
    const message = error.code === 'ER_ROW_IS_REFERENCED_2'
      ? 'Tidak bisa dihapus, pelanggan masih memiliki pesanan'
      : error.message;
    res.redirect('/pelanggan?error=' + message);
  }
});

module.exports = router;

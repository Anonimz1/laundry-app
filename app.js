require('dotenv').config();
const express = require('express');
const pool = require('./db');
const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Data untuk sidebar: jumlah cucian aktif + menu yang sedang dibuka
app.use(async (req, res, next) => {
  try {
    const [[r]] = await pool.query(
      "SELECT COUNT(*) AS n FROM pesanan WHERE status_cucian <> 'selesai'");
    res.locals.aktif = r.n;
  } catch {
    res.locals.aktif = 0;
  }
  res.locals.active = req.path.split('/')[1] || 'dashboard';
  next();
});

app.use('/', require('./routes/dashboard'));
app.use('/pelanggan', require('./routes/pelanggan'));
app.use('/produk', require('./routes/produk'));
app.use('/layanan', require('./routes/layanan'));
app.use('/pesanan', require('./routes/pesanan'));
app.use('/pembayaran', require('./routes/pembayaran'));
app.use('/laporan', require('./routes/laporan'));

// Cek koneksi saat start
pool.query('SELECT 1')
  .then(() => app.listen(process.env.PORT || 3000, () =>
    console.log(`Berjalan di http://localhost:${process.env.PORT || 3000}`)))
  .catch(err => console.error('Koneksi DB gagal:', err.message));

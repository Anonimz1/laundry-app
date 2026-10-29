const router = require('express').Router();
const pool = require('../db');

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// 6 bulan terakhir (termasuk bulan ini), bulan tanpa transaksi bernilai 0
function enamBulan() {
  const out = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      bulan: NAMA_BULAN[d.getMonth()],
    });
  }
  return out;
}

async function omzetBulanan(tabelDetail) {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m') AS bln, SUM(x.subtotal) AS nilai
       FROM ${tabelDetail} x
       JOIN pesanan p ON p.id_pesanan = x.id_pesanan
      WHERE p.tgl_masuk >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
      GROUP BY bln`);
  const peta = Object.fromEntries(rows.map(r => [r.bln, Number(r.nilai)]));
  return enamBulan().map(m => ({ bulan: m.bulan, nilai: peta[m.key] || 0 }));
}

router.get('/', async (req, res, next) => {
  try {
    const [[terbaru], [bayar], [stok], terlarisRes, layanan, produk] = await Promise.all([
      pool.query(
        `SELECT p.id_pesanan, pl.nama, p.status_cucian, p.total
           FROM pesanan p JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
          ORDER BY p.tgl_masuk DESC LIMIT 5`),
      pool.query(
        `SELECT p.id_pesanan, pl.nama, p.total,
                (p.total - sisa_tagihan(p.id_pesanan)) AS dibayar
           FROM pesanan p
           JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
          ORDER BY p.tgl_masuk DESC LIMIT 5`),
      pool.query(
        `SELECT nama_produk, stok, nama_kategori FROM v_stok_menipis LIMIT 5`),
      pool.query(
        `SELECT l.nama_layanan, k.nama_kategori, l.estimasi_hari,
                SUM(dl.jumlah) AS jml, SUM(dl.subtotal) AS omzet
           FROM detail_layanan dl
           JOIN layanan l  ON l.id_layanan  = dl.id_layanan
           JOIN kategori k ON k.id_kategori = l.id_kategori
          GROUP BY l.id_layanan, l.nama_layanan, k.nama_kategori, l.estimasi_hari
          ORDER BY omzet DESC LIMIT 5`),
      omzetBulanan('detail_layanan'),
      omzetBulanan('detail_produk'),
    ]);

    res.render('dashboard', {
      terbaru,
      bayar: bayar.map(b => ({ ...b, total: Number(b.total), dibayar: Number(b.dibayar) })),
      stok,
      terlaris: terlarisRes[0],
      series: [
        { key: 'layanan', label: 'Layanan', data: layanan },
        { key: 'produk',  label: 'Produk',  data: produk },
      ],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

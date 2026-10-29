const router = require('express').Router();
const pool = require('../db');

const METODE = ['tunai', 'QRIS', 'transfer'];

router.get('/', async (req, res, next) => {
  try {
    const [[[tag]], [[trm]], [status], [belum], [riwayat]] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total),0) AS ditagih FROM pesanan`),
      pool.query(`SELECT COALESCE(SUM(jumlah),0) AS diterima FROM pembayaran WHERE status <> 'batal'`),
      pool.query(`SELECT status, COUNT(*) AS n FROM pembayaran GROUP BY status`),
      // View v_pesanan_belum_lunas. Cucian yang sudah siap diambil ditagih lebih dulu.
      pool.query(
        `SELECT * FROM v_pesanan_belum_lunas
          ORDER BY (status_cucian = 'siap') DESC, tgl_masuk`),
      pool.query(
        `SELECT b.id_pembayaran, b.id_pesanan, pl.nama, b.metode, b.jumlah, b.tgl_bayar, b.status
           FROM pembayaran b
           JOIN pesanan p    ON p.id_pesanan   = b.id_pesanan
           JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
          ORDER BY b.tgl_bayar DESC LIMIT 50`),
    ]);

    const jml = Object.fromEntries(status.map(s => [s.status, Number(s.n)]));
    res.render('pembayaran/index', {
      ringkasan: {
        ditagih: Number(tag.ditagih),
        diterima: Number(trm.diterima),
        lunas: jml.lunas || 0,
        sebagian: jml.sebagian || 0,
        batal: jml.batal || 0,
      },
      belum: belum.map(b => ({ ...b, total: Number(b.total), dibayar: Number(b.dibayar) })),
      riwayat: riwayat.map(r => ({ ...r, jumlah: Number(r.jumlah) })),
      err: req.query.err || '',
      ok: req.query.ok || '',
    });
  } catch (e) { next(e); }
});

// Catat pembayaran: aturan bisnis (cek sisa, kunci pesanan, status lunas/sebagian)
// ada di procedure catat_pembayaran. Aplikasi hanya memanggil dan menampilkan hasilnya.
router.post('/', async (req, res) => {
  const idPesanan = Number(req.body.id_pesanan);
  const jumlah = Math.round(Number(req.body.jumlah));
  const metode = req.body.metode;
  const balik = (kunci, pesan) => res.redirect('/pembayaran?' + kunci + '=' + encodeURIComponent(pesan));

  if (!idPesanan || !(jumlah > 0) || !METODE.includes(metode)) {
    return balik('err', 'Isi pesanan, jumlah, dan metode dengan benar.');
  }

  try {
    await pool.query('CALL catat_pembayaran(?,?,?)', [idPesanan, jumlah, metode]);
    const [[r]] = await pool.query('SELECT sisa_tagihan(?) AS sisa', [idPesanan]);
    balik('ok', Number(r.sisa) <= 0 ? 'Pesanan #' + idPesanan + ' lunas.' : 'Pembayaran sebagian tercatat.');
  } catch (e) {
    // SQLSTATE 45000 = pesan aturan bisnis dari SIGNAL di database
    balik('err', e.sqlState === '45000' ? e.sqlMessage : 'Gagal menyimpan pembayaran.');
  }
});

module.exports = router;

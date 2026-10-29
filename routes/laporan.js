const router = require('express').Router();
const pool = require('../db');

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// 6 bulan terakhir
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

// Halaman laporan lengkap
router.get('/', async (req, res) => {
  try {
    // KPI (menggunakan view v_stok_menipis)
    const [[kpiRes]] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM pesanan) AS totalPesanan,
        (SELECT COUNT(*) FROM pesanan WHERE status_cucian = 'selesai') AS selesai,
        (SELECT COALESCE(SUM(total), 0) FROM pesanan) AS omzet,
        (SELECT COALESCE(SUM(jumlah), 0) FROM pembayaran WHERE status <> 'batal') AS dibayar,
        (SELECT COUNT(DISTINCT id_pelanggan) FROM pesanan) AS pelanggan,
        (SELECT COUNT(*) FROM (SELECT id_pelanggan FROM pesanan GROUP BY id_pelanggan HAVING COUNT(*) > 1) t) AS pelangganUlang,
        (SELECT COUNT(*) FROM v_stok_menipis) AS menipis,
        (SELECT COUNT(*) FROM produk) AS produk
    `);
    const kpi = kpiRes || { totalPesanan: 0, selesai: 0, omzet: 0, dibayar: 0, pelanggan: 0, pelangganUlang: 0, menipis: 0, produk: 0 };

    // Panggil Stored Procedure: laporan_omzet untuk 30 hari terakhir
    await pool.query('CALL laporan_omzet(DATE_SUB(CURDATE(), INTERVAL 29 DAY), CURDATE())');

    // Harian 30 hari
    const [harian] = await pool.query(`
      SELECT DATE(tgl_masuk) AS tgl, COUNT(*) AS pesanan, COALESCE(SUM(total), 0) AS omzet
      FROM pesanan
      WHERE tgl_masuk >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY DATE(tgl_masuk)
      ORDER BY tgl
    `);
    const peta = Object.fromEntries(harian.map(h => [h.tgl.toISOString().split('T')[0], h]));
    const harianLengkap = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().split('T')[0];
      harianLengkap.push({
        label: d.getDate() === 1 || i === 0 ? `${d.getDate()}/${d.getMonth() + 1}` : d.getDate().toString(),
        pesanan: peta[k] ? peta[k].pesanan : 0,
        omzet: peta[k] ? Number(peta[k].omzet) : 0
      });
    }

    // Metode bayar
    const [metode] = await pool.query(`
      SELECT metode, COUNT(*) AS n, SUM(jumlah) AS total
      FROM pembayaran
      WHERE status <> 'batal'
      GROUP BY metode
      ORDER BY total DESC
    `);

    // Omzet bulanan per komponen (menggunakan View: v_omzet_bulanan)
    const [bulananRows] = await pool.query(`
      SELECT bulan, omzet_layanan, omzet_produk, ongkir
      FROM v_omzet_bulanan
      WHERE bulan >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH), '%Y-%m')
    `);
    const groupBulanan = Object.fromEntries(bulananRows.map(r => [r.bulan, r]));
    const bulanan = [
      { key: 'layanan', label: 'Layanan', data: enamBulan().map(m => ({ bulan: m.bulan, nilai: Number(groupBulanan[m.key]?.omzet_layanan || 0) })) },
      { key: 'produk', label: 'Produk', data: enamBulan().map(m => ({ bulan: m.bulan, nilai: Number(groupBulanan[m.key]?.omzet_produk || 0) })) },
      { key: 'pengiriman', label: 'Pengiriman', data: enamBulan().map(m => ({ bulan: m.bulan, nilai: Number(groupBulanan[m.key]?.ongkir || 0) })) },
    ];

    // Layanan terlaris
    const [layanan] = await pool.query(`
      SELECT l.nama_layanan AS nama, SUM(dl.jumlah) AS jml, SUM(dl.subtotal) AS omzet
      FROM detail_layanan dl JOIN layanan l ON l.id_layanan = dl.id_layanan
      GROUP BY l.id_layanan, l.nama_layanan
      ORDER BY omzet DESC LIMIT 8
    `);

    // Komposisi per kategori
    const [komposisi] = await pool.query(`
      SELECT k.nama_kategori AS nama, SUM(dl.subtotal) AS omzet
      FROM detail_layanan dl
      JOIN layanan l ON l.id_layanan = dl.id_layanan
      JOIN kategori k ON k.id_kategori = l.id_kategori
      GROUP BY k.id_kategori, k.nama_kategori
      UNION ALL
      SELECT k.nama_kategori, SUM(dp.subtotal)
      FROM detail_produk dp
      JOIN produk pr ON pr.id_produk = dp.id_produk
      JOIN kategori k ON k.id_kategori = pr.id_kategori
      GROUP BY k.id_kategori, k.nama_kategori
      ORDER BY omzet DESC
    `);

    // Pesanan belum lunas (menggunakan View: v_pesanan_belum_lunas)
    const [belumLunas] = await pool.query(`
      SELECT id_pesanan, nama, tgl_masuk, total, dibayar, sisa
      FROM v_pesanan_belum_lunas
      ORDER BY tgl_masuk
      LIMIT 10
    `);

    res.render('laporan/index', {
      kpi,
      harian: harianLengkap,
      metode: metode.map(m => ({ ...m, total: Number(m.total) })),
      bulanan,
      layanan: layanan.map(l => ({ ...l, jml: Number(l.jml), omzet: Number(l.omzet) })),
      komposisi: komposisi.map(k => ({ ...k, omzet: Number(k.omzet) })),
      belumLunas: belumLunas.map(b => ({ ...b, total: Number(b.total), dibayar: Number(b.dibayar) }))
    });
  } catch (err) {
    console.error(err);
    res.render('laporan/index', {
      kpi: { totalPesanan: 0, selesai: 0, omzet: 0, dibayar: 0, pelanggan: 0, pelangganUlang: 0, menipis: 0, produk: 0 },
      harian: [],
      metode: [],
      bulanan: [
        { key: 'layanan', label: 'Layanan', data: [] },
        { key: 'produk', label: 'Produk', data: [] },
        { key: 'pengiriman', label: 'Pengiriman', data: [] }
      ],
      layanan: [],
      komposisi: [],
      belumLunas: []
    });
  }
});

module.exports = router;

/**
 * Analytic Query Service
 * 17 Analytic Queries (A1-A17) from stage5_query_sql.sql
 * Maps to 11 business information requirements
 */

class AnalyticQueryService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * A1. Lima layanan terlaris
   * Kebutuhan: #1 (layanan terlaris), #8 (informasi layanan terlaris)
   */
  async A1_layananTerlaris(limit = 5) {
    return await this.prisma.$queryRaw`
      SELECT l.nama_layanan,
             COUNT(*) AS jumlah_nota,
             SUM(dl.jumlah) AS total_kg,
             SUM(dl.subtotal) AS omzet
      FROM detail_layanan dl
      INNER JOIN layanan l ON l.id_layanan = dl.id_layanan
      GROUP BY l.id_layanan, l.nama_layanan
      ORDER BY omzet DESC
      LIMIT ${limit}
    `;
  }

  /**
   * A2. Lima produk terlaris
   * Kebutuhan: #5 (stok/penjualan produk)
   */
  async A2_produkTerlaris(limit = 5) {
    return await this.prisma.$queryRaw`
      SELECT pr.nama_produk,
             SUM(dp.qty) AS unit_terjual,
             SUM(dp.subtotal) AS omzet
      FROM detail_produk dp
      INNER JOIN produk pr ON pr.id_produk = dp.id_produk
      GROUP BY pr.id_produk, pr.nama_produk
      ORDER BY unit_terjual DESC, omzet DESC
      LIMIT ${limit}
    `;
  }

  /**
   * A3. Posisi stok semua produk + alert stok menipis
   * Kebutuhan: #5 (stok tidak terpantau), #6 (produk belum terjual)
   */
  async A3_posisiStok() {
    return await this.prisma.$queryRaw`
      SELECT pr.nama_produk,
             pr.stok,
             COALESCE(SUM(dp.qty), 0) AS unit_terjual,
             CASE WHEN pr.stok < 5 THEN 'SEGERA ISI ULANG' ELSE 'aman' END AS keterangan
      FROM produk pr
      LEFT JOIN detail_produk dp ON dp.id_produk = pr.id_produk
      GROUP BY pr.id_produk, pr.nama_produk, pr.stok
      ORDER BY pr.stok ASC
    `;
  }

  /**
   * A4. Pesanan yang belum lunas + sisa tagihan
   * Kebutuhan: #4 (pembayaran sebagian tidak tercatat rapi)
   */
  async A4_pesananBelumLunas() {
    return await this.prisma.$queryRaw`
      SELECT p.id_pesanan,
             pl.nama,
             pl.no_hp,
             p.total,
             COALESCE(SUM(b.jumlah), 0) AS sudah_dibayar,
             p.total - COALESCE(SUM(b.jumlah), 0) AS sisa_tagihan
      FROM pesanan p
      INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
      LEFT JOIN pembayaran b ON b.id_pesanan = p.id_pesanan AND b.status <> 'batal'
      GROUP BY p.id_pesanan, pl.nama, pl.no_hp, p.total
      HAVING p.total - COALESCE(SUM(b.jumlah), 0) > 0
      ORDER BY sisa_tagihan DESC
    `;
  }

  /**
   * A5. Pesanan yang melewati estimasi layanan
   * Kebutuhan: #3 (cucian melewati estimasi tanpa peringatan), #7 (selesai melewati estimasi)
   */
  async A5_pesananTerlambat() {
    return await this.prisma.$queryRaw`
      SELECT p.id_pesanan,
             pl.nama,
             p.status_cucian,
             MAX(l.estimasi_hari) AS estimasi_hari,
             TIMESTAMPDIFF(HOUR, p.tgl_masuk, COALESCE(p.tgl_selesai, NOW())) AS jam_berjalan,
             TIMESTAMPDIFF(HOUR, p.tgl_masuk, COALESCE(p.tgl_selesai, NOW())) - MAX(l.estimasi_hari) * 24 AS jam_terlambat
      FROM pesanan p
      INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
      INNER JOIN detail_layanan dl ON dl.id_pesanan = p.id_pesanan
      INNER JOIN layanan l ON l.id_layanan = dl.id_layanan
      GROUP BY p.id_pesanan, pl.nama, p.status_cucian, p.tgl_masuk, p.tgl_selesai
      HAVING TIMESTAMPDIFF(HOUR, p.tgl_masuk, COALESCE(p.tgl_selesai, NOW())) > MAX(l.estimasi_hari) * 24
      ORDER BY jam_terlambat DESC
    `;
  }

  /**
   * A6. Rekap omzet per bulan
   * Kebutuhan: #1 (nota tulis tangan, rekap omzet manual), #6 (nominal tagihan dihitung manual)
   */
  async A6_rekapOmzetBulanan() {
    return await this.prisma.$queryRaw`
      SELECT DATE_FORMAT(tgl_masuk, '%Y-%m') AS bulan,
             COUNT(*) AS jumlah_nota,
             SUM(total) AS omzet,
             ROUND(AVG(total), 0) AS rata_rata_nota,
             MIN(total) AS nota_terkecil,
             MAX(total) AS nota_terbesar
      FROM pesanan
      GROUP BY DATE_FORMAT(tgl_masuk, '%Y-%m')
      ORDER BY bulan
    `;
  }

  /**
   * A7. Laba bulanan = omzet - pengeluaran
   * Kebutuhan: #11 (selisih omzet dan pengeluaran)
   */
  async A7_labaBulanan() {
    return await this.prisma.$queryRaw`
      SELECT bulan,
             SUM(omzet) AS omzet,
             SUM(biaya) AS pengeluaran,
             SUM(omzet) - SUM(biaya) AS laba
      FROM (
        SELECT DATE_FORMAT(tgl_masuk, '%Y-%m') AS bulan, total AS omzet, 0 AS biaya
        FROM pesanan
        UNION ALL
        SELECT DATE_FORMAT(tgl_pengeluaran, '%Y-%m'), 0, jumlah
        FROM pengeluaran
      ) t
      GROUP BY bulan
      ORDER BY bulan
    `;
  }

  /**
   * A8. Pelanggan dengan belanja di atas threshold
   * Kebutuhan: #3 (pelanggan belanja terbesar), #7 (data pelanggan tersebar)
   */
  async A8_pelangganTopSpender(minBelanja = 100000) {
    return await this.prisma.$queryRaw`
      SELECT pl.nama,
             pl.no_hp,
             COUNT(p.id_pesanan) AS jumlah_nota,
             SUM(p.total) AS total_belanja,
             MAX(p.tgl_masuk) AS nota_terakhir
      FROM pelanggan pl
      INNER JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
      GROUP BY pl.id_pelanggan, pl.nama, pl.no_hp
      HAVING SUM(p.total) > ${minBelanja}
      ORDER BY total_belanja DESC
    `;
  }

  /**
   * A9. Pengeluaran per kategori
   * Shows all expense categories including those with zero expenses
   */
  async A9_pengeluaranPerKategori() {
    return await this.prisma.$queryRaw`
      SELECT k.nama_kategori,
             COUNT(pg.id_pengeluaran) AS jumlah_catatan,
             COALESCE(SUM(pg.jumlah), 0) AS total_pengeluaran
      FROM kategori k
      LEFT JOIN pengeluaran pg ON pg.id_kategori = k.id_kategori
      WHERE k.jenis = 'PENGELUARAN'
      GROUP BY k.id_kategori, k.nama_kategori
      ORDER BY total_pengeluaran DESC
    `;
  }

  /**
   * A10. Komposisi pembayaran per metode
   */
  async A10_komposisiPembayaran() {
    return await this.prisma.$queryRaw`
      SELECT metode,
             COUNT(*) AS jumlah_transaksi,
             SUM(jumlah) AS total_diterima,
             ROUND(AVG(jumlah), 0) AS rata_rata
      FROM pembayaran
      WHERE status <> 'batal'
      GROUP BY metode
      ORDER BY total_diterima DESC
    `;
  }

  /**
   * A11. Pesanan yang masih dalam pengerjaan
   * Kebutuhan: #2 (status cucian tidak terpantau), #9 (tahap cucian - untuk semua pelanggan)
   */
  async A11_pesananDalamPengerjaan() {
    return await this.prisma.$queryRaw`
      SELECT p.id_pesanan, pl.nama, p.status_cucian, p.tgl_masuk
      FROM pesanan p
      INNER JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
      WHERE p.status_cucian <> 'selesai'
      ORDER BY p.tgl_masuk ASC
    `;
  }

  /**
   * A12. Pelanggan yang memakai layanan antar-jemput
   */
  async A12_pelangganAntarJemput() {
    return await this.prisma.$queryRaw`
      SELECT DISTINCT pl.nama, pl.alamat
      FROM pelanggan pl
      INNER JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
      INNER JOIN pengiriman pg ON pg.id_pesanan = p.id_pesanan
      ORDER BY pl.nama
    `;
  }

  /**
   * A13. Metode pembayaran yang pernah dipakai (distinct)
   */
  async A13_metodePembayaran() {
    return await this.prisma.$queryRaw`
      SELECT DISTINCT metode 
      FROM pembayaran 
      WHERE status <> 'batal' 
      ORDER BY metode
    `;
  }

  /**
   * A14. Omzet layanan vs produk per bulan
   * Kebutuhan: #2 (omzet layanan vs produk/bulan)
   */
  async A14_omzetLayananVsProduk() {
    return await this.prisma.$queryRaw`
      SELECT bulan,
             SUM(omzet_layanan) AS omzet_layanan,
             SUM(omzet_produk) AS omzet_produk,
             SUM(omzet_layanan) + SUM(omzet_produk) AS omzet_gabungan,
             ROUND(100 * SUM(omzet_produk) /
                   (SUM(omzet_layanan) + SUM(omzet_produk)), 1) AS persen_produk
      FROM (
        SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m') AS bulan, 
               dl.subtotal AS omzet_layanan, 0 AS omzet_produk
        FROM detail_layanan dl
        INNER JOIN pesanan p ON p.id_pesanan = dl.id_pesanan
        UNION ALL
        SELECT DATE_FORMAT(p.tgl_masuk, '%Y-%m'), 0, dp.subtotal
        FROM detail_produk dp
        INNER JOIN pesanan p ON p.id_pesanan = dp.id_pesanan
      ) t
      GROUP BY bulan
      ORDER BY bulan
    `;
  }

  /**
   * A15. Rata-rata berat cucian kiloan per pelanggan
   * Kebutuhan: #8 (rata-rata berat per pelanggan)
   */
  async A15_rataBeratPerPelanggan() {
    return await this.prisma.$queryRaw`
      SELECT pl.nama,
             COUNT(*) AS jumlah_nota,
             SUM(n.kg_nota) AS total_kg,
             ROUND(AVG(n.kg_nota), 2) AS rata_rata_kg_per_nota,
             MIN(n.kg_nota) AS nota_teringan,
             MAX(n.kg_nota) AS nota_terberat
      FROM (
        SELECT p.id_pesanan, p.id_pelanggan, SUM(dl.jumlah) AS kg_nota
        FROM pesanan p
        INNER JOIN detail_layanan dl ON dl.id_pesanan = p.id_pesanan
        INNER JOIN layanan l ON l.id_layanan = dl.id_layanan
        WHERE l.satuan = 'kg'
        GROUP BY p.id_pesanan, p.id_pelanggan
      ) n
      INNER JOIN pelanggan pl ON pl.id_pelanggan = n.id_pelanggan
      GROUP BY pl.id_pelanggan, pl.nama
      ORDER BY rata_rata_kg_per_nota DESC
    `;
  }

  /**
   * A16. Pengeluaran per bulan per kategori
   * Kebutuhan: #10 (pengeluaran per bulan per kategori)
   */
  async A16_pengeluaranBulananPerKategori() {
    return await this.prisma.$queryRaw`
      SELECT DATE_FORMAT(pg.tgl_pengeluaran, '%Y-%m') AS bulan,
             k.nama_kategori,
             COUNT(*) AS jumlah_catatan,
             SUM(pg.jumlah) AS total_pengeluaran
      FROM pengeluaran pg
      INNER JOIN kategori k ON k.id_kategori = pg.id_kategori
      GROUP BY DATE_FORMAT(pg.tgl_pengeluaran, '%Y-%m'), k.id_kategori, k.nama_kategori
      ORDER BY bulan, total_pengeluaran DESC
    `;
  }

  /**
   * A17. Status cucian seorang pelanggan (by phone number)
   * Kebutuhan: #9 (tahap cucian seorang pelanggan - untuk pelanggan tertentu)
   * Parameter: noHp must be passed from user request (PreparedStatement safe)
   */
  async A17_statusCucianByPhone(noHp) {
    return await this.prisma.$queryRaw`
      SELECT pl.nama, p.id_pesanan, p.status_cucian, p.tgl_masuk, p.tgl_selesai
      FROM pelanggan pl
      INNER JOIN pesanan p ON p.id_pelanggan = pl.id_pelanggan
      WHERE pl.no_hp = ${noHp}
      ORDER BY p.tgl_masuk DESC
    `;
  }

  // ====================================================================
  // HELPER: Get All Analytics Summary
  // ====================================================================
  async getAllAnalyticsSummary() {
    const [
      layananTerlaris,
      produkTerlaris,
      pesananBelumLunas,
      pesananTerlambat,
      stokMenipis,
    ] = await Promise.all([
      this.A1_layananTerlaris(3),
      this.A2_produkTerlaris(3),
      this.A4_pesananBelumLunas(),
      this.A5_pesananTerlambat(),
      this.A3_posisiStok(),
    ]);

    return {
      layanan_terlaris: layananTerlaris,
      produk_terlaris: produkTerlaris,
      pesanan_belum_lunas: pesananBelumLunas,
      pesanan_terlambat: pesananTerlambat,
      stok_menipis: stokMenipis.filter(p => p.keterangan === 'SEGERA ISI ULANG'),
    };
  }
}

module.exports = AnalyticQueryService;

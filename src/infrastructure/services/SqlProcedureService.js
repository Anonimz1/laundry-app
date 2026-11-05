/**
 * SQL Procedure Service
 * Wrapper for calling MySQL stored procedures and functions
 * Aligned with project_database.sql
 */

class SqlProcedureService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // ====================================================================
  // FUNCTIONS (5 functions from project_database.sql)
  // ====================================================================

  /**
   * Function: sisa_tagihan(id_pesanan)
   * Returns remaining payment amount
   */
  async getSisaTagihan(idPesanan) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT sisa_tagihan(${idPesanan}) as sisa
      `;
      return result[0]?.sisa || 0;
    } catch (error) {
      console.error('Error getSisaTagihan:', error);
      throw error;
    }
  }

  /**
   * Function: hitung_total_pesanan(id_pesanan)
   * Calculate order total (layanan + produk + ongkir)
   */
  async hitungTotalPesanan(idPesanan) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT hitung_total_pesanan(${idPesanan}) as total
      `;
      return result[0]?.total || 0;
    } catch (error) {
      console.error('Error hitungTotalPesanan:', error);
      throw error;
    }
  }

  /**
   * Function: omzet_periode(dari, sampai)
   */
  async getOmzetPeriode(dari, sampai) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT omzet_periode(${dari}, ${sampai}) as omzet
      `;
      return result[0]?.omzet || 0;
    } catch (error) {
      console.error('Error getOmzetPeriode:', error);
      throw error;
    }
  }

  /**
   * Function: pengeluaran_periode(dari, sampai)
   */
  async getPengeluaranPeriode(dari, sampai) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT pengeluaran_periode(${dari}, ${sampai}) as pengeluaran
      `;
      return result[0]?.pengeluaran || 0;
    } catch (error) {
      console.error('Error getPengeluaranPeriode:', error);
      throw error;
    }
  }

  /**
   * Function: laba_periode(dari, sampai)
   */
  async getLabaPeriode(dari, sampai) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT laba_periode(${dari}, ${sampai}) as laba
      `;
      return result[0]?.laba || 0;
    } catch (error) {
      console.error('Error getLabaPeriode:', error);
      throw error;
    }
  }

  // ====================================================================
  // PROCEDURES (11 procedures from project_database.sql)
  // ====================================================================

  /**
   * Procedure: buat_pesanan(id_pelanggan, OUT id_pesanan)
   * Create new empty order
   */
  async buatPesanan(idPelanggan) {
    try {
      // Call procedure
      await this.prisma.$executeRawUnsafe(`CALL buat_pesanan(${idPelanggan}, @new_id)`);
      
      // Get OUT parameter
      const result = await this.prisma.$queryRaw`SELECT @new_id as id_pesanan`;
      return result[0]?.id_pesanan;
    } catch (error) {
      console.error('Error buatPesanan:', error);
      throw new Error('Gagal membuat pesanan: ' + error.message);
    }
  }

  /**
   * Procedure: tambah_layanan(id_pesanan, id_layanan, jumlah)
   * Add service to order (price auto-fetched, stock not checked)
   */
  async tambahLayanan(idPesanan, idLayanan, jumlah) {
    try {
      await this.prisma.$executeRaw`
        CALL tambah_layanan(${idPesanan}, ${idLayanan}, ${jumlah})
      `;
      return { success: true };
    } catch (error) {
      console.error('Error tambahLayanan:', error);
      throw new Error(error.message || 'Gagal menambah layanan');
    }
  }

  /**
   * Procedure: tambah_produk(id_pesanan, id_produk, qty)
   * Add product to order (price auto-fetched, stock checked by trigger)
   */
  async tambahProduk(idPesanan, idProduk, qty) {
    try {
      await this.prisma.$executeRaw`
        CALL tambah_produk(${idPesanan}, ${idProduk}, ${qty})
      `;
      return { success: true };
    } catch (error) {
      console.error('Error tambahProduk:', error);
      // Extract MySQL error message
      const msg = error.message || 'Gagal menambah produk';
      throw new Error(msg);
    }
  }

  /**
   * Procedure: tambah_pengiriman(id_pesanan, jenis, alamat, biaya)
   */
  async tambahPengiriman(idPesanan, jenis, alamat, biaya) {
    try {
      await this.prisma.$executeRaw`
        CALL tambah_pengiriman(${idPesanan}, ${jenis}, ${alamat}, ${biaya})
      `;
      return { success: true };
    } catch (error) {
      console.error('Error tambahPengiriman:', error);
      throw new Error(error.message || 'Gagal menambah pengiriman');
    }
  }

  /**
   * Procedure: ubah_status_cucian(id_pesanan, status_baru)
   * Update order status (validated by trigger: only forward, auto-set tgl_selesai)
   */
  async ubahStatusCucian(idPesanan, statusBaru) {
    try {
      await this.prisma.$executeRaw`
        CALL ubah_status_cucian(${idPesanan}, ${statusBaru})
      `;
      return { success: true };
    } catch (error) {
      console.error('Error ubahStatusCucian:', error);
      throw new Error(error.message || 'Gagal mengubah status');
    }
  }

  /**
   * Procedure: catat_pembayaran(id_pesanan, jumlah, metode)
   * Record payment with ACID transaction
   * Returns error if: amount <= 0, amount > sisa, already paid
   */
  async catatPembayaran(idPesanan, jumlah, metode) {
    try {
      await this.prisma.$executeRaw`
        CALL catat_pembayaran(${idPesanan}, ${jumlah}, ${metode})
      `;
      return { 
        success: true, 
        message: 'Pembayaran berhasil dicatat' 
      };
    } catch (error) {
      console.error('Error catatPembayaran:', error);
      // SQL SIGNAL will throw error with custom message
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Procedure: batalkan_pembayaran(id_pembayaran)
   * Cancel payment (set status to 'batal', transaction-safe)
   */
  async batalkanPembayaran(idPembayaran) {
    try {
      await this.prisma.$executeRaw`
        CALL batalkan_pembayaran(${idPembayaran})
      `;
      return { 
        success: true, 
        message: 'Pembayaran berhasil dibatalkan' 
      };
    } catch (error) {
      console.error('Error batalkanPembayaran:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Procedure: catat_pengeluaran(id_kategori, tgl, keterangan, jumlah, metode)
   */
  async catatPengeluaran(idKategori, tanggal, keterangan, jumlah, metode) {
    try {
      await this.prisma.$executeRaw`
        CALL catat_pengeluaran(${idKategori}, ${tanggal}, ${keterangan}, ${jumlah}, ${metode})
      `;
      return { success: true };
    } catch (error) {
      console.error('Error catatPengeluaran:', error);
      throw new Error(error.message || 'Gagal mencatat pengeluaran');
    }
  }

  /**
   * Procedure: laporan_omzet(dari, sampai)
   * Get revenue report for period
   */
  async laporanOmzet(dari, sampai) {
    try {
      const result = await this.prisma.$queryRawUnsafe(`CALL laporan_omzet('${dari}', '${sampai}')`);
      // Result is array of result sets, we want first set, first row
      return result[0] || { jumlah_pesanan: 0, omzet: 0, pengeluaran: 0, laba: 0 };
    } catch (error) {
      console.error('Error laporanOmzet:', error);
      throw error;
    }
  }

  /**
   * Procedure: cari_pelanggan(kata_kunci)
   * Search customers by name or phone (SQL injection safe)
   */
  async cariPelanggan(kataKunci) {
    try {
      const result = await this.prisma.$queryRaw`
        CALL cari_pelanggan(${kataKunci})
      `;
      return result[0] || []; // First result set
    } catch (error) {
      console.error('Error cariPelanggan:', error);
      throw error;
    }
  }

  // ====================================================================
  // VIEWS (8 views - direct queries)
  // ====================================================================

  async getViewNota() {
    return await this.prisma.$queryRaw`SELECT * FROM v_nota`;
  }

  async getViewPesananBelumLunas() {
    return await this.prisma.$queryRaw`SELECT * FROM v_pesanan_belum_lunas`;
  }

  async getViewStokMenipis() {
    return await this.prisma.$queryRaw`SELECT * FROM v_stok_menipis`;
  }

  async getViewOmzetBulanan() {
    return await this.prisma.$queryRaw`SELECT * FROM v_omzet_bulanan ORDER BY bulan DESC`;
  }

  async getViewLabaBulanan() {
    return await this.prisma.$queryRaw`SELECT * FROM v_laba_bulanan ORDER BY bulan DESC`;
  }

  async getViewItemJual() {
    return await this.prisma.$queryRaw`SELECT * FROM v_item_jual`;
  }

  async getViewRincianPesanan(idPesanan = null) {
    if (idPesanan) {
      return await this.prisma.$queryRaw`
        SELECT * FROM v_rincian_pesanan WHERE id_pesanan = ${idPesanan}
      `;
    }
    return await this.prisma.$queryRaw`SELECT * FROM v_rincian_pesanan`;
  }

  async getViewPelangganSamar() {
    return await this.prisma.$queryRaw`SELECT * FROM v_pelanggan_samar`;
  }
}

module.exports = SqlProcedureService;

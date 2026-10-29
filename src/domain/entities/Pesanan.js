/**
 * Domain Entity: Pesanan (Order)
 * Aggregate Root for Order bounded context
 */

class Pesanan {
  constructor({
    id_pesanan,
    id_pelanggan,
    tgl_masuk,
    tgl_selesai,
    status_cucian,
    total,
    pelanggan,
    detail_layanan = [],
    detail_produk = []
  }) {
    this.id_pesanan = id_pesanan;
    this.id_pelanggan = id_pelanggan;
    this.tgl_masuk = tgl_masuk || new Date();
    this.tgl_selesai = tgl_selesai;
    this.status_cucian = status_cucian || 'diterima';
    this.total = total || 0;
    this.pelanggan = pelanggan;
    this.detail_layanan = detail_layanan;
    this.detail_produk = detail_produk;
  }

  // Business logic: Progress order status
  progressStatus() {
    const statusFlow = ['diterima', 'dicuci', 'disetrika', 'siap', 'selesai'];
    const currentIndex = statusFlow.indexOf(this.status_cucian);
    
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) {
      throw new Error('Cannot progress status further');
    }
    
    this.status_cucian = statusFlow[currentIndex + 1];
    
    if (this.status_cucian === 'selesai' && !this.tgl_selesai) {
      this.tgl_selesai = new Date();
    }
  }

  // Business logic: Complete order
  complete() {
    this.status_cucian = 'selesai';
    this.tgl_selesai = new Date();
  }

  // Business logic: Calculate total from details
  calculateTotal() {
    const layananTotal = this.detail_layanan.reduce((sum, detail) => 
      sum + parseFloat(detail.subtotal || 0), 0);
    
    const produkTotal = this.detail_produk.reduce((sum, detail) => 
      sum + parseFloat(detail.subtotal || 0), 0);
    
    this.total = layananTotal + produkTotal;
    return this.total;
  }

  // Business logic: Check if order is completed
  isCompleted() {
    return this.status_cucian === 'selesai';
  }

  // Business logic: Check if order is active
  isActive() {
    return this.status_cucian !== 'selesai';
  }

  // Business logic: Get order duration in days
  getDuration() {
    const endDate = this.tgl_selesai || new Date();
    const startDate = this.tgl_masuk;
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  toJSON() {
    return {
      id_pesanan: this.id_pesanan,
      id_pelanggan: this.id_pelanggan,
      tgl_masuk: this.tgl_masuk,
      tgl_selesai: this.tgl_selesai,
      status_cucian: this.status_cucian,
      total: this.total,
      pelanggan: this.pelanggan,
      detail_layanan: this.detail_layanan,
      detail_produk: this.detail_produk
    };
  }

  static fromPrisma(data) {
    return new Pesanan(data);
  }
}

module.exports = Pesanan;

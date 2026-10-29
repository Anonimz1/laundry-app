/**
 * Domain Entity: Produk
 */

class Produk {
  constructor({ id_produk, id_kategori, nama_produk, harga, stok, kategori }) {
    this.id_produk = id_produk;
    this.id_kategori = id_kategori;
    this.nama_produk = nama_produk;
    this.harga = harga;
    this.stok = stok;
    this.kategori = kategori; // Value object or related entity
  }

  // Business logic: Check if stock is low
  isStockLow(threshold = 5) {
    return this.stok < threshold;
  }

  // Business logic: Reduce stock
  reduceStock(quantity) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (this.stok < quantity) {
      throw new Error(`Insufficient stock. Available: ${this.stok}, Requested: ${quantity}`);
    }
    this.stok -= quantity;
  }

  // Business logic: Add stock
  addStock(quantity) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    this.stok += quantity;
  }

  // Business logic: Update price
  updatePrice(newPrice) {
    if (newPrice <= 0) {
      throw new Error('Price must be greater than 0');
    }
    this.harga = newPrice;
  }

  // Calculate revenue potential
  getRevenuePotential() {
    return this.stok * this.harga;
  }

  toJSON() {
    return {
      id_produk: this.id_produk,
      id_kategori: this.id_kategori,
      nama_produk: this.nama_produk,
      harga: this.harga,
      stok: this.stok,
      kategori: this.kategori
    };
  }

  static fromPrisma(data) {
    return new Produk(data);
  }
}

module.exports = Produk;

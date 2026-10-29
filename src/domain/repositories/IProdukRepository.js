/**
 * Repository Interface: IProdukRepository
 */

class IProdukRepository {
  async findAll() {
    throw new Error('Method not implemented');
  }

  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findByKategori(kategoriId) {
    throw new Error('Method not implemented');
  }

  async findLowStock(threshold = 5) {
    throw new Error('Method not implemented');
  }

  async create(produk) {
    throw new Error('Method not implemented');
  }

  async update(id, produk) {
    throw new Error('Method not implemented');
  }

  async delete(id) {
    throw new Error('Method not implemented');
  }

  async updateStock(id, quantity) {
    throw new Error('Method not implemented');
  }

  async count() {
    throw new Error('Method not implemented');
  }
}

module.exports = IProdukRepository;

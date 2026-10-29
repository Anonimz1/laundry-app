/**
 * Repository Interface: IPesananRepository
 */

class IPesananRepository {
  async findAll() {
    throw new Error('Method not implemented');
  }

  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findByPelanggan(pelangganId) {
    throw new Error('Method not implemented');
  }

  async findActive() {
    throw new Error('Method not implemented');
  }

  async findCompleted() {
    throw new Error('Method not implemented');
  }

  async create(pesanan) {
    throw new Error('Method not implemented');
  }

  async update(id, pesanan) {
    throw new Error('Method not implemented');
  }

  async updateStatus(id, status) {
    throw new Error('Method not implemented');
  }

  async delete(id) {
    throw new Error('Method not implemented');
  }

  async count() {
    throw new Error('Method not implemented');
  }

  async getTotalRevenue() {
    throw new Error('Method not implemented');
  }
}

module.exports = IPesananRepository;

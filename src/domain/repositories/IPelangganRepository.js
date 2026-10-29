/**
 * Repository Interface: IPelangganRepository
 * Contract for data access - implementation will be in infrastructure layer
 */

class IPelangganRepository {
  async findAll() {
    throw new Error('Method not implemented');
  }

  async findById(id) {
    throw new Error('Method not implemented');
  }

  async findByNoHp(no_hp) {
    throw new Error('Method not implemented');
  }

  async create(pelanggan) {
    throw new Error('Method not implemented');
  }

  async update(id, pelanggan) {
    throw new Error('Method not implemented');
  }

  async delete(id) {
    throw new Error('Method not implemented');
  }

  async count() {
    throw new Error('Method not implemented');
  }

  async search(criteria) {
    throw new Error('Method not implemented');
  }
}

module.exports = IPelangganRepository;

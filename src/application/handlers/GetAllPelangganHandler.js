/**
 * Query Handler: GetAllPelangganHandler
 * Handles GetAllPelangganQuery
 * Optimized for read operations
 */

class GetAllPelangganHandler {
  constructor(pelangganRepository) {
    this.pelangganRepository = pelangganRepository;
  }

  async handle(query) {
    // Fetch all pelanggan
    const pelanggan = await this.pelangganRepository.findAll();

    // Get total count for pagination
    const total = await this.pelangganRepository.count();

    // Convert to JSON
    const data = pelanggan.map(p => p.toJSON());

    return {
      success: true,
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit)
      }
    };
  }
}

module.exports = GetAllPelangganHandler;

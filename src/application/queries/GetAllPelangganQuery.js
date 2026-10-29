/**
 * CQRS Query: GetAllPelangganQuery
 * Query for READ operations (optimized for reading data)
 */

class GetAllPelangganQuery {
  constructor({ page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = {}) {
    this.page = parseInt(page);
    this.limit = parseInt(limit);
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
  }

  getSkip() {
    return (this.page - 1) * this.limit;
  }

  getTake() {
    return this.limit;
  }

  getOrderBy() {
    return {
      [this.sortBy]: this.sortOrder
    };
  }
}

module.exports = GetAllPelangganQuery;

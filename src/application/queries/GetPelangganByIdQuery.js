/**
 * CQRS Query: GetPelangganByIdQuery
 */

class GetPelangganByIdQuery {
  constructor({ id_pelanggan }) {
    this.id_pelanggan = parseInt(id_pelanggan);
  }

  validate() {
    if (!this.id_pelanggan || isNaN(this.id_pelanggan)) {
      return {
        isValid: false,
        errors: ['ID Pelanggan tidak valid']
      };
    }

    return {
      isValid: true,
      errors: []
    };
  }
}

module.exports = GetPelangganByIdQuery;

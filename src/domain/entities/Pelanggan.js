/**
 * Domain Entity: Pelanggan
 * Pure business logic, framework-agnostic
 */

class Pelanggan {
  constructor({ id_pelanggan, nama, no_hp, alamat, created_at }) {
    this.id_pelanggan = id_pelanggan;
    this.nama = nama;
    this.no_hp = no_hp;
    this.alamat = alamat;
    this.created_at = created_at || new Date();
  }

  // Business methods
  updateContactInfo(no_hp, alamat) {
    if (!no_hp || no_hp.trim() === '') {
      throw new Error('Nomor HP tidak boleh kosong');
    }
    this.no_hp = no_hp;
    this.alamat = alamat;
  }

  validatePhoneNumber() {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    return phoneRegex.test(this.no_hp);
  }

  toJSON() {
    return {
      id_pelanggan: this.id_pelanggan,
      nama: this.nama,
      no_hp: this.no_hp,
      alamat: this.alamat,
      created_at: this.created_at
    };
  }

  static fromPrisma(data) {
    return new Pelanggan(data);
  }
}

module.exports = Pelanggan;

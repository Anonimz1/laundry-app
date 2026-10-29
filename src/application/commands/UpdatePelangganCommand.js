/**
 * CQRS Command: UpdatePelangganCommand
 */

class UpdatePelangganCommand {
  constructor({ id_pelanggan, nama, no_hp, alamat }) {
    this.id_pelanggan = id_pelanggan;
    this.nama = nama;
    this.no_hp = no_hp;
    this.alamat = alamat;
  }

  validate() {
    const errors = [];

    if (!this.id_pelanggan) {
      errors.push('ID Pelanggan tidak boleh kosong');
    }

    if (!this.nama || this.nama.trim() === '') {
      errors.push('Nama tidak boleh kosong');
    }

    if (!this.no_hp || this.no_hp.trim() === '') {
      errors.push('Nomor HP tidak boleh kosong');
    }

    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/;
    if (this.no_hp && !phoneRegex.test(this.no_hp)) {
      errors.push('Format nomor HP tidak valid');
    }

    if (!this.alamat || this.alamat.trim() === '') {
      errors.push('Alamat tidak boleh kosong');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = UpdatePelangganCommand;

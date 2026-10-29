/**
 * Command Handler: CreatePelangganHandler
 * Handles CreatePelangganCommand
 * Implements business logic for creating pelanggan
 */

const Pelanggan = require('../../domain/entities/Pelanggan');

class CreatePelangganHandler {
  constructor(pelangganRepository) {
    this.pelangganRepository = pelangganRepository;
  }

  async handle(command) {
    // Validate command
    const validation = command.validate();
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check if phone number already exists
    const existing = await this.pelangganRepository.findByNoHp(command.no_hp);
    if (existing) {
      throw new Error('Nomor HP sudah terdaftar');
    }

    // Create domain entity
    const pelanggan = new Pelanggan({
      nama: command.nama,
      no_hp: command.no_hp,
      alamat: command.alamat
    });

    // Validate business rules
    if (!pelanggan.validatePhoneNumber()) {
      throw new Error('Nomor HP tidak valid');
    }

    // Persist to database
    const createdPelanggan = await this.pelangganRepository.create(pelanggan);

    return {
      success: true,
      data: createdPelanggan.toJSON(),
      message: 'Pelanggan berhasil ditambahkan'
    };
  }
}

module.exports = CreatePelangganHandler;

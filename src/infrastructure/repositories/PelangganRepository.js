/**
 * Repository Implementation: PelangganRepository
 * Implements IPelangganRepository interface using Prisma ORM
 */

const IPelangganRepository = require('../../domain/repositories/IPelangganRepository');
const Pelanggan = require('../../domain/entities/Pelanggan');
const prisma = require('../database/prisma.client');

class PelangganRepository extends IPelangganRepository {
  async findAll() {
    const data = await prisma.pelanggan.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });
    return data.map(item => Pelanggan.fromPrisma(item));
  }

  async findById(id) {
    const data = await prisma.pelanggan.findUnique({
      where: { id_pelanggan: parseInt(id) }
    });
    return data ? Pelanggan.fromPrisma(data) : null;
  }

  async findByNoHp(no_hp) {
    const data = await prisma.pelanggan.findUnique({
      where: { no_hp }
    });
    return data ? Pelanggan.fromPrisma(data) : null;
  }

  async create(pelangganData) {
    const data = await prisma.pelanggan.create({
      data: {
        nama: pelangganData.nama,
        no_hp: pelangganData.no_hp,
        alamat: pelangganData.alamat
      }
    });
    return Pelanggan.fromPrisma(data);
  }

  async update(id, pelangganData) {
    const data = await prisma.pelanggan.update({
      where: { id_pelanggan: parseInt(id) },
      data: {
        nama: pelangganData.nama,
        no_hp: pelangganData.no_hp,
        alamat: pelangganData.alamat
      }
    });
    return Pelanggan.fromPrisma(data);
  }

  async delete(id) {
    await prisma.pelanggan.delete({
      where: { id_pelanggan: parseInt(id) }
    });
    return true;
  }

  async count() {
    return await prisma.pelanggan.count();
  }

  async search(criteria) {
    const { nama, no_hp } = criteria;
    const where = {};

    if (nama) {
      where.nama = { contains: nama };
    }
    if (no_hp) {
      where.no_hp = { contains: no_hp };
    }

    const data = await prisma.pelanggan.findMany({
      where,
      orderBy: { nama: 'asc' }
    });

    return data.map(item => Pelanggan.fromPrisma(item));
  }
}

module.exports = PelangganRepository;

/**
 * Repository Implementation: ProdukRepository
 */

const IProdukRepository = require('../../domain/repositories/IProdukRepository');
const Produk = require('../../domain/entities/Produk');
const prisma = require('../database/prisma.client');

class ProdukRepository extends IProdukRepository {
  async findAll() {
    const data = await prisma.produk.findMany({
      include: {
        kategori: true
      },
      orderBy: {
        nama_produk: 'asc'
      }
    });
    return data.map(item => Produk.fromPrisma(item));
  }

  async findById(id) {
    const data = await prisma.produk.findUnique({
      where: { id_produk: parseInt(id) },
      include: {
        kategori: true
      }
    });
    return data ? Produk.fromPrisma(data) : null;
  }

  async findByKategori(kategoriId) {
    const data = await prisma.produk.findMany({
      where: { id_kategori: parseInt(kategoriId) },
      include: {
        kategori: true
      }
    });
    return data.map(item => Produk.fromPrisma(item));
  }

  async findLowStock(threshold = 5) {
    const data = await prisma.produk.findMany({
      where: {
        stok: {
          lt: threshold
        }
      },
      include: {
        kategori: true
      },
      orderBy: {
        stok: 'asc'
      }
    });
    return data.map(item => Produk.fromPrisma(item));
  }

  async create(produkData) {
    const data = await prisma.produk.create({
      data: {
        id_kategori: parseInt(produkData.id_kategori),
        nama_produk: produkData.nama_produk,
        harga: parseFloat(produkData.harga),
        stok: parseInt(produkData.stok)
      },
      include: {
        kategori: true
      }
    });
    return Produk.fromPrisma(data);
  }

  async update(id, produkData) {
    const data = await prisma.produk.update({
      where: { id_produk: parseInt(id) },
      data: {
        id_kategori: parseInt(produkData.id_kategori),
        nama_produk: produkData.nama_produk,
        harga: parseFloat(produkData.harga),
        stok: parseInt(produkData.stok)
      },
      include: {
        kategori: true
      }
    });
    return Produk.fromPrisma(data);
  }

  async delete(id) {
    await prisma.produk.delete({
      where: { id_produk: parseInt(id) }
    });
    return true;
  }

  async updateStock(id, quantity) {
    const data = await prisma.produk.update({
      where: { id_produk: parseInt(id) },
      data: {
        stok: {
          increment: quantity // Positive to add, negative to reduce
        }
      },
      include: {
        kategori: true
      }
    });
    return Produk.fromPrisma(data);
  }

  async count() {
    return await prisma.produk.count();
  }

  async countLowStock(threshold = 5) {
    return await prisma.produk.count({
      where: {
        stok: {
          lt: threshold
        }
      }
    });
  }
}

module.exports = ProdukRepository;

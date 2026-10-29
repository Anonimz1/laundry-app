/**
 * Repository Implementation: PesananRepository
 */

const IPesananRepository = require('../../domain/repositories/IPesananRepository');
const Pesanan = require('../../domain/entities/Pesanan');
const prisma = require('../database/prisma.client');

class PesananRepository extends IPesananRepository {
  async findAll() {
    const data = await prisma.pesanan.findMany({
      include: {
        pelanggan: true,
        detail_layanan: {
          include: {
            layanan: true
          }
        },
        detail_produk: {
          include: {
            produk: true
          }
        }
      },
      orderBy: {
        tgl_masuk: 'desc'
      }
    });
    return data.map(item => Pesanan.fromPrisma(item));
  }

  async findById(id) {
    const data = await prisma.pesanan.findUnique({
      where: { id_pesanan: parseInt(id) },
      include: {
        pelanggan: true,
        detail_layanan: {
          include: {
            layanan: true
          }
        },
        detail_produk: {
          include: {
            produk: true
          }
        },
        pembayaran: true,
        pengiriman: true
      }
    });
    return data ? Pesanan.fromPrisma(data) : null;
  }

  async findByPelanggan(pelangganId) {
    const data = await prisma.pesanan.findMany({
      where: { id_pelanggan: parseInt(pelangganId) },
      include: {
        pelanggan: true
      },
      orderBy: {
        tgl_masuk: 'desc'
      }
    });
    return data.map(item => Pesanan.fromPrisma(item));
  }

  async findActive() {
    const data = await prisma.pesanan.findMany({
      where: {
        status_cucian: {
          not: 'selesai'
        }
      },
      include: {
        pelanggan: true
      },
      orderBy: {
        tgl_masuk: 'desc'
      }
    });
    return data.map(item => Pesanan.fromPrisma(item));
  }

  async findCompleted() {
    const data = await prisma.pesanan.findMany({
      where: {
        status_cucian: 'selesai'
      },
      include: {
        pelanggan: true
      },
      orderBy: {
        tgl_selesai: 'desc'
      }
    });
    return data.map(item => Pesanan.fromPrisma(item));
  }

  async create(pesananData) {
    const data = await prisma.pesanan.create({
      data: {
        id_pelanggan: parseInt(pesananData.id_pelanggan),
        status_cucian: pesananData.status_cucian || 'diterima',
        total: parseFloat(pesananData.total || 0)
      },
      include: {
        pelanggan: true
      }
    });
    return Pesanan.fromPrisma(data);
  }

  async update(id, pesananData) {
    const data = await prisma.pesanan.update({
      where: { id_pesanan: parseInt(id) },
      data: {
        status_cucian: pesananData.status_cucian,
        total: parseFloat(pesananData.total),
        tgl_selesai: pesananData.tgl_selesai
      },
      include: {
        pelanggan: true
      }
    });
    return Pesanan.fromPrisma(data);
  }

  async updateStatus(id, status) {
    const updateData = { status_cucian: status };
    
    // Auto-set completion date when status is 'selesai'
    if (status === 'selesai') {
      updateData.tgl_selesai = new Date();
    }

    const data = await prisma.pesanan.update({
      where: { id_pesanan: parseInt(id) },
      data: updateData,
      include: {
        pelanggan: true
      }
    });
    return Pesanan.fromPrisma(data);
  }

  async delete(id) {
    await prisma.pesanan.delete({
      where: { id_pesanan: parseInt(id) }
    });
    return true;
  }

  async count() {
    return await prisma.pesanan.count();
  }

  async countActive() {
    return await prisma.pesanan.count({
      where: {
        status_cucian: {
          not: 'selesai'
        }
      }
    });
  }

  async countCompleted() {
    return await prisma.pesanan.count({
      where: {
        status_cucian: 'selesai'
      }
    });
  }

  async getTotalRevenue() {
    const result = await prisma.pesanan.aggregate({
      _sum: {
        total: true
      }
    });
    return result._sum.total || 0;
  }

  async getRevenueByDateRange(startDate, endDate) {
    const result = await prisma.pesanan.aggregate({
      where: {
        tgl_masuk: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        total: true
      }
    });
    return result._sum.total || 0;
  }
}

module.exports = PesananRepository;

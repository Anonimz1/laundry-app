const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');

router.get('/', async (req, res) => {
  try {
    // Ambil statistik dengan Prisma
    const [
      totalPelanggan,
      totalPesanan,
      pesananAktif,
      pesananSelesai,
      produkStokRendah,
      recentPesanan,
      totalOmzet
    ] = await Promise.all([
      // Total pelanggan
      prisma.pelanggan.count(),
      
      // Total pesanan
      prisma.pesanan.count(),
      
      // Pesanan aktif (belum selesai)
      prisma.pesanan.count({
        where: {
          status_cucian: {
            not: 'selesai'
          }
        }
      }),
      
      // Pesanan selesai
      prisma.pesanan.count({
        where: {
          status_cucian: 'selesai'
        }
      }),
      
      // Produk dengan stok < 5
      prisma.produk.count({
        where: {
          stok: {
            lt: 5
          }
        }
      }),
      
      // 5 Pesanan terbaru
      prisma.pesanan.findMany({
        take: 5,
        orderBy: {
          tgl_masuk: 'desc'
        },
        include: {
          pelanggan: true
        }
      }),
      
      // Total omzet (sum of total)
      prisma.pesanan.aggregate({
        _sum: {
          total: true
        }
      })
    ]);

    // Ambil produk stok rendah untuk alert
    const produkRendah = await prisma.produk.findMany({
      where: {
        stok: {
          lt: 5
        }
      },
      include: {
        kategori: true
      },
      take: 5
    });

    res.render('dashboard', {
      stats: {
        totalPelanggan,
        totalPesanan,
        pesananAktif,
        pesananSelesai,
        produkStokRendah,
        totalOmzet: totalOmzet._sum.total || 0
      },
      recentPesanan,
      produkRendah
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send('Error loading dashboard');
  }
});

module.exports = router;

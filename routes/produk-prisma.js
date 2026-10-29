const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');

// GET /produk - Daftar produk
router.get('/', async (req, res) => {
  try {
    const produk = await prisma.produk.findMany({
      include: {
        kategori: true
      },
      orderBy: {
        id_produk: 'asc'
      }
    });
    res.render('produk/index', { produk });
  } catch (error) {
    console.error('Error fetching produk:', error);
    res.status(500).send('Error fetching data');
  }
});

// GET /produk/tambah - Form tambah produk
router.get('/tambah', async (req, res) => {
  try {
    const kategori = await prisma.kategori.findMany({
      where: {
        jenis: 'PRODUK'
      }
    });
    res.render('produk/form', { produk: null, kategori, action: 'tambah' });
  } catch (error) {
    console.error('Error fetching kategori:', error);
    res.status(500).send('Error fetching data');
  }
});

// POST /produk - Tambah produk baru
router.post('/', async (req, res) => {
  try {
    const { id_kategori, nama_produk, harga, stok } = req.body;
    
    await prisma.produk.create({
      data: {
        id_kategori: parseInt(id_kategori),
        nama_produk,
        harga: parseFloat(harga),
        stok: parseInt(stok)
      }
    });
    
    res.redirect('/produk');
  } catch (error) {
    console.error('Error creating produk:', error);
    res.status(500).send('Error creating produk');
  }
});

// GET /produk/:id/edit - Form edit produk
router.get('/:id/edit', async (req, res) => {
  try {
    const [produk, kategori] = await Promise.all([
      prisma.produk.findUnique({
        where: {
          id_produk: parseInt(req.params.id)
        },
        include: {
          kategori: true
        }
      }),
      prisma.kategori.findMany({
        where: {
          jenis: 'PRODUK'
        }
      })
    ]);
    
    if (!produk) {
      return res.status(404).send('Produk not found');
    }
    
    res.render('produk/form', { produk, kategori, action: 'edit' });
  } catch (error) {
    console.error('Error fetching produk:', error);
    res.status(500).send('Error fetching data');
  }
});

// POST /produk/:id - Update produk
router.post('/:id', async (req, res) => {
  try {
    const { id_kategori, nama_produk, harga, stok } = req.body;
    
    await prisma.produk.update({
      where: {
        id_produk: parseInt(req.params.id)
      },
      data: {
        id_kategori: parseInt(id_kategori),
        nama_produk,
        harga: parseFloat(harga),
        stok: parseInt(stok)
      }
    });
    
    res.redirect('/produk');
  } catch (error) {
    console.error('Error updating produk:', error);
    res.status(500).send('Error updating produk');
  }
});

// POST /produk/:id/delete - Hapus produk
router.post('/:id/delete', async (req, res) => {
  try {
    await prisma.produk.delete({
      where: {
        id_produk: parseInt(req.params.id)
      }
    });
    
    res.redirect('/produk');
  } catch (error) {
    console.error('Error deleting produk:', error);
    res.status(500).send('Error deleting produk');
  }
});

// GET /produk/stok-menipis - Produk dengan stok < 5
router.get('/stok-menipis', async (req, res) => {
  try {
    const produk = await prisma.produk.findMany({
      where: {
        stok: {
          lt: 5
        }
      },
      include: {
        kategori: true
      }
    });
    res.json(produk);
  } catch (error) {
    console.error('Error fetching low stock produk:', error);
    res.status(500).send('Error fetching data');
  }
});

module.exports = router;

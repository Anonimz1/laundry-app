const express = require('express');
const router = express.Router();
const prisma = require('../prisma/client');

// GET /pelanggan - Daftar pelanggan
router.get('/', async (req, res) => {
  try {
    const pelanggan = await prisma.pelanggan.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });
    res.render('pelanggan/index', { pelanggan });
  } catch (error) {
    console.error('Error fetching pelanggan:', error);
    res.status(500).send('Error fetching data');
  }
});

// GET /pelanggan/tambah - Form tambah pelanggan
router.get('/tambah', (req, res) => {
  res.render('pelanggan/form', { pelanggan: null, action: 'tambah' });
});

// POST /pelanggan - Tambah pelanggan baru
router.post('/', async (req, res) => {
  try {
    const { nama, no_hp, alamat } = req.body;
    
    await prisma.pelanggan.create({
      data: {
        nama,
        no_hp,
        alamat
      }
    });
    
    res.redirect('/pelanggan');
  } catch (error) {
    console.error('Error creating pelanggan:', error);
    res.status(500).send('Error creating pelanggan');
  }
});

// GET /pelanggan/:id/edit - Form edit pelanggan
router.get('/:id/edit', async (req, res) => {
  try {
    const pelanggan = await prisma.pelanggan.findUnique({
      where: {
        id_pelanggan: parseInt(req.params.id)
      }
    });
    
    if (!pelanggan) {
      return res.status(404).send('Pelanggan not found');
    }
    
    res.render('pelanggan/form', { pelanggan, action: 'edit' });
  } catch (error) {
    console.error('Error fetching pelanggan:', error);
    res.status(500).send('Error fetching data');
  }
});

// POST /pelanggan/:id - Update pelanggan
router.post('/:id', async (req, res) => {
  try {
    const { nama, no_hp, alamat } = req.body;
    
    await prisma.pelanggan.update({
      where: {
        id_pelanggan: parseInt(req.params.id)
      },
      data: {
        nama,
        no_hp,
        alamat
      }
    });
    
    res.redirect('/pelanggan');
  } catch (error) {
    console.error('Error updating pelanggan:', error);
    res.status(500).send('Error updating pelanggan');
  }
});

// POST /pelanggan/:id/delete - Hapus pelanggan
router.post('/:id/delete', async (req, res) => {
  try {
    await prisma.pelanggan.delete({
      where: {
        id_pelanggan: parseInt(req.params.id)
      }
    });
    
    res.redirect('/pelanggan');
  } catch (error) {
    console.error('Error deleting pelanggan:', error);
    res.status(500).send('Error deleting pelanggan');
  }
});

module.exports = router;

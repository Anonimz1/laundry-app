// Simple Prisma Test
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrisma() {
  console.log('🧪 Testing Prisma Client...\n');
  
  try {
    // Test 1: Count pelanggan
    const countPelanggan = await prisma.pelanggan.count();
    console.log(`✅ Total Pelanggan: ${countPelanggan}`);
    
    // Test 2: Get all pelanggan
    const pelanggan = await prisma.pelanggan.findMany({
      take: 3 // ambil 3 saja
    });
    console.log('\n📋 Sample Pelanggan:');
    pelanggan.forEach(p => {
      console.log(`   ${p.id_pelanggan}. ${p.nama} - ${p.no_hp}`);
    });
    
    // Test 3: Count produk stok rendah
    const lowStock = await prisma.produk.findMany({
      where: {
        stok: { lt: 5 }
      }
    });
    console.log(`\n⚠️  Produk Stok Rendah: ${lowStock.length}`);
    lowStock.forEach(p => {
      console.log(`   ${p.nama_produk}: ${p.stok} unit`);
    });
    
    // Test 4: Get pesanan with customer
    const pesanan = await prisma.pesanan.findFirst({
      include: {
        pelanggan: true
      }
    });
    console.log(`\n📦 Sample Pesanan:`);
    console.log(`   Order #${pesanan.id_pesanan} - ${pesanan.pelanggan.nama}`);
    console.log(`   Total: Rp ${pesanan.total.toLocaleString('id-ID')}`);
    console.log(`   Status: ${pesanan.status_cucian}`);
    
    console.log('\n✅ Prisma Test BERHASIL!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testPrisma();

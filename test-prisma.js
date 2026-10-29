const prisma = require('./prisma/client');

async function testPrismaConnection() {
  console.log('🔄 Testing Prisma connection...\n');

  try {
    // Test 1: Count pelanggan
    console.log('1️⃣ Testing pelanggan count...');
    const pelangganCount = await prisma.pelanggan.count();
    console.log(`   ✅ Total pelanggan: ${pelangganCount}\n`);

    // Test 2: Get all pelanggan
    console.log('2️⃣ Testing fetch all pelanggan...');
    const pelanggan = await prisma.pelanggan.findMany({
      take: 3
    });
    console.log(`   ✅ Found ${pelanggan.length} pelanggan:`);
    pelanggan.forEach(p => {
      console.log(`      - ${p.nama} (${p.no_hp})`);
    });
    console.log('');

    // Test 3: Count produk
    console.log('3️⃣ Testing produk with kategori...');
    const produk = await prisma.produk.findMany({
      take: 3,
      include: {
        kategori: true
      }
    });
    console.log(`   ✅ Found ${produk.length} produk:`);
    produk.forEach(p => {
      console.log(`      - ${p.nama_produk} (${p.kategori.nama_kategori}) - Stok: ${p.stok}`);
    });
    console.log('');

    // Test 4: Count pesanan
    console.log('4️⃣ Testing pesanan statistics...');
    const [totalPesanan, pesananAktif] = await Promise.all([
      prisma.pesanan.count(),
      prisma.pesanan.count({
        where: {
          status_cucian: {
            not: 'selesai'
          }
        }
      })
    ]);
    console.log(`   ✅ Total pesanan: ${totalPesanan}`);
    console.log(`   ✅ Pesanan aktif: ${pesananAktif}\n`);

    // Test 5: Aggregate total omzet
    console.log('5️⃣ Testing aggregate total omzet...');
    const omzet = await prisma.pesanan.aggregate({
      _sum: {
        total: true
      }
    });
    console.log(`   ✅ Total omzet: Rp ${omzet._sum.total?.toLocaleString('id-ID') || 0}\n`);

    // Test 6: Produk stok rendah
    console.log('6️⃣ Testing produk with low stock...');
    const produkRendah = await prisma.produk.findMany({
      where: {
        stok: {
          lt: 5
        }
      },
      include: {
        kategori: true
      }
    });
    console.log(`   ✅ Found ${produkRendah.length} produk dengan stok < 5:`);
    produkRendah.forEach(p => {
      console.log(`      - ${p.nama_produk}: ${p.stok} unit`);
    });
    console.log('');

    console.log('✨ All tests passed! Prisma is working correctly.\n');
  } catch (error) {
    console.error('❌ Error testing Prisma:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. MySQL server is running');
    console.error('   2. Database "laundry_db" exists');
    console.error('   3. .env file has correct DATABASE_URL');
    console.error('   4. You have run: npm install prisma @prisma/client');
    console.error('   5. You have run: npx prisma generate\n');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPrismaConnection();

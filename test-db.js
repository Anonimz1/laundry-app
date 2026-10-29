/**
 * Database Connection & Structure Test
 * Run: node test-db.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testDatabase() {
  console.log('🧪 Testing Database Connection & Structure...\n');
  
  let connection;
  try {
    // 1. Test Connection
    console.log('1️⃣  Testing connection...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    console.log('   ✅ Connected to database\n');

    // 2. Test Tables
    console.log('2️⃣  Checking tables...');
    const [tables] = await connection.query('SHOW TABLES');
    const expectedTables = [
      'kategori', 'pelanggan', 'layanan', 'produk', 'pesanan',
      'detail_layanan', 'detail_produk', 'pembayaran', 'pengiriman'
    ];
    
    const tableNames = tables.map(t => Object.values(t)[0]);
    expectedTables.forEach(table => {
      if (tableNames.includes(table)) {
        console.log(`   ✅ Table '${table}' exists`);
      } else {
        console.log(`   ❌ Table '${table}' MISSING!`);
      }
    });
    console.log();

    // 3. Test Functions
    console.log('3️⃣  Checking functions...');
    const [functions] = await connection.query(`
      SHOW FUNCTION STATUS WHERE Db = ?
    `, [process.env.DB_NAME]);
    
    const expectedFunctions = ['sisa_tagihan', 'hitung_total_pesanan'];
    const functionNames = functions.map(f => f.Name);
    
    expectedFunctions.forEach(func => {
      if (functionNames.includes(func)) {
        console.log(`   ✅ Function '${func}' exists`);
      } else {
        console.log(`   ❌ Function '${func}' MISSING!`);
      }
    });
    console.log();

    // 4. Test Procedures
    console.log('4️⃣  Checking stored procedures...');
    const [procedures] = await connection.query(`
      SHOW PROCEDURE STATUS WHERE Db = ?
    `, [process.env.DB_NAME]);
    
    const expectedProcedures = [
      'buat_pesanan', 'tambah_layanan', 'tambah_produk',
      'catat_pembayaran', 'refresh_total', 'laporan_omzet'
    ];
    const procedureNames = procedures.map(p => p.Name);
    
    expectedProcedures.forEach(proc => {
      if (procedureNames.includes(proc)) {
        console.log(`   ✅ Procedure '${proc}' exists`);
      } else {
        console.log(`   ❌ Procedure '${proc}' MISSING!`);
      }
    });
    console.log();

    // 5. Test Triggers
    console.log('5️⃣  Checking triggers...');
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = ?
    `, [process.env.DB_NAME]);
    
    console.log(`   ✅ Found ${triggers.length} triggers`);
    triggers.forEach(t => {
      console.log(`      - ${t.TRIGGER_NAME}`);
    });
    console.log();

    // 6. Test Views
    console.log('6️⃣  Checking views...');
    const [views] = await connection.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = ?
    `, [process.env.DB_NAME]);
    
    const expectedViews = ['v_pesanan_belum_lunas', 'v_stok_menipis', 'v_omzet_bulanan'];
    const viewNames = views.map(v => v.TABLE_NAME);
    
    expectedViews.forEach(view => {
      if (viewNames.includes(view)) {
        console.log(`   ✅ View '${view}' exists`);
      } else {
        console.log(`   ❌ View '${view}' MISSING!`);
      }
    });
    console.log();

    // 7. Test Data
    console.log('7️⃣  Checking sample data...');
    const tables_to_check = [
      'kategori', 'pelanggan', 'layanan', 'produk', 'pesanan'
    ];
    
    for (const table of tables_to_check) {
      const [[{ count }]] = await connection.query(
        `SELECT COUNT(*) as count FROM ${table}`
      );
      if (count > 0) {
        console.log(`   ✅ Table '${table}' has ${count} rows`);
      } else {
        console.log(`   ⚠️  Table '${table}' is EMPTY (need sample data)`);
      }
    }
    console.log();

    // 8. Test Query Performance
    console.log('8️⃣  Testing query performance...');
    const start = Date.now();
    await connection.query(`
      SELECT p.*, pl.nama, pl.no_hp
      FROM pesanan p
      JOIN pelanggan pl ON pl.id_pelanggan = p.id_pelanggan
      LIMIT 10
    `);
    const elapsed = Date.now() - start;
    console.log(`   ✅ Sample query executed in ${elapsed}ms`);
    console.log();

    // Summary
    console.log('=' .repeat(50));
    console.log('✅ DATABASE TEST COMPLETE!');
    console.log('=' .repeat(50));
    console.log('\nNext steps:');
    console.log('1. Run: npm start');
    console.log('2. Open: http://localhost:3000');
    console.log('3. Test each page manually\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nPossible issues:');
    console.error('1. MySQL not running');
    console.error('2. Wrong credentials in .env');
    console.error('3. Database not imported yet');
    console.error('\nFix:');
    console.error('- Check MySQL service is running');
    console.error('- Verify .env file credentials');
    console.error('- Import: mysql -u root -p < "project_database (1).sql"\n');
  } finally {
    if (connection) await connection.end();
  }
}

// Run test
testDatabase();

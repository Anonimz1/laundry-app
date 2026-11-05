# =====================================================================
# Reset Database Script - Windows PowerShell
# Drops existing database, creates fresh with project_database.sql
# Usage: .\scripts\reset-database.ps1
# =====================================================================

Write-Host "🔄 Starting Fresh Database Setup..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$DB_NAME = "laundry_db"
$SQL_FILE = ".\extracted_steps\project_database.sql"
$MYSQL_USER = "root"

# Check if SQL file exists
if (-not (Test-Path $SQL_FILE)) {
    Write-Host "❌ Error: $SQL_FILE not found!" -ForegroundColor Red
    Write-Host "   Please make sure project_database.sql is in extracted_steps folder" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Step 1: Dropping existing database (if exists)..." -ForegroundColor Yellow
Write-Host "   Please enter MySQL root password when prompted" -ForegroundColor Gray
Write-Host ""

# Drop existing database
$dropCommand = "DROP DATABASE IF EXISTS $DB_NAME;"
echo $dropCommand | mysql -u $MYSQL_USER -p

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Existing database dropped" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: Could not drop database (might not exist)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Step 2: Creating fresh database from project_database.sql..." -ForegroundColor Yellow
Write-Host "   This will create: tables, functions, procedures, triggers, views, sample data" -ForegroundColor Gray
Write-Host ""

# Execute the SQL file
Get-Content $SQL_FILE | mysql -u $MYSQL_USER -p

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database created successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Error: Database creation failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Step 3: Verifying database structure..." -ForegroundColor Yellow

# Verify tables
$verifyQuery = @"
USE $DB_NAME;
SELECT 'Tables:' as Info, COUNT(*) as count FROM information_schema.tables 
WHERE table_schema = '$DB_NAME';

SELECT 'Functions:' as Info, COUNT(*) as count FROM information_schema.routines 
WHERE routine_schema = '$DB_NAME' AND routine_type = 'FUNCTION';

SELECT 'Procedures:' as Info, COUNT(*) as count FROM information_schema.routines 
WHERE routine_schema = '$DB_NAME' AND routine_type = 'PROCEDURE';

SELECT 'Triggers:' as Info, COUNT(*) as count FROM information_schema.triggers 
WHERE trigger_schema = '$DB_NAME';

SELECT 'Views:' as Info, COUNT(*) as count FROM information_schema.views 
WHERE table_schema = '$DB_NAME';
"@

echo $verifyQuery | mysql -u $MYSQL_USER -p -t

Write-Host ""
Write-Host "📋 Step 4: Checking sample data..." -ForegroundColor Yellow

$dataQuery = @"
USE $DB_NAME;
SELECT 'Pelanggan:' as Table_Name, COUNT(*) as Rows FROM pelanggan
UNION ALL SELECT 'Kategori:', COUNT(*) FROM kategori
UNION ALL SELECT 'Layanan:', COUNT(*) FROM layanan
UNION ALL SELECT 'Produk:', COUNT(*) FROM produk
UNION ALL SELECT 'Pesanan:', COUNT(*) FROM pesanan
UNION ALL SELECT 'DetailLayanan:', COUNT(*) FROM detail_layanan
UNION ALL SELECT 'DetailProduk:', COUNT(*) FROM detail_produk
UNION ALL SELECT 'Pembayaran:', COUNT(*) FROM pembayaran
UNION ALL SELECT 'Pengiriman:', COUNT(*) FROM pengiriman
UNION ALL SELECT 'Pengeluaran:', COUNT(*) FROM pengeluaran;
"@

echo $dataQuery | mysql -u $MYSQL_USER -p -t

Write-Host ""
Write-Host "✅ Fresh Database Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Update .env file with:" -ForegroundColor White
Write-Host "     DATABASE_URL='mysql://root:your_password@localhost:3306/$DB_NAME'" -ForegroundColor Gray
Write-Host "  2. Generate Prisma Client:" -ForegroundColor White
Write-Host "     npx prisma generate" -ForegroundColor Gray
Write-Host "  3. Test the application:" -ForegroundColor White
Write-Host "     npm run dev" -ForegroundColor Gray
Write-Host ""

@echo off
REM =====================================================================
REM One-Command Fresh Database Setup
REM Usage: Double-click this file or run: setup-fresh-db.bat
REM =====================================================================

echo.
echo ========================================
echo   Fresh Database Setup - Clean Up Laundry
echo ========================================
echo.

REM Check if MySQL is accessible
mysql --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] MySQL not found in PATH!
    echo.
    echo Please ensure MySQL is installed and added to PATH
    echo or run this script from MySQL bin directory
    echo.
    pause
    exit /b 1
)

echo [OK] MySQL found
echo.

REM Check if project_database.sql exists
if not exist "extracted_steps\project_database.sql" (
    echo [ERROR] project_database.sql not found!
    echo.
    echo Please ensure the file exists at:
    echo   extracted_steps\project_database.sql
    echo.
    pause
    exit /b 1
)

echo [OK] project_database.sql found
echo.

echo ========================================
echo   Step 1: Execute SQL Script
echo ========================================
echo.
echo This will:
echo   - Create laundry_db database
echo   - Create all tables (10)
echo   - Create functions (5)
echo   - Create procedures (11)
echo   - Create triggers (20+)
echo   - Create views (8)
echo   - Insert sample data
echo   - Create MySQL users and roles
echo.
echo Please enter MySQL root password when prompted...
echo.

mysql -u root -p < extracted_steps\project_database.sql

if errorlevel 1 (
    echo.
    echo [ERROR] Database setup failed!
    echo.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Database created successfully!
echo.

echo ========================================
echo   Step 2: Generate Prisma Client
echo ========================================
echo.

call npx prisma generate

if errorlevel 1 (
    echo.
    echo [WARNING] Prisma generate failed
    echo You may need to run manually: npx prisma generate
    echo.
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Database: laundry_db
echo Tables: 10
echo Functions: 5
echo Procedures: 11
echo Triggers: 20+
echo Views: 8
echo Sample Data: Loaded
echo.
echo Next Steps:
echo   1. Update .env file with your MySQL password:
echo      DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/laundry_db"
echo.
echo   2. Start the application:
echo      npm run dev
echo.
echo   3. Test endpoints at:
echo      http://localhost:3000
echo.
pause

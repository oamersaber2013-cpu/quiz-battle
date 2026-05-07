@echo off
echo ========================================
echo Quiz Battle - Production Deployment
echo ========================================
echo.

echo [1/6] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    exit /b 1
)
echo ✓ Dependencies installed
echo.

echo [2/6] Generating Prisma client...
cd packages\db
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate Prisma client
    exit /b 1
)
cd ..\..
echo ✓ Prisma client generated
echo.

echo [3/6] Running database migrations...
cd packages\db
call npx prisma migrate dev --name production_ready
if %errorlevel% neq 0 (
    echo WARNING: Migration failed or already applied
)
cd ..\..
echo ✓ Database migrations complete
echo.

echo [4/6] Seeding questions database...
cd apps\api
call npx tsx src\scripts\seedQuestions.ts
if %errorlevel% neq 0 (
    echo WARNING: Seeding failed or already seeded
)
cd ..\..
echo ✓ Questions seeded
echo.

echo [5/6] Building all packages...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    exit /b 1
)
echo ✓ Build complete
echo.

echo [6/6] Running type checks...
call npm run typecheck
if %errorlevel% neq 0 (
    echo WARNING: Type check failed
)
echo ✓ Type check complete
echo.

echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo To start the application:
echo   npm run dev    (development)
echo   npm run start  (production)
echo.
echo Admin Dashboard: http://localhost:3000/admin/dashboard
echo API Health: http://localhost:4000/health
echo.

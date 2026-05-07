@echo off
echo ========================================
echo Quiz Battle - Test Suite
echo ========================================
echo.

echo [1/5] Type Checking...
call npm run typecheck
if %errorlevel% neq 0 (
    echo ✗ Type check failed
    set TEST_FAILED=1
) else (
    echo ✓ Type check passed
)
echo.

echo [2/5] Unit Tests - Authentication...
cd apps\api
call npm test -- auth.test.ts
if %errorlevel% neq 0 (
    echo ✗ Auth tests failed
    set TEST_FAILED=1
) else (
    echo ✓ Auth tests passed
)
cd ..\..
echo.

echo [3/5] API Health Check...
echo Starting API server...
start /B cmd /c "cd apps\api && npm run dev > nul 2>&1"
timeout /t 5 /nobreak > nul
curl -s http://localhost:4000/health > nul
if %errorlevel% neq 0 (
    echo ✗ API health check failed
    set TEST_FAILED=1
) else (
    echo ✓ API is healthy
)
echo.

echo [4/5] Frontend Build Test...
cd apps\web
call npm run build
if %errorlevel% neq 0 (
    echo ✗ Frontend build failed
    set TEST_FAILED=1
) else (
    echo ✓ Frontend build passed
)
cd ..\..
echo.

echo [5/5] E2E Tests (Optional - requires Playwright)...
cd apps\web
where playwright > nul 2>&1
if %errorlevel% equ 0 (
    call npx playwright test --reporter=list
    if %errorlevel% neq 0 (
        echo ✗ E2E tests failed
        set TEST_FAILED=1
    ) else (
        echo ✓ E2E tests passed
    )
) else (
    echo ⊘ Playwright not installed, skipping E2E tests
    echo   Install with: npx playwright install
)
cd ..\..
echo.

echo ========================================
if defined TEST_FAILED (
    echo Test Suite: FAILED
    echo ========================================
    exit /b 1
) else (
    echo Test Suite: PASSED
    echo ========================================
    exit /b 0
)

@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Automatic Ngrok URL Configuration
echo ========================================
echo.

echo Waiting for Ngrok to start...
timeout /t 5 /nobreak >nul

echo Fetching Ngrok tunnels...
curl -s http://localhost:4040/api/tunnels > temp_tunnels.json

echo.
echo Parsing API URL...
for /f "tokens=*" %%a in ('powershell -Command "(Get-Content temp_tunnels.json | ConvertFrom-Json).tunnels | Where-Object {$_.config.addr -like '*:4000'} | Select-Object -ExpandProperty public_url"') do (
    set API_URL=%%a
)

if "!API_URL!"=="" (
    echo ERROR: Could not get Ngrok API URL
    echo Please check if Ngrok is running on port 4000
    pause
    exit /b 1
)

echo ✓ API URL: !API_URL!
echo.

echo Updating apps\web\.env.local...
(
    echo NEXT_PUBLIC_API_URL=!API_URL!
    echo NEXT_PUBLIC_SOCKET_URL=!API_URL!
    echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
    echo NEXT_PUBLIC_GOOGLE_CLIENT_ID=
    echo NEXT_PUBLIC_FACEBOOK_APP_ID=
) > apps\web\.env.local

echo ✓ Configuration updated!
echo.

del temp_tunnels.json

echo ========================================
echo Configuration Complete!
echo ========================================
echo.
echo API URL set to: !API_URL!
echo.
echo You can now start the frontend with:
echo   cd apps\web
echo   npm run dev
echo.
pause

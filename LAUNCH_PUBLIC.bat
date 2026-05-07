@echo off
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║          🎮 QUIZ BATTLE - PUBLIC LAUNCH 🌐                ║
echo ║                                                            ║
echo ║     Making your game accessible to ANYONE in the world    ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if Ngrok is installed
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Ngrok is not installed!
    echo.
    echo 📥 Please install Ngrok first:
    echo    1. Go to: https://ngrok.com/download
    echo    2. Download ngrok.exe
    echo    3. Extract and place ngrok.exe in this folder
    echo       OR add it to your system PATH
    echo.
    echo After installing, run this script again.
    echo.
    pause
    exit /b 1
)

echo ✅ Ngrok detected!
echo.
echo ⏳ Starting services...
echo.

REM Start API Server
echo [1/6] Starting API Server (Backend)...
start "🔧 Quiz Battle API" cmd /c "cd apps\api && npm run dev"
timeout /t 8 /nobreak >nul
echo     ✓ API Server running on http://localhost:4000
echo.

REM Start Ngrok for API
echo [2/6] Creating public tunnel for API...
start "🌐 Ngrok API Tunnel" cmd /c "ngrok http 4000 --log=stdout"
timeout /t 5 /nobreak >nul
echo     ✓ API tunnel created
echo.

REM Get Ngrok API URL
echo [3/6] Retrieving public API URL...
timeout /t 3 /nobreak >nul

powershell -Command "$tunnels = Invoke-RestMethod -Uri 'http://localhost:4040/api/tunnels'; $apiUrl = ($tunnels.tunnels | Where-Object {$_.config.addr -like '*:4000'}).public_url; if ($apiUrl) { Write-Output $apiUrl > ngrok_api_url.txt; Write-Host '     ✓ API URL:' $apiUrl -ForegroundColor Green } else { Write-Host '     ❌ Could not get API URL' -ForegroundColor Red; exit 1 }"

if not exist ngrok_api_url.txt (
    echo     ❌ Failed to get Ngrok URL
    echo     Please check if Ngrok is running properly
    pause
    exit /b 1
)

set /p NGROK_API_URL=<ngrok_api_url.txt
echo.

REM Update Frontend Configuration
echo [4/6] Configuring frontend with public API URL...
(
    echo NEXT_PUBLIC_API_URL=%NGROK_API_URL%
    echo NEXT_PUBLIC_SOCKET_URL=%NGROK_API_URL%
    echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
    echo NEXT_PUBLIC_GOOGLE_CLIENT_ID=
    echo NEXT_PUBLIC_FACEBOOK_APP_ID=
) > apps\web\.env.local
echo     ✓ Frontend configured with: %NGROK_API_URL%
echo.

REM Start Frontend
echo [5/6] Starting Frontend (Web App)...
start "🎨 Quiz Battle Web" cmd /c "cd apps\web && npm run dev"
timeout /t 8 /nobreak >nul
echo     ✓ Frontend running on http://localhost:3000
echo.

REM Start Ngrok for Frontend
echo [6/6] Creating public tunnel for Frontend...
start "🌐 Ngrok Web Tunnel" cmd /c "ngrok http 3000 --log=stdout"
timeout /t 5 /nobreak >nul
echo     ✓ Frontend tunnel created
echo.

REM Get Ngrok Frontend URL
echo ⏳ Retrieving your public game URL...
timeout /t 3 /nobreak >nul

powershell -Command "$tunnels = Invoke-RestMethod -Uri 'http://localhost:4040/api/tunnels'; $webUrl = ($tunnels.tunnels | Where-Object {$_.config.addr -like '*:3000'}).public_url; if ($webUrl) { Write-Output $webUrl > ngrok_web_url.txt; } else { Write-Host '     ❌ Could not get Web URL' -ForegroundColor Red; exit 1 }"

if not exist ngrok_web_url.txt (
    echo     ❌ Failed to get Frontend URL
    pause
    exit /b 1
)

set /p NGROK_WEB_URL=<ngrok_web_url.txt

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║                  🎉 SUCCESS! 🎉                           ║
echo ║                                                            ║
echo ║         Your game is now PUBLICLY ACCESSIBLE!             ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo.
echo ┌────────────────────────────────────────────────────────────┐
echo │  📱 SHARE THIS URL WITH ANYONE:                           │
echo │                                                            │
echo │  %NGROK_WEB_URL%
echo │                                                            │
echo │  Anyone with this link can play your game!                │
echo └────────────────────────────────────────────────────────────┘
echo.
echo.
echo ┌────────────────────────────────────────────────────────────┐
echo │  ℹ️  IMPORTANT INFORMATION:                                │
echo │                                                            │
echo │  ✓ Your game is now live on the internet                  │
echo │  ✓ Works on any device (PC, phone, tablet)                │
echo │  ✓ No installation needed for players                     │
echo │  ✓ Real-time multiplayer enabled                          │
echo │                                                            │
echo │  ⚠️  KEEP THIS WINDOW OPEN!                                │
echo │     Closing it will stop the public access                │
echo │                                                            │
echo │  📊 Monitor connections:                                   │
echo │     http://localhost:4040 (Ngrok Dashboard)               │
echo │                                                            │
echo │  🔄 URLs change each time you restart                      │
echo │     Run this script again to get new URLs                 │
echo └────────────────────────────────────────────────────────────┘
echo.
echo.

REM Save URLs to file
(
    echo Quiz Battle - Public Access URLs
    echo ================================
    echo.
    echo Generated: %date% %time%
    echo.
    echo PUBLIC GAME URL (Share this^):
    echo %NGROK_WEB_URL%
    echo.
    echo API URL (Backend^):
    echo %NGROK_API_URL%
    echo.
    echo Local URLs:
    echo - Frontend: http://localhost:3000
    echo - Backend: http://localhost:4000
    echo - Ngrok Dashboard: http://localhost:4040
    echo.
    echo IMPORTANT: Keep all windows open to maintain access!
) > PUBLIC_URLS.txt

echo 💾 URLs saved to: PUBLIC_URLS.txt
echo.

REM Open Ngrok dashboard
echo 🌐 Opening Ngrok dashboard...
timeout /t 2 /nobreak >nul
start http://localhost:4040
echo.

REM Copy URL to clipboard
echo %NGROK_WEB_URL% | clip
echo 📋 Public URL copied to clipboard!
echo    Just paste (Ctrl+V) to share with friends!
echo.
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo Press any key to see running services...
pause >nul

echo.
echo 🔧 Running Services:
echo.
echo   1. Quiz Battle API      - Backend server
echo   2. Quiz Battle Web      - Frontend server
echo   3. Ngrok API Tunnel     - Public API access
echo   4. Ngrok Web Tunnel     - Public game access
echo.
echo All windows must stay open for the game to work!
echo.
echo To stop everything, close all the opened windows.
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 🎮 Your game is LIVE! Share the URL and start playing!
echo.
pause

REM Cleanup temp files
del ngrok_api_url.txt 2>nul
del ngrok_web_url.txt 2>nul

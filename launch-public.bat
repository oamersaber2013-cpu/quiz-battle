@echo off
echo ========================================
echo Quiz Battle - Public Launch Setup
echo ========================================
echo.

echo [Step 1/5] Checking if Ngrok is installed...
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Ngrok is not installed!
    echo.
    echo Please install Ngrok:
    echo 1. Go to: https://ngrok.com/download
    echo 2. Download and extract ngrok.exe
    echo 3. Add ngrok.exe to your PATH or place it in this folder
    echo.
    echo After installing, run this script again.
    pause
    exit /b 1
)
echo ✓ Ngrok is installed
echo.

echo [Step 2/5] Starting API server...
start "Quiz Battle API" cmd /k "cd apps\api && npm run dev"
timeout /t 5 /nobreak >nul
echo ✓ API server starting...
echo.

echo [Step 3/5] Creating Ngrok tunnel for API (port 4000)...
start "Ngrok API" cmd /k "ngrok http 4000"
timeout /t 3 /nobreak >nul
echo ✓ API tunnel created
echo.

echo [Step 4/5] Getting Ngrok API URL...
timeout /t 2 /nobreak >nul
curl -s http://localhost:4040/api/tunnels > ngrok_tunnels.json
echo ✓ Tunnel info retrieved
echo.

echo [Step 5/5] Instructions to complete setup:
echo.
echo ========================================
echo IMPORTANT - FOLLOW THESE STEPS:
echo ========================================
echo.
echo 1. Open the Ngrok window that just opened
echo 2. Copy the HTTPS URL (looks like: https://abc123.ngrok.io)
echo.
echo 3. Edit this file: apps\web\.env.local
echo    Replace both URLs with your Ngrok URL:
echo    NEXT_PUBLIC_API_URL=https://YOUR_NGROK_URL
echo    NEXT_PUBLIC_SOCKET_URL=https://YOUR_NGROK_URL
echo.
echo 4. After updating .env.local, press any key to continue...
pause >nul
echo.

echo [Starting Frontend...]
start "Quiz Battle Web" cmd /k "cd apps\web && npm run dev"
timeout /t 5 /nobreak >nul
echo.

echo [Creating Ngrok tunnel for Frontend (port 3000)...]
start "Ngrok Web" cmd /k "ngrok http 3000"
timeout /t 3 /nobreak >nul
echo.

echo ========================================
echo 🎉 SETUP COMPLETE!
echo ========================================
echo.
echo Your game is now PUBLIC!
echo.
echo Look at the "Ngrok Web" window and find the HTTPS URL
echo Share that URL with anyone in the world!
echo.
echo Example: https://xyz789.ngrok.io
echo.
echo ========================================
echo KEEP ALL WINDOWS OPEN!
echo ========================================
echo - Quiz Battle API (backend server)
echo - Quiz Battle Web (frontend server)  
echo - Ngrok API (backend tunnel)
echo - Ngrok Web (frontend tunnel)
echo.
echo Press any key to see the URLs...
pause >nul

echo.
echo Opening Ngrok dashboard...
start http://localhost:4040
echo.
echo ========================================
echo Your Public URLs:
echo ========================================
echo Check the Ngrok windows or dashboard for your URLs
echo Share the FRONTEND URL with your friends!
echo.
pause

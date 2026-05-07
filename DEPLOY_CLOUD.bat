@echo off
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║     🌐 PERMANENT CLOUD DEPLOYMENT - LIKE FACEBOOK 🌐      ║
echo ║                                                            ║
echo ║        Get a URL that NEVER changes and works 24/7        ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

echo This script will help you deploy to the cloud for FREE!
echo.
echo You'll get permanent URLs like:
echo   🎮 https://quiz-battle.vercel.app
echo   🔧 https://quiz-battle-api.up.railway.app
echo.
echo These URLs:
echo   ✅ NEVER change
echo   ✅ Work 24/7 (even when your PC is off)
echo   ✅ Support unlimited users
echo   ✅ Are completely FREE
echo.
pause
cls

echo.
echo ════════════════════════════════════════════════════════════
echo STEP 1: Install Vercel CLI
echo ════════════════════════════════════════════════════════════
echo.

where vercel >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Vercel CLI already installed
) else (
    echo Installing Vercel CLI...
    call npm install -g vercel
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Vercel CLI
        echo Please run: npm install -g vercel
        pause
        exit /b 1
    )
    echo ✅ Vercel CLI installed
)
echo.
pause

cls
echo.
echo ════════════════════════════════════════════════════════════
echo STEP 2: Deploy Frontend to Vercel
echo ════════════════════════════════════════════════════════════
echo.
echo This will:
echo   1. Ask you to login to Vercel (use GitHub)
echo   2. Create a new project
echo   3. Deploy your frontend
echo   4. Give you a permanent URL
echo.
echo Press any key to start deployment...
pause >nul

cd apps\web
echo.
echo Deploying to Vercel...
echo.
call vercel --prod

if %errorlevel% neq 0 (
    echo.
    echo ❌ Deployment failed
    echo.
    echo Please try manually:
    echo   1. Go to https://vercel.com
    echo   2. Click "Add New Project"
    echo   3. Import your quiz-battle repository
    echo   4. Set Root Directory to: apps/web
    echo   5. Deploy!
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Frontend deployed to Vercel!
echo.
echo Copy your Vercel URL (looks like: https://quiz-battle-xxx.vercel.app)
echo You'll need it for the next step.
echo.
set /p VERCEL_URL="Paste your Vercel URL here: "
echo.

cd ..\..

cls
echo.
echo ════════════════════════════════════════════════════════════
echo STEP 3: Deploy Backend to Railway
echo ════════════════════════════════════════════════════════════
echo.
echo Railway doesn't have a CLI, so we'll use their website:
echo.
echo 1. Go to: https://railway.app
echo 2. Click "Login" → "Login with GitHub"
echo 3. Click "New Project" → "Deploy from GitHub repo"
echo 4. Select your quiz-battle repository
echo 5. Click "Add variables" and add:
echo.
echo    NODE_ENV=production
echo    PORT=4000
echo    JWT_SECRET=your-super-secret-key
echo    FRONTEND_URL=%VERCEL_URL%
echo.
echo 6. Click "Settings" and set:
echo    Root Directory: apps/api
echo    Build Command: npm install ^&^& npm run build
echo    Start Command: npm start
echo.
echo 7. Click "Deploy"
echo.
echo After deployment, copy your Railway URL
echo (looks like: https://quiz-battle-api.up.railway.app)
echo.
echo Press any key when you have your Railway URL...
pause >nul

echo.
set /p RAILWAY_URL="Paste your Railway URL here: "
echo.

cls
echo.
echo ════════════════════════════════════════════════════════════
echo STEP 4: Update Frontend with Backend URL
echo ════════════════════════════════════════════════════════════
echo.
echo Updating Vercel environment variables...
echo.
echo Go to Vercel dashboard:
echo   1. Open: https://vercel.com/dashboard
echo   2. Click on your quiz-battle project
echo   3. Go to "Settings" → "Environment Variables"
echo   4. Add these variables:
echo.
echo      NEXT_PUBLIC_API_URL=%RAILWAY_URL%
echo      NEXT_PUBLIC_SOCKET_URL=%RAILWAY_URL%
echo.
echo   5. Click "Save"
echo   6. Go to "Deployments" tab
echo   7. Click "..." on latest deployment → "Redeploy"
echo.
echo Press any key when done...
pause >nul

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║                  🎉 DEPLOYMENT COMPLETE! 🎉               ║
echo ║                                                            ║
echo ║              Your game is now LIVE 24/7!                  ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo.
echo ┌────────────────────────────────────────────────────────────┐
echo │  🌐 YOUR PERMANENT URLS:                                  │
echo │                                                            │
echo │  Frontend (Share this):                                   │
echo │  %VERCEL_URL%
echo │                                                            │
echo │  Backend (API):                                           │
echo │  %RAILWAY_URL%
echo │                                                            │
echo │  ✅ These URLs NEVER change!                              │
echo │  ✅ Works 24/7 (even when PC is off)                      │
echo │  ✅ Unlimited users                                       │
echo │  ✅ Professional hosting                                  │
echo └────────────────────────────────────────────────────────────┘
echo.
echo.

REM Save URLs
(
    echo Quiz Battle - Permanent Cloud URLs
    echo ====================================
    echo.
    echo Deployed: %date% %time%
    echo.
    echo SHARE THIS URL:
    echo %VERCEL_URL%
    echo.
    echo API URL:
    echo %RAILWAY_URL%
    echo.
    echo These URLs are permanent and work 24/7!
    echo Share the frontend URL with anyone.
    echo.
    echo Dashboards:
    echo - Vercel: https://vercel.com/dashboard
    echo - Railway: https://railway.app/dashboard
) > PERMANENT_URLS.txt

echo 💾 URLs saved to: PERMANENT_URLS.txt
echo.

REM Copy to clipboard
echo %VERCEL_URL% | clip
echo 📋 Frontend URL copied to clipboard!
echo.
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 🎮 Your game is now LIVE like Facebook!
echo.
echo Share this URL with ANYONE:
echo %VERCEL_URL%
echo.
echo They can play 24/7 from anywhere in the world!
echo.
echo ════════════════════════════════════════════════════════════
echo.
pause

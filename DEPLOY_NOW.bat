@echo off
echo ========================================
echo Quiz Battle - Cloud Deployment
echo ========================================
echo.

echo Step 1: Vercel Login
echo ------------------------------------
echo Opening Vercel login...
echo.
call vercel login
if errorlevel 1 (
    echo ERROR: Vercel login failed
    pause
    exit /b 1
)

echo.
echo Step 2: Deploy Frontend to Vercel
echo ------------------------------------
cd apps\web
echo Deploying frontend...
call vercel --prod --yes
if errorlevel 1 (
    echo ERROR: Frontend deployment failed
    cd ..\..
    pause
    exit /b 1
)

echo.
echo Getting deployment URL...
for /f "tokens=*" %%i in ('vercel ls --prod 2^>nul ^| findstr "https://"') do set FRONTEND_URL=%%i

cd ..\..

echo.
echo ========================================
echo FRONTEND DEPLOYED SUCCESSFULLY!
echo ========================================
echo Frontend URL: %FRONTEND_URL%
echo.

echo.
echo Step 3: Backend Deployment Instructions
echo ------------------------------------
echo.
echo Your frontend is now live! Now let's deploy the backend.
echo.
echo OPTION A - Railway (Recommended, Free):
echo 1. Go to: https://railway.app
echo 2. Click "Start a New Project"
echo 3. Click "Deploy from GitHub repo" or "Empty Project"
echo 4. Add PostgreSQL database (click "+ New" -^> Database -^> PostgreSQL)
echo 5. Add Redis (click "+ New" -^> Database -^> Redis)
echo 6. Deploy your API:
echo    - If GitHub: Select your repo and apps/api folder
echo    - If Empty: Upload apps/api folder
echo 7. Add these environment variables in Railway:
echo.
echo    PORT=4000
echo    NODE_ENV=production
echo    DATABASE_URL=(auto-filled by Railway PostgreSQL)
echo    REDIS_URL=(auto-filled by Railway Redis)
echo    JWT_SECRET=your-super-secret-jwt-key-change-this
echo    FRONTEND_URL=%FRONTEND_URL%
echo    STRIPE_SECRET_KEY=sk_test_your_stripe_key
echo    STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
echo    OPENAI_API_KEY=sk-your_openai_key
echo.
echo 8. Railway will give you a URL like: https://quiz-battle-api.up.railway.app
echo.
echo.
echo OPTION B - Render (Alternative, Free):
echo 1. Go to: https://render.com
echo 2. Click "New +" -^> "Web Service"
echo 3. Connect your GitHub repo or upload code
echo 4. Settings:
echo    - Root Directory: apps/api
echo    - Build Command: npm install ^&^& npm run build
echo    - Start Command: npm start
echo 5. Add PostgreSQL database (New + -^> PostgreSQL)
echo 6. Add Redis (New + -^> Redis)
echo 7. Add environment variables (same as Railway above)
echo.
echo.
echo Step 4: Update Frontend Environment
echo ------------------------------------
echo After you get your backend URL from Railway/Render:
echo.
echo 1. Run this command (replace YOUR_API_URL):
echo    vercel env add NEXT_PUBLIC_API_URL production
echo    Then enter: YOUR_API_URL
echo.
echo 2. Run this command:
echo    vercel env add NEXT_PUBLIC_SOCKET_URL production
echo    Then enter: YOUR_API_URL
echo.
echo 3. Redeploy frontend:
echo    cd apps\web
echo    vercel --prod
echo.
echo.
echo ========================================
echo DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo Your permanent URLs:
echo Frontend: %FRONTEND_URL%
echo Backend: (You'll get this from Railway/Render)
echo.
echo These URLs:
echo - Never change
echo - Work 24/7
echo - Support unlimited users
echo - Are completely FREE
echo.
echo Save these URLs somewhere safe!
echo.
pause

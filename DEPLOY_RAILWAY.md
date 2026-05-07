# Deploy to Railway (Both Frontend & Backend)

Since Vercel is having build issues, let's deploy everything to Railway which is simpler and free.

## Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub (recommended)
3. Verify your email

## Step 2: Deploy Backend (API)

1. Click "New Project"
2. Click "Deploy from GitHub repo"
3. Select your quiz-battle repository
4. Railway will detect multiple services
5. Select `apps/api` folder
6. Add PostgreSQL database:
   - Click "+ New"
   - Select "Database"
   - Choose "PostgreSQL"
7. Add Redis:
   - Click "+ New"
   - Select "Database"
   - Choose "Redis"
8. Configure API environment variables:
   ```
   PORT=4000
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   JWT_SECRET=your-super-secret-key-change-this
   FRONTEND_URL=https://your-frontend-url.railway.app
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_WEBHOOK_SECRET=whsec_your_secret
   OPENAI_API_KEY=sk-your_key
   ```
9. Railway will auto-deploy and give you a URL like:
   `https://quiz-battle-api-production.up.railway.app`

## Step 3: Deploy Frontend (Web)

1. In same Railway project, click "+ New"
2. Select "GitHub Repo"
3. Choose `apps/web` folder
4. Configure Web environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-api-url.railway.app
   NEXT_PUBLIC_SOCKET_URL=https://your-api-url.railway.app
   ```
5. Railway will auto-deploy and give you a URL like:
   `https://quiz-battle-web-production.up.railway.app`

## Step 4: Update Backend with Frontend URL

1. Go back to API service settings
2. Update `FRONTEND_URL` environment variable with your actual frontend URL
3. Railway will auto-redeploy

## Step 5: Run Database Migrations

1. In Railway API service, click "Settings"
2. Scroll to "Deploy"
3. Add this to "Build Command":
   ```
   npm install && npm run build && npx prisma migrate deploy
   ```
4. Redeploy

## Done!

Your game is now live 24/7 with permanent URLs:
- Frontend: `https://quiz-battle-web-production.up.railway.app`
- Backend: `https://quiz-battle-api-production.up.railway.app`

Share the frontend URL with anyone to play!

## Alternative: Use Render.com

If Railway doesn't work, try Render.com (also free):
1. Go to https://render.com
2. Create "Web Service" for API
3. Create "Static Site" for Web
4. Follow similar steps as Railway

Both platforms offer:
- ✅ Free tier
- ✅ Automatic HTTPS
- ✅ Permanent URLs
- ✅ Auto-deploy from GitHub
- ✅ Built-in databases

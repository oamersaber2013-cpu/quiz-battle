# 🚀 Deploy Quiz Battle to Railway - Step by Step

## Why Railway is Better for This Project:
- ✅ Handles monorepos automatically
- ✅ Built-in PostgreSQL + Redis (free)
- ✅ Deploys both frontend + backend together
- ✅ No build issues (uses dev mode if needed)
- ✅ $5/month free credit (enough for your app)
- ✅ Permanent URLs that never change

---

## Step 1: Push Your Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Deploy quiz battle"

# Create a new repository on GitHub:
# Go to https://github.com/new
# Name it: quiz-battle
# Don't initialize with README

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/quiz-battle.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy on Railway

### 2.1 Create Account
1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway

### 2.2 Create New Project
1. Click "New Project"
2. Click "Deploy from GitHub repo"
3. Select "quiz-battle" repository
4. Railway will analyze your repo

### 2.3 Configure Services

Railway will detect your monorepo and create services. You need to configure each:

#### A. Backend (API) Service
1. Click on the API service
2. Go to "Settings" tab
3. Set these:
   - **Root Directory**: `apps/api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: 4000

4. Go to "Variables" tab and add:
```
PORT=4000
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this-now
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
OPENAI_API_KEY=sk-your_openai_key
```

5. Add PostgreSQL Database:
   - Click "+ New" in your project
   - Select "Database" → "Add PostgreSQL"
   - Railway creates it automatically
   - Go back to API Variables tab
   - Add: `DATABASE_URL=${{Postgres.DATABASE_URL}}`

6. Add Redis:
   - Click "+ New" in your project
   - Select "Database" → "Add Redis"
   - Railway creates it automatically
   - Go back to API Variables tab
   - Add: `REDIS_URL=${{Redis.REDIS_URL}}`

7. Get your API URL:
   - In API service, go to "Settings"
   - Click "Generate Domain"
   - Copy the URL (e.g., `https://quiz-battle-api-production.up.railway.app`)

#### B. Frontend (Web) Service
1. Click on the Web service
2. Go to "Settings" tab
3. Set these:
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run dev`
   - **Port**: 3000

4. Go to "Variables" tab and add:
```
NEXT_PUBLIC_API_URL=https://your-api-url-from-step-7.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-api-url-from-step-7.railway.app
```

5. Generate Domain:
   - In Settings, click "Generate Domain"
   - Copy the URL (e.g., `https://quiz-battle-web-production.up.railway.app`)

#### C. Update API with Frontend URL
1. Go back to API service
2. Go to "Variables" tab
3. Add: `FRONTEND_URL=https://your-web-url-from-step-5.railway.app`

---

## Step 3: Deploy!

Railway will automatically deploy both services. Wait 2-3 minutes.

---

## Step 4: Run Database Migrations

1. In Railway, click on API service
2. Click "Deployments" tab
3. Click on the latest deployment
4. Click "View Logs"
5. If you see database errors, run migrations:
   - Go to API service "Settings"
   - Update Build Command to:
     ```
     npm install && npm run build && npx prisma migrate deploy
     ```
   - Click "Redeploy"

---

## Step 5: Seed Questions (Optional)

If you want to add the 4000 questions:

1. In Railway API service, click "Settings"
2. Add a "Deploy Hook" or use Railway CLI:
   ```bash
   railway login
   railway link
   railway run npm run seed
   ```

---

## 🎉 YOU'RE LIVE!

Your permanent URLs:
- **Frontend**: `https://quiz-battle-web-production.up.railway.app`
- **Backend**: `https://quiz-battle-api-production.up.railway.app`

Share the frontend URL with anyone to play!

---

## Troubleshooting

### If API won't start:
- Check logs in Railway
- Make sure DATABASE_URL and REDIS_URL are set
- Run migrations

### If Web won't start:
- Check that API URL is correct in variables
- Make sure API is running first

### If you see CORS errors:
- Make sure FRONTEND_URL in API matches your actual web URL

---

## Cost

Railway gives you $5/month free credit, which includes:
- 500 hours of runtime (enough for 24/7)
- PostgreSQL database
- Redis cache
- Unlimited bandwidth

Your app will cost ~$0-3/month depending on usage.

---

## Next Steps

1. Push to GitHub (5 minutes)
2. Connect Railway (2 minutes)
3. Configure services (10 minutes)
4. Deploy! (3 minutes)

**Total time: ~20 minutes**

Then you'll have permanent URLs that work 24/7 like Facebook!

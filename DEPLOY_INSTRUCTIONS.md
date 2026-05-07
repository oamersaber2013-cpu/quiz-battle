# 🚀 FINAL STEP - Push to GitHub and Deploy

## ✅ What's Done:
- Git initialized
- All files committed
- Ready to push

## 📝 Step 1: Create GitHub Repository

1. Go to: https://github.com/new
2. Repository name: `quiz-battle`
3. Description: `Real-time multiplayer quiz battle game`
4. Keep it **Public** (required for free Railway deployment)
5. **DO NOT** check "Initialize with README"
6. Click "Create repository"

## 📤 Step 2: Push Your Code

GitHub will show you commands. Run these in your terminal:

```bash
git remote add origin https://github.com/YOUR_USERNAME/quiz-battle.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## 🚂 Step 3: Deploy on Railway

### 3.1 Sign Up
1. Go to: https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway

### 3.2 Create Project
1. Click "New Project"
2. Click "Deploy from GitHub repo"
3. Select "quiz-battle"
4. Railway will detect your monorepo

### 3.3 Configure Backend (API)

Railway should auto-create an API service. Click on it:

**Settings:**
- Root Directory: `apps/api`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

**Add Databases:**
1. Click "+ New" → Database → PostgreSQL
2. Click "+ New" → Database → Redis

**Environment Variables:**
Click "Variables" tab and add:
```
PORT=4000
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=super-secret-key-change-this-to-something-random
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
OPENAI_API_KEY=sk-your_key
```

**Generate Domain:**
- Go to Settings
- Click "Generate Domain"
- Copy the URL (e.g., `https://quiz-battle-api-production.up.railway.app`)

### 3.4 Configure Frontend (Web)

Railway should auto-create a Web service. Click on it:

**Settings:**
- Root Directory: `apps/web`
- Build Command: `npm install`
- Start Command: `npm run dev`

**Environment Variables:**
Click "Variables" tab and add:
```
NEXT_PUBLIC_API_URL=https://your-api-url-from-above.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-api-url-from-above.railway.app
```

**Generate Domain:**
- Go to Settings
- Click "Generate Domain"
- Copy the URL (e.g., `https://quiz-battle-web-production.up.railway.app`)

### 3.5 Update API with Frontend URL

Go back to API service → Variables → Add:
```
FRONTEND_URL=https://your-web-url-from-above.railway.app
```

## ⏱️ Wait for Deployment

Railway will deploy both services. This takes 2-3 minutes.

## 🎉 YOU'RE LIVE!

Your permanent URLs:
- **Frontend**: Share this with players!
- **Backend**: API endpoint

These URLs:
- ✅ Never change
- ✅ Work 24/7
- ✅ Support unlimited users
- ✅ Are FREE ($5/month credit from Railway)

## 🐛 Troubleshooting

### If API fails to start:
1. Check logs in Railway
2. Make sure DATABASE_URL is set
3. Run migrations:
   - Update Build Command to: `npm install && npm run build && npx prisma migrate deploy`

### If Web fails to start:
1. Make sure API URL is correct
2. Check that API is running first

### If you see CORS errors:
- Make sure FRONTEND_URL in API matches your web URL exactly

## 💰 Cost

Railway free tier includes:
- $5/month credit
- 500 hours runtime (enough for 24/7)
- PostgreSQL + Redis
- Unlimited bandwidth

Your app will cost $0-3/month.

## 📊 Monitor Your App

In Railway dashboard you can:
- View logs
- See metrics
- Restart services
- Update environment variables

---

## 🎯 Quick Summary

1. Create GitHub repo
2. Push code: `git push -u origin main`
3. Connect Railway to GitHub
4. Configure services (10 minutes)
5. Get permanent URLs
6. Share and play!

**Total time: 15-20 minutes**

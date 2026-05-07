# 🚀 QUICK START - 3 Steps to Deploy

## Step 1: Create GitHub Repo
1. Go to: https://github.com/new
2. Name: `quiz-battle`
3. Public repository
4. Click "Create repository"

## Step 2: Push Code
```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/quiz-battle.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy on Railway
1. Go to: https://railway.app
2. Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select "quiz-battle"
5. Railway auto-configures everything!

### Configure Services:

**API Service:**
- Add PostgreSQL database (click "+ New" → Database → PostgreSQL)
- Add Redis (click "+ New" → Database → Redis)
- Add environment variables:
  ```
  PORT=4000
  NODE_ENV=production
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  REDIS_URL=${{Redis.REDIS_URL}}
  JWT_SECRET=your-secret-key
  ```
- Generate domain → Copy API URL

**Web Service:**
- Add environment variables:
  ```
  NEXT_PUBLIC_API_URL=https://your-api-url.railway.app
  NEXT_PUBLIC_SOCKET_URL=https://your-api-url.railway.app
  ```
- Generate domain → Copy Web URL

**Update API:**
- Add to API variables:
  ```
  FRONTEND_URL=https://your-web-url.railway.app
  ```

## 🎉 Done!

Your game is live at: `https://your-web-url.railway.app`

Share this URL with anyone to play!

---

**Need detailed instructions?** See `DEPLOY_INSTRUCTIONS.md`

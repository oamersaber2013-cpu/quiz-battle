# 🚀 DEPLOY TO RAILWAY - Final Steps

## ✅ Code is on GitHub!
Repository: https://github.com/oamersaber2013-cpu/quiz-battle

---

## 🚂 Railway Deployment (15 minutes)

### Step 1: Sign Up on Railway
1. Go to: **https://railway.app**
2. Click **"Login with GitHub"**
3. Authorize Railway to access your GitHub
4. Verify your email if prompted

### Step 2: Create New Project
1. Click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Select **"oamersaber2013-cpu/quiz-battle"**
4. Railway will analyze your repository (takes 10 seconds)

### Step 3: Railway Auto-Detects Services
Railway should automatically detect:
- ✅ API service (apps/api)
- ✅ Web service (apps/web)

If not, you'll manually add them in the next steps.

---

## 🔧 Configure Backend (API Service)

### 3.1 Add PostgreSQL Database
1. In your Railway project, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway creates it automatically
5. Note: DATABASE_URL is auto-generated

### 3.2 Add Redis Cache
1. Click **"+ New"** again
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Railway creates it automatically
5. Note: REDIS_URL is auto-generated

### 3.3 Configure API Service
Click on the **API service**, then:

**Go to "Settings" tab:**
- **Root Directory**: `apps/api`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Watch Paths**: `apps/api`

**Go to "Variables" tab and add these:**
```
PORT=4000
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=quiz-battle-super-secret-key-2024-change-this
STRIPE_SECRET_KEY=sk_test_51234567890
STRIPE_WEBHOOK_SECRET=whsec_1234567890
OPENAI_API_KEY=sk-proj-1234567890
```

**Note:** Replace the Stripe and OpenAI keys with your actual keys if you have them. The app will work without them for basic gameplay.

### 3.4 Generate API Domain
1. Still in API service, go to **"Settings"**
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Copy the URL (e.g., `https://quiz-battle-api-production.up.railway.app`)
5. **SAVE THIS URL** - you'll need it for the frontend

---

## 🌐 Configure Frontend (Web Service)

### 4.1 Configure Web Service
Click on the **Web service**, then:

**Go to "Settings" tab:**
- **Root Directory**: `apps/web`
- **Build Command**: `npm install`
- **Start Command**: `npm run dev`
- **Watch Paths**: `apps/web`

**Go to "Variables" tab and add these:**
```
NEXT_PUBLIC_API_URL=https://your-api-url-from-step-3.4.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-api-url-from-step-3.4.railway.app
```

**Replace** `your-api-url-from-step-3.4.railway.app` with the actual API URL you copied in step 3.4.

### 4.2 Generate Web Domain
1. Still in Web service, go to **"Settings"**
2. Scroll to **"Networking"**
3. Click **"Generate Domain"**
4. Copy the URL (e.g., `https://quiz-battle-web-production.up.railway.app`)
5. **THIS IS YOUR GAME URL** - Share this with players!

---

## 🔄 Update API with Frontend URL

### 5.1 Add Frontend URL to API
1. Go back to **API service**
2. Click **"Variables"** tab
3. Add one more variable:
```
FRONTEND_URL=https://your-web-url-from-step-4.2.railway.app
```

**Replace** with the actual Web URL you copied in step 4.2.

### 5.2 Redeploy API
1. Click on **API service**
2. Click **"Deployments"** tab
3. Click **"Redeploy"** (or it will auto-redeploy when you save variables)

---

## ⏱️ Wait for Deployment

Railway will now deploy both services. Watch the logs:
- Click on each service
- Click "Deployments" tab
- Click on the latest deployment
- Watch the build logs

**Expected time:**
- API: 2-3 minutes
- Web: 1-2 minutes

---

## 🎉 YOU'RE LIVE!

Once both services show "Success" status:

### Your Permanent URLs:
- **Game (Frontend)**: `https://quiz-battle-web-production.up.railway.app`
- **API (Backend)**: `https://quiz-battle-api-production.up.railway.app`

### Share Your Game:
Send the **Frontend URL** to anyone. They can:
- ✅ Play from anywhere in the world
- ✅ No installation needed
- ✅ Works on mobile and desktop
- ✅ Available 24/7

---

## 🔍 Verify It's Working

### Test the API:
Open in browser: `https://your-api-url.railway.app/health`
Should return: `{"status":"ok"}`

### Test the Frontend:
Open in browser: `https://your-web-url.railway.app`
Should show the Quiz Battle home page!

---

## 🐛 Troubleshooting

### If API fails to start:
1. Check logs in Railway (API service → Deployments → View Logs)
2. Common issues:
   - DATABASE_URL not set → Make sure PostgreSQL is added
   - REDIS_URL not set → Make sure Redis is added
   - Build failed → Check if all dependencies installed

### If Web fails to start:
1. Check logs in Railway (Web service → Deployments → View Logs)
2. Common issues:
   - API URL not set → Check NEXT_PUBLIC_API_URL variable
   - API not running → Make sure API deployed successfully first

### If you see CORS errors:
- Make sure FRONTEND_URL in API exactly matches your Web URL
- No trailing slash
- Include https://

---

## 💰 Railway Pricing

**Free Tier Includes:**
- $5 usage credit per month
- 500 hours of runtime (enough for 24/7)
- PostgreSQL database
- Redis cache
- Unlimited bandwidth

**Your app will cost approximately:**
- $0-3/month depending on traffic
- First month is FREE with the $5 credit

---

## 📊 Monitor Your App

In Railway dashboard you can:
- **View Logs**: See what's happening in real-time
- **Metrics**: CPU, memory, network usage
- **Restart**: If something goes wrong
- **Environment Variables**: Update anytime
- **Deployments**: See history and rollback if needed

---

## 🔄 Auto-Deploy on Git Push

Railway is now connected to your GitHub repo!

**To update your app:**
```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push

# Railway automatically detects and deploys!
```

---

## 🎮 Next Steps

1. **Test your game**: Open the Web URL and create a game
2. **Share with friends**: Send them the URL
3. **Monitor usage**: Check Railway dashboard
4. **Add questions**: Run the seed script if needed
5. **Customize**: Update environment variables as needed

---

## 📝 Important URLs to Save

- **GitHub Repo**: https://github.com/oamersaber2013-cpu/quiz-battle
- **Railway Dashboard**: https://railway.app/dashboard
- **Game URL**: (Your Web URL from Railway)
- **API URL**: (Your API URL from Railway)

---

## ✅ Checklist

- [ ] Railway account created
- [ ] Project created from GitHub
- [ ] PostgreSQL added
- [ ] Redis added
- [ ] API service configured
- [ ] API domain generated
- [ ] Web service configured
- [ ] Web domain generated
- [ ] FRONTEND_URL updated in API
- [ ] Both services deployed successfully
- [ ] Game tested and working

---

## 🆘 Need Help?

If you get stuck:
1. Check the Railway logs (most errors are shown there)
2. Verify all environment variables are set correctly
3. Make sure both services are running
4. Check that URLs don't have typos

---

## 🚀 Ready to Deploy!

Go to: **https://railway.app**

Follow the steps above and you'll be live in 15 minutes!

# 🚂 RAILWAY CONFIGURATION - What You Need to Do

Since Railway is now analyzing your repository, here's exactly what you need to configure in the Railway dashboard:

---

## 📋 Railway Should Show You:

Railway detected your monorepo and should show:
- **API service** (from apps/api)
- **Web service** (from apps/web)

If it doesn't auto-detect, you'll need to add services manually.

---

## 🔧 STEP-BY-STEP CONFIGURATION:

### 1️⃣ ADD DATABASES FIRST

#### Add PostgreSQL:
1. Click **"+ New"** button in your project
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway creates it (takes 10 seconds)

#### Add Redis:
1. Click **"+ New"** button again
2. Select **"Database"**
3. Choose **"Add Redis"**
4. Railway creates it (takes 10 seconds)

---

### 2️⃣ CONFIGURE API SERVICE

Click on the **API service** (or create it if not auto-detected):

#### Settings Tab:
- **Root Directory**: `apps/api`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Watch Paths**: `apps/api`

#### Variables Tab - Add These:
```
PORT=4000
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=quiz-battle-secret-key-2024-change-this
FRONTEND_URL=https://TEMP-WILL-UPDATE-LATER.railway.app
```

**Note:** We'll update FRONTEND_URL after we get the web URL.

#### Generate Domain:
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. **COPY THIS URL** - You'll need it for the web service
4. Example: `https://quiz-battle-api-production.up.railway.app`

---

### 3️⃣ CONFIGURE WEB SERVICE

Click on the **Web service** (or create it if not auto-detected):

#### Settings Tab:
- **Root Directory**: `apps/web`
- **Build Command**: `npm install`
- **Start Command**: `npm run dev`
- **Watch Paths**: `apps/web`

#### Variables Tab - Add These:
```
NEXT_PUBLIC_API_URL=https://YOUR-API-URL-FROM-STEP-2.railway.app
NEXT_PUBLIC_SOCKET_URL=https://YOUR-API-URL-FROM-STEP-2.railway.app
```

**Replace** `YOUR-API-URL-FROM-STEP-2` with the actual API URL you copied in step 2.

#### Generate Domain:
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. **COPY THIS URL** - This is your game URL!
4. Example: `https://quiz-battle-web-production.up.railway.app`

---

### 4️⃣ UPDATE API WITH WEB URL

Go back to **API service**:

1. Click **Variables** tab
2. Find **FRONTEND_URL**
3. Update it with the Web URL from step 3
4. Example: `https://quiz-battle-web-production.up.railway.app`
5. Save

---

### 5️⃣ DEPLOY!

Railway will automatically deploy both services. Watch the progress:

1. Click on each service
2. Go to **"Deployments"** tab
3. Watch the logs

**Expected time:**
- API: 2-3 minutes
- Web: 1-2 minutes

---

## ✅ VERIFICATION:

### Check API is Running:
Open in browser: `https://your-api-url.railway.app/health`

Should return: `{"status":"ok"}` or similar

### Check Web is Running:
Open in browser: `https://your-web-url.railway.app`

Should show the Quiz Battle home page!

---

## 🎉 YOU'RE LIVE!

Once both services show "Success":

**Your Game URL:** `https://your-web-url.railway.app`

Share this URL with anyone to play!

---

## 🐛 TROUBLESHOOTING:

### If API fails:
- Check logs: API service → Deployments → View Logs
- Verify DATABASE_URL is set (should auto-populate from Postgres)
- Verify REDIS_URL is set (should auto-populate from Redis)

### If Web fails:
- Check logs: Web service → Deployments → View Logs
- Verify NEXT_PUBLIC_API_URL is correct
- Make sure API is running first

### If you see CORS errors:
- Make sure FRONTEND_URL in API matches Web URL exactly
- No trailing slash
- Include https://

---

## 📊 ENVIRONMENT VARIABLES SUMMARY:

### API Service Variables:
```
PORT=4000
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=quiz-battle-secret-key-2024-change-this
FRONTEND_URL=https://your-web-url.railway.app
```

### Web Service Variables:
```
NEXT_PUBLIC_API_URL=https://your-api-url.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-api-url.railway.app
```

---

## 🔄 OPTIONAL: Add Stripe & OpenAI Keys

If you have these keys, add them to API Variables:

```
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
OPENAI_API_KEY=sk-proj-your_key
```

The app works without them for basic gameplay.

---

## 💡 TIPS:

1. **Deploy API first** - Web depends on it
2. **Copy URLs carefully** - No typos!
3. **Check logs** - They show all errors
4. **Be patient** - First deploy takes 2-3 minutes

---

## 🎯 CHECKLIST:

- [ ] PostgreSQL added
- [ ] Redis added
- [ ] API service configured
- [ ] API domain generated
- [ ] API variables set
- [ ] Web service configured
- [ ] Web domain generated
- [ ] Web variables set (with API URL)
- [ ] API FRONTEND_URL updated (with Web URL)
- [ ] Both services deployed successfully
- [ ] Game tested and working

---

## 🚀 THAT'S IT!

Follow these steps in Railway's dashboard and you'll be live in 15 minutes!

**Your game will have permanent URLs that work 24/7!**

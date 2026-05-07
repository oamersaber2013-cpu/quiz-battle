# ✅ RAILWAY DEPLOYMENT CHECKLIST

## 🎯 Follow These Steps in Railway Dashboard:

### STEP 1: Add Databases
- [ ] Click "+ New" → Database → PostgreSQL
- [ ] Click "+ New" → Database → Redis

### STEP 2: Configure API Service
- [ ] Click on API service
- [ ] Settings → Root Directory: `apps/api`
- [ ] Settings → Build Command: `npm install && npm run build`
- [ ] Settings → Start Command: `npm start`
- [ ] Variables → Add:
  ```
  PORT=4000
  NODE_ENV=production
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  REDIS_URL=${{Redis.REDIS_URL}}
  JWT_SECRET=quiz-battle-secret-2024
  FRONTEND_URL=https://TEMP.railway.app
  ```
- [ ] Settings → Generate Domain
- [ ] **COPY API URL**: _______________________________

### STEP 3: Configure Web Service
- [ ] Click on Web service
- [ ] Settings → Root Directory: `apps/web`
- [ ] Settings → Build Command: `npm install`
- [ ] Settings → Start Command: `npm run dev`
- [ ] Variables → Add (use your API URL from Step 2):
  ```
  NEXT_PUBLIC_API_URL=https://your-api-url.railway.app
  NEXT_PUBLIC_SOCKET_URL=https://your-api-url.railway.app
  ```
- [ ] Settings → Generate Domain
- [ ] **COPY WEB URL**: _______________________________

### STEP 4: Update API
- [ ] Go back to API service
- [ ] Variables → Update FRONTEND_URL with your Web URL from Step 3

### STEP 5: Wait for Deployment
- [ ] Watch API deploy (2-3 minutes)
- [ ] Watch Web deploy (1-2 minutes)

### STEP 6: Test
- [ ] Open Web URL in browser
- [ ] Create a test game
- [ ] Verify it works!

---

## 🎉 DONE!

**Your Game URL:** (Web URL from Step 3)

Share this with anyone to play!

---

## 📖 Need Detailed Instructions?

Open: `RAILWAY_STEPS.md`

---

## ⏱️ Time: 15 minutes

Good luck! 🚀

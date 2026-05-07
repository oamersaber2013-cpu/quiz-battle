# 🔧 IMMEDIATE FIXES & LAUNCH GUIDE

## ⚡ Quick Start (Run These Commands Now)

### 1. Database Setup (CRITICAL)
```bash
# Navigate to database package
cd packages/db

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial data
npx prisma db seed
```

### 2. Environment Variables Check

**File: `apps/api/.env`**
```env
PORT=4000
DATABASE_URL="file:../packages/db/prisma/dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
REDIS_URL="redis://localhost:6379"
OPENAI_API_KEY="sk-your-key-here"
HUGGINGFACE_API_TOKEN="hf_your-token-here"
```

**File: `apps/web/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
```

**File: `packages/db/.env`**
```env
DATABASE_URL="file:./prisma/dev.db"
```

### 3. Install Dependencies (if not done)
```bash
# From root directory
npm install
```

### 4. Build All Packages
```bash
# From root directory
npm run build
```

### 5. Start Development Servers
```bash
# Terminal 1: Start API
cd apps/api
npm run dev

# Terminal 2: Start Web
cd apps/web
npm run dev
```

---

## 🐛 CRITICAL BUGS TO FIX NOW

### Bug #1: Missing Error Boundaries
**File**: `apps/web/src/app/layout.tsx`

Add this error boundary wrapper:

```typescript
'use client';
import { Component, ReactNode } from 'react';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h1>⚠️ Something went wrong</h1>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Bug #2: Missing Loading States
**Files to update**:
- `apps/web/src/app/game/[gameId]/page.tsx`
- `apps/web/src/app/lobby/[gameId]/page.tsx`
- `apps/web/src/app/results/[gameId]/page.tsx`

Add at the top of each component:
```typescript
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">⚔️</div>
        <div className="text-muted">Loading...</div>
      </div>
    </div>
  );
}
```

### Bug #3: Socket Reconnection Issues
**File**: `apps/web/src/lib/socket.ts`

Already implemented! Just verify it's working:
- Check `reconnection: true` in socket config
- Check `reconnectionAttempts: 5`
- Test by disconnecting/reconnecting network

---

## 🧪 TESTING CHECKLIST

### Test Each Game Mode (30 minutes)

**Classic Mode**:
```
1. Create game with Classic mode
2. Join with 2nd browser/incognito
3. Start game
4. Answer questions
5. Use power-ups
6. Complete game
7. Check results page
✅ PASS / ❌ FAIL
```

**Survival Mode**:
```
1. Create game with Survival mode
2. Join with 2nd player
3. Answer wrong intentionally
4. Verify elimination
5. Check last player wins
✅ PASS / ❌ FAIL
```

**Conquest Mode**:
```
1. Create Conquest game
2. Join with 2nd player
3. Complete draft phase (5 questions)
4. Select territories
5. Attack opponent territory
6. Win/lose duel
7. Check territory capture
8. Complete invasion phase
✅ PASS / ❌ FAIL
```

**Chaos Mode**:
```
1. Create Chaos game
2. Join with 2nd player
3. Switch tabs (trigger drama)
4. Check voting appears
5. Cast votes
6. Trigger trap round
7. Check trap outcomes
✅ PASS / ❌ FAIL
```

**Custom Mode**:
```
1. Create Custom game
2. Configure settings (rounds, power-ups, etc.)
3. Save configuration
4. Start game
5. Verify custom settings applied
✅ PASS / ❌ FAIL
```

### Test Power-Ups (15 minutes)

For each power-up, verify:
- ✅ Can be selected in lobby
- ✅ Appears in inventory during game
- ✅ Can be activated
- ✅ Visual effect displays
- ✅ Game logic works correctly

**Power-Up Test Matrix**:
```
🛡️ Shield       - ✅ / ❌
✂️ 50/50        - ✅ / ❌
❄️ Freeze       - ✅ / ❌
💥 Double Down  - ✅ / ❌
🎯 Steal        - ✅ / ❌
🔁 Double Pick  - ✅ / ❌
🌀 WHOLE        - ✅ / ❌
🌪️ Sandstorm   - ✅ / ❌
⏳ Time Warp    - ✅ / ❌
```

### Test Authentication (10 minutes)

```
1. Guest Login:
   - Click "Create Battle Room" without login
   - Verify guest account created
   - ✅ PASS / ❌ FAIL

2. Email Registration:
   - Go to /register
   - Create account
   - Verify redirect to home
   - ✅ PASS / ❌ FAIL

3. Email Login:
   - Go to /login
   - Login with created account
   - Verify session persists
   - ✅ PASS / ❌ FAIL

4. Logout:
   - Click logout
   - Verify redirect to home
   - ✅ PASS / ❌ FAIL
```

### Test Mobile (15 minutes)

```
1. Open on mobile device or Chrome DevTools mobile view
2. Test all pages:
   - Home page          ✅ / ❌
   - Lobby page         ✅ / ❌
   - Game page          ✅ / ❌
   - Results page       ✅ / ❌
   - Profile page       ✅ / ❌
   - Stats page         ✅ / ❌
   - Store page         ✅ / ❌
3. Test touch controls:
   - Answer selection   ✅ / ❌
   - Power-up selection ✅ / ❌
   - Chat input         ✅ / ❌
   - Emote buttons      ✅ / ❌
```

### Test Arabic/RTL (5 minutes)

```
1. Switch language to Arabic
2. Verify RTL layout:
   - Text alignment     ✅ / ❌
   - Button positions   ✅ / ❌
   - Navigation flow    ✅ / ❌
3. Verify Arabic text displays correctly
   - Questions          ✅ / ❌
   - UI labels          ✅ / ❌
   - Toasts             ✅ / ❌
```

---

## 🚀 DEPLOYMENT STEPS

### Option 1: Quick Deploy (Vercel + Railway)

**Frontend (Vercel)**:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from web directory
cd apps/web
vercel

# Follow prompts, set environment variables:
# NEXT_PUBLIC_API_URL=https://your-api.railway.app
```

**Backend (Railway)**:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy from api directory
cd apps/api
railway init
railway up

# Set environment variables in Railway dashboard:
# DATABASE_URL, JWT_SECRET, REDIS_URL
```

### Option 2: Docker Deploy

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Option 3: Manual VPS Deploy

```bash
# SSH into server
ssh user@your-server.com

# Clone repository
git clone https://github.com/your-repo/quiz-battle.git
cd quiz-battle

# Install dependencies
npm install

# Build
npm run build

# Set up PM2
npm install -g pm2

# Start API
cd apps/api
pm2 start npm --name "quiz-api" -- start

# Start Web
cd ../web
pm2 start npm --name "quiz-web" -- start

# Save PM2 config
pm2 save
pm2 startup
```

---

## 📊 MONITORING & ANALYTICS

### Add Error Tracking (Sentry)

```bash
# Install Sentry
npm install @sentry/nextjs @sentry/node

# Configure in apps/web/sentry.client.config.js
# Configure in apps/api/src/index.ts
```

### Add Analytics (Plausible)

```typescript
// apps/web/src/app/layout.tsx
<Script
  defer
  data-domain="yourdomain.com"
  src="https://plausible.io/js/script.js"
/>
```

---

## 🎯 POST-LAUNCH PRIORITIES

### Week 1: Stability
- [ ] Monitor error rates
- [ ] Fix critical bugs
- [ ] Optimize performance
- [ ] Add more questions

### Week 2: Polish
- [ ] Improve mobile UX
- [ ] Add tutorial
- [ ] Enhance animations
- [ ] Add more sound effects

### Week 3: Growth
- [ ] Social media marketing
- [ ] Content marketing
- [ ] SEO optimization
- [ ] User feedback collection

### Week 4: Features
- [ ] Friend system
- [ ] Achievements expansion
- [ ] Leaderboard page
- [ ] Tournament mode

---

## 🆘 TROUBLESHOOTING

### Issue: "Cannot find module '@quiz-battle/shared'"
```bash
cd packages/shared
npm run build
cd ../..
npm run build
```

### Issue: "Prisma Client not generated"
```bash
cd packages/db
npx prisma generate
```

### Issue: "Socket connection failed"
- Check API is running on port 4000
- Check NEXT_PUBLIC_API_URL in .env.local
- Check CORS settings in apps/api/src/index.ts

### Issue: "Database locked"
```bash
# Stop all processes
pkill -f "node"

# Restart
npm run dev
```

### Issue: "Build fails"
```bash
# Clean all builds
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

---

## ✅ FINAL CHECKLIST BEFORE LAUNCH

- [ ] All tests passing
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Arabic/RTL working
- [ ] All game modes functional
- [ ] All power-ups working
- [ ] Authentication working
- [ ] Database seeded
- [ ] Environment variables set
- [ ] Production build successful
- [ ] Deployed to production
- [ ] SSL certificate active
- [ ] Monitoring enabled
- [ ] Analytics enabled
- [ ] Backup strategy in place
- [ ] Documentation complete

---

**🎉 YOU'RE READY TO LAUNCH!**

Good luck, warrior! ⚔️

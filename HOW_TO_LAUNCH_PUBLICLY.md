# 🌐 How to Make Quiz Battle Publicly Accessible

## Option 1: Quick Local Network Access (Easiest - 5 minutes)

### Step 1: Find Your Local IP Address
```bash
# Windows
ipconfig

# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

### Step 2: Update Frontend Configuration
Edit `apps/web/.env.local`:
```bash
# Replace localhost with your IP
NEXT_PUBLIC_API_URL=http://192.168.1.100:4000
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.100:4000
```

### Step 3: Update Backend CORS
Edit `apps/api/src/index.ts` - Find the CORS section and update:
```typescript
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://192.168.1.100:3000",  // Add your IP
  "*",  // Allow all (for testing only!)
];
```

### Step 4: Start the Application
```bash
npm run dev
```

### Step 5: Share the Link
Anyone on your **same WiFi network** can access:
```
http://192.168.1.100:3000
```

**Limitations**: Only works on same WiFi network

---

## Option 2: Ngrok Tunnel (Easy - 10 minutes)

### Step 1: Install Ngrok
```bash
# Download from https://ngrok.com/download
# Or use chocolatey:
choco install ngrok
```

### Step 2: Start Your Application
```bash
npm run dev
```

### Step 3: Create Tunnels
Open 2 new terminals:

**Terminal 1 - Frontend Tunnel:**
```bash
ngrok http 3000
```

**Terminal 2 - Backend Tunnel:**
```bash
ngrok http 4000
```

### Step 4: Copy the URLs
Ngrok will show URLs like:
```
Frontend: https://abc123.ngrok.io
Backend: https://xyz789.ngrok.io
```

### Step 5: Update Frontend Config
Edit `apps/web/.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://xyz789.ngrok.io
NEXT_PUBLIC_SOCKET_URL=https://xyz789.ngrok.io
```

### Step 6: Restart Frontend
```bash
cd apps/web
npm run dev
```

### Step 7: Share the Link
Share the frontend URL with anyone:
```
https://abc123.ngrok.io
```

**Limitations**: Free ngrok URLs change every restart, 40 connections/minute limit

---

## Option 3: Cloud Deployment (Best - 30 minutes)

### A. Deploy to Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel:

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Deploy Frontend**
```bash
cd apps/web
vercel --prod
```

**Step 3: Follow Prompts**
- Link to your account
- Set project name: `quiz-battle-web`
- Deploy!

You'll get a URL like: `https://quiz-battle-web.vercel.app`

#### Backend on Railway:

**Step 1: Go to Railway.app**
- Sign up at https://railway.app
- Click "New Project"
- Select "Deploy from GitHub repo"

**Step 2: Connect Repository**
- Connect your GitHub account
- Select quiz-battle repository
- Choose `apps/api` as root directory

**Step 3: Add Environment Variables**
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret
STRIPE_SECRET_KEY=sk_live_...
FRONTEND_URL=https://quiz-battle-web.vercel.app
```

**Step 4: Deploy**
Railway will give you a URL like: `https://quiz-battle-api.up.railway.app`

**Step 5: Update Frontend Environment**
Go to Vercel dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://quiz-battle-api.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://quiz-battle-api.up.railway.app
```

**Step 6: Redeploy Frontend**
```bash
vercel --prod
```

---

### B. Deploy to Single Platform (Render.com)

**Step 1: Create Render Account**
- Go to https://render.com
- Sign up with GitHub

**Step 2: Deploy Backend**
- Click "New +" → "Web Service"
- Connect repository
- Settings:
  - Name: `quiz-battle-api`
  - Root Directory: `apps/api`
  - Build Command: `npm install && npm run build`
  - Start Command: `npm start`
  - Add environment variables

**Step 3: Deploy Frontend**
- Click "New +" → "Static Site"
- Connect repository
- Settings:
  - Name: `quiz-battle-web`
  - Root Directory: `apps/web`
  - Build Command: `npm install && npm run build`
  - Publish Directory: `.next`

**Step 4: Get URLs**
- Backend: `https://quiz-battle-api.onrender.com`
- Frontend: `https://quiz-battle-web.onrender.com`

---

## Option 4: Docker + VPS (Advanced - 1 hour)

### Step 1: Get a VPS
- DigitalOcean Droplet ($5/month)
- AWS EC2 (Free tier)
- Linode ($5/month)

### Step 2: Install Docker
```bash
# On your VPS
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### Step 3: Create Production Docker Compose
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: quizbattle
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

  api:
    build:
      context: .
      dockerfile: infra/docker/api.Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/quizbattle
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis

  web:
    build:
      context: .
      dockerfile: infra/docker/web.Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://${SERVER_IP}:4000
      NEXT_PUBLIC_SOCKET_URL: http://${SERVER_IP}:4000
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

### Step 4: Deploy
```bash
# On your VPS
git clone <your-repo>
cd quiz-battle

# Set environment variables
export DB_PASSWORD=your-secure-password
export JWT_SECRET=your-jwt-secret
export SERVER_IP=your-vps-ip

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### Step 5: Configure Domain (Optional)
- Point your domain to VPS IP
- Install Nginx as reverse proxy
- Get SSL certificate with Let's Encrypt

---

## Option 5: Port Forwarding (Home Network)

### Step 1: Find Your Router IP
```bash
# Windows
ipconfig
# Look for "Default Gateway"
# Usually: 192.168.1.1 or 192.168.0.1
```

### Step 2: Access Router Settings
- Open browser: `http://192.168.1.1`
- Login (check router label for credentials)

### Step 3: Setup Port Forwarding
Find "Port Forwarding" or "Virtual Server" section:

**Rule 1 - Frontend:**
- External Port: 3000
- Internal IP: Your PC IP (192.168.1.100)
- Internal Port: 3000
- Protocol: TCP

**Rule 2 - Backend:**
- External Port: 4000
- Internal IP: Your PC IP (192.168.1.100)
- Internal Port: 4000
- Protocol: TCP

### Step 4: Find Your Public IP
```bash
# Visit
https://whatismyipaddress.com
```

### Step 5: Share Your Public IP
Anyone can access:
```
http://YOUR_PUBLIC_IP:3000
```

**Limitations**: 
- Your PC must stay on
- Security risk (expose your home IP)
- ISP may block ports

---

## 🎯 Recommended Approach by Use Case

### For Testing with Friends (Same WiFi)
→ **Option 1: Local Network** (5 minutes)

### For Quick Demo to Anyone
→ **Option 2: Ngrok** (10 minutes)

### For Production/Real Users
→ **Option 3: Cloud Deployment** (30 minutes)
- Best: Vercel (Frontend) + Railway (Backend)
- Alternative: Render.com (All-in-one)

### For Full Control
→ **Option 4: VPS + Docker** (1 hour)

---

## 📋 Quick Setup Checklist

### Before Making Public:

- [ ] Update CORS to allow your domain
- [ ] Set strong JWT_SECRET
- [ ] Configure Stripe with live keys (if using payments)
- [ ] Set up Sentry for error tracking
- [ ] Test all game modes
- [ ] Test on mobile devices
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Add SSL certificate (HTTPS)

### Security Checklist:

- [ ] Change all default passwords
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up monitoring
- [ ] Regular backups
- [ ] Update dependencies regularly

---

## 🚀 Fastest Way to Launch NOW

### 1-Minute Setup (Local Network):

```bash
# Terminal 1
cd apps/api
npm run dev

# Terminal 2  
cd apps/web
npm run dev

# Share this with friends on same WiFi:
http://YOUR_LOCAL_IP:3000
```

### 10-Minute Setup (Internet Access):

```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 3000

# Terminal 3
ngrok http 4000

# Update .env.local with ngrok URLs
# Restart frontend
# Share ngrok frontend URL with anyone!
```

---

## 💡 Pro Tips

1. **Use Ngrok for Quick Testing**: Perfect for showing to friends/clients
2. **Use Vercel for Production**: Free tier, automatic HTTPS, global CDN
3. **Keep PC Running**: If using local/ngrok, your PC must stay on
4. **Mobile Testing**: Test on actual phones, not just browser dev tools
5. **Monitor Costs**: Cloud services can get expensive with high traffic

---

## 🆘 Common Issues

### "Cannot connect to server"
- Check firewall allows ports 3000 and 4000
- Verify CORS settings include your domain
- Check API is actually running

### "WebSocket connection failed"
- Update NEXT_PUBLIC_SOCKET_URL
- Check Socket.io CORS settings
- Verify backend is accessible

### "Database connection error"
- For cloud: Use cloud database (Railway PostgreSQL, etc.)
- For local: Keep database running

---

## 📞 Need Help?

See:
- `DEPLOYMENT_GUIDE.md` - Full deployment instructions
- `DEPLOYMENT_STATUS.md` - Current deployment status
- `.amazonq/rules/memory-bank/` - Development guidelines

**Quick Start**: Use Ngrok for immediate internet access!

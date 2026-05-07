# 🚀 LAUNCH YOUR GAME PUBLICLY

## ⚡ Quick Start (2 Steps)

### Step 1: Install Ngrok (One-time setup)
1. Go to: https://ngrok.com/download
2. Download `ngrok.exe`
3. Place it in this folder OR add to your system PATH

### Step 2: Launch Publicly
```bash
LAUNCH_PUBLIC.bat
```

That's it! The script will:
- ✅ Start your game servers
- ✅ Create public tunnels
- ✅ Configure everything automatically
- ✅ Give you a URL to share

---

## 📱 What You Get

After running `LAUNCH_PUBLIC.bat`, you'll get a URL like:
```
https://abc123.ngrok.io
```

**Share this URL with ANYONE** and they can:
- Play your game from anywhere in the world
- No installation needed
- Works on phone, tablet, PC
- Real-time multiplayer

---

## ⚠️ Important Notes

1. **Keep the window open** - Closing it stops public access
2. **URL changes** - Each time you restart, you get a new URL
3. **Free tier limits** - Ngrok free has 40 connections/minute
4. **Your PC must stay on** - Game runs on your computer

---

## 🎯 Alternative: Cloud Deployment

For permanent URLs that don't change:

### Option 1: Vercel + Railway (Recommended)
```bash
# Frontend
cd apps/web
vercel --prod

# Backend  
# Deploy to Railway.app via their website
```

### Option 2: All-in-One (Render.com)
1. Go to https://render.com
2. Connect your GitHub
3. Deploy both apps
4. Get permanent URLs

See `HOW_TO_LAUNCH_PUBLICLY.md` for detailed instructions.

---

## 🆘 Troubleshooting

### "Ngrok not found"
- Download from https://ngrok.com/download
- Place ngrok.exe in this folder

### "Cannot connect"
- Check all 4 windows are open
- Wait 30 seconds after launch
- Try the URL again

### "WebSocket error"
- Normal on first load
- Refresh the page
- Should work on second try

---

## 📊 Monitor Your Game

While running, you can:
- View connections: http://localhost:4040
- Check API health: http://localhost:4000/health
- Test locally: http://localhost:3000

---

## 🎮 Ready to Play!

1. Run `LAUNCH_PUBLIC.bat`
2. Wait for the URL
3. Share with friends
4. Start playing!

**Your game will be accessible to anyone in the world!**

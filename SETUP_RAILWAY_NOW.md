# AUTOMATED RAILWAY SETUP

## What I've Done

✅ Changed database from SQLite to PostgreSQL
✅ Created database migration files
✅ Updated Dockerfile to run migrations on startup
✅ Pushed all changes to GitHub

## What Needs to Be Done in Railway Dashboard

### Step 1: Add PostgreSQL Database
1. Go to your Railway project: https://railway.app/project/[your-project-id]
2. Click "+ New" button
3. Select "Database" → "Add PostgreSQL"
4. Railway will automatically:
   - Create the database
   - Generate DATABASE_URL variable
   - Link it to your services

### Step 2: Configure API Service
1. Click on "api" service
2. Go to "Variables" tab
3. Add these variables:
   ```
   DATABASE_URL = ${{Postgres.DATABASE_URL}}
   JWT_SECRET = quiz-battle-secret-2025-change-this
   PORT = 4000
   NODE_ENV = production
   ```
4. Go to "Settings" tab → "Networking"
5. Click "Generate Domain"
6. Copy the generated URL (e.g., https://api-production-xxxx.up.railway.app)

### Step 3: Update Web Service
1. Click on "web" service
2. Go to "Variables" tab
3. Update/Add these variables:
   ```
   NEXT_PUBLIC_API_URL = [paste API URL from step 2]
   NEXT_PUBLIC_SOCKET_URL = [paste API URL from step 2]
   ```

### Step 4: Verify Deployment
1. Wait for all services to redeploy (2-3 minutes)
2. Check API logs - should see "Quiz Battle API running"
3. Open web URL: https://web-production-126d2.up.railway.app
4. Test creating a game

## Expected Result

- ✅ API service starts successfully
- ✅ Database migrations run automatically
- ✅ Web connects to API
- ✅ Full application works

## If API Still Fails

Check the logs for specific errors. Common issues:
- DATABASE_URL not set → Add PostgreSQL database
- Migration errors → Check migration files
- Port binding → Ensure PORT=4000 is set

## Quick Railway CLI Commands (Optional)

If you have Railway CLI installed:
```bash
# Login
railway login

# Link to project
railway link

# Add PostgreSQL
railway add --database postgresql

# Set variables
railway variables set JWT_SECRET=quiz-battle-secret-2025
railway variables set NODE_ENV=production

# Deploy
railway up
```

## Current GitHub Repository
https://github.com/oamersaber2013-cpu/quiz-battle

All code is ready. Just need to configure Railway services as described above.

# Railway Deployment - Complete Setup

## Services Configuration

### 1. PostgreSQL Database
- In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
- Railway will automatically create DATABASE_URL variable
- Copy the DATABASE_URL for reference

### 2. API Service
**Settings:**
- Root Directory: `/`
- Dockerfile Path: `Dockerfile.api`

**Environment Variables:**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-random-secret-key-here
PORT=4000
NODE_ENV=production
FRONTEND_URL=https://web-production-126d2.up.railway.app
REDIS_URL=redis://localhost:6379
```

**Generate Domain:**
- Go to Settings → Networking → Generate Domain
- Copy the API URL (e.g., https://api-production-xxxx.up.railway.app)

### 3. Web Service
**Settings:**
- Root Directory: `/`
- Dockerfile Path: `Dockerfile.web`

**Environment Variables:**
```
NEXT_PUBLIC_API_URL=https://api-production-xxxx.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://api-production-xxxx.up.railway.app
```

**Domain:**
- Already generated: https://web-production-126d2.up.railway.app

### 4. Workers Service (Optional)
Can be disabled for now - not critical for initial deployment.

## Deployment Order

1. ✅ Add PostgreSQL database
2. ✅ Configure API service with DATABASE_URL
3. ✅ Generate API domain
4. ✅ Update Web service with API URLs
5. ✅ Redeploy all services

## Current Status

- Web: https://web-production-126d2.up.railway.app (Online)
- API: Needs PostgreSQL database
- Database: Needs to be added

## Next Steps

1. Add PostgreSQL database in Railway
2. API will auto-deploy and run migrations
3. Generate API domain
4. Update Web environment variables
5. Test the full application

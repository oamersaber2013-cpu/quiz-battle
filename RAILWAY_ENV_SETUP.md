# Railway Environment Variables Setup

## API Service Variables

Click on the "api" service in Railway, go to "Variables" tab, and add these:

### Required Variables:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=quiz-battle-jwt-secret-change-in-production-2025
PORT=4000
NODE_ENV=production
```

### Optional Variables (can add later):
```
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
OPENAI_API_KEY=sk-your_key_here
FRONTEND_URL=https://web-production-126d2.up.railway.app
```

## How to Add Variables in Railway:

1. Click on "api" service
2. Click "Variables" tab
3. Click "New Variable"
4. For DATABASE_URL: 
   - Click "Add Reference"
   - Select "Postgres" → "DATABASE_URL"
5. For REDIS_URL:
   - Click "Add Reference"  
   - Select "Redis" → "REDIS_URL"
6. For other variables:
   - Click "New Variable"
   - Enter name and value
   - Click "Add"

## After Adding Variables:

The API will automatically redeploy. Check logs to verify it starts successfully.

## Generate API Domain:

1. Click on "api" service
2. Go to "Settings" tab
3. Scroll to "Networking" section
4. Click "Generate Domain"
5. Copy the generated URL (e.g., https://api-production-1eb9.up.railway.app)

## Update Web Service:

1. Click on "web" service
2. Go to "Variables" tab
3. Add/Update:
   ```
   NEXT_PUBLIC_API_URL=https://api-production-1eb9.up.railway.app
   NEXT_PUBLIC_SOCKET_URL=https://api-production-1eb9.up.railway.app
   ```

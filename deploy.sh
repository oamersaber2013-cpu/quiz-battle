#!/bin/bash

# Quiz Battle - Production Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting Quiz Battle Deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Environment Check
echo -e "${YELLOW}📋 Step 1: Checking environment...${NC}"
if [ ! -f "apps/api/.env.production" ]; then
    echo -e "${RED}❌ Missing apps/api/.env.production${NC}"
    exit 1
fi
if [ ! -f "apps/web/.env.production" ]; then
    echo -e "${RED}❌ Missing apps/web/.env.production${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Environment files found${NC}"

# Step 2: Install Dependencies
echo -e "${YELLOW}📦 Step 2: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 3: Type Check
echo -e "${YELLOW}🔍 Step 3: Running type checks...${NC}"
npm run typecheck
echo -e "${GREEN}✅ Type checks passed${NC}"

# Step 4: Build Packages
echo -e "${YELLOW}🔨 Step 4: Building packages...${NC}"
npm run build --workspace=@quiz-battle/shared
npm run build --workspace=@quiz-battle/db
echo -e "${GREEN}✅ Packages built${NC}"

# Step 5: Database Migration
echo -e "${YELLOW}🗄️  Step 5: Running database migrations...${NC}"
cd packages/db
npx prisma migrate deploy
npx prisma generate
cd ../..
echo -e "${GREEN}✅ Database migrated${NC}"

# Step 6: Build Applications
echo -e "${YELLOW}🏗️  Step 6: Building applications...${NC}"
npm run build --workspace=apps/api
npm run build --workspace=apps/web
echo -e "${GREEN}✅ Applications built${NC}"

# Step 7: Run Tests
echo -e "${YELLOW}🧪 Step 7: Running tests...${NC}"
npm run test --if-present
echo -e "${GREEN}✅ Tests passed${NC}"

# Step 8: Docker Build
echo -e "${YELLOW}🐳 Step 8: Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build
echo -e "${GREEN}✅ Docker images built${NC}"

# Step 9: Start Services
echo -e "${YELLOW}🚀 Step 9: Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✅ Services started${NC}"

# Step 10: Health Check
echo -e "${YELLOW}🏥 Step 10: Running health checks...${NC}"
sleep 10
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${RED}❌ API health check failed (Status: $API_HEALTH)${NC}"
    exit 1
fi

WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$WEB_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Web is healthy${NC}"
else
    echo -e "${RED}❌ Web health check failed (Status: $WEB_HEALTH)${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo "📊 Service Status:"
echo "  API: http://localhost:4000"
echo "  Web: http://localhost:3000"
echo ""
echo "📝 Next Steps:"
echo "  1. Configure SSL certificates"
echo "  2. Set up CDN (CloudFront/Cloudflare)"
echo "  3. Configure monitoring (Sentry, DataDog)"
echo "  4. Set up log aggregation"
echo "  5. Configure backups"
echo ""
echo "🔍 View logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🛑 Stop services:"
echo "  docker-compose -f docker-compose.prod.yml down"
echo ""

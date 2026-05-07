# 🚀 DEPLOYMENT CHECKLIST - Quiz Battle

## ✅ PRE-DEPLOYMENT (Complete Before Launch)

### 1. Environment Setup
- [ ] Copy `.env.production.template` to `apps/api/.env.production`
- [ ] Copy `.env.production.template` to `apps/web/.env.production`
- [ ] Generate strong JWT secret (min 32 characters)
- [ ] Set PostgreSQL password
- [ ] Set Redis password
- [ ] Add OpenAI API key
- [ ] Add Stripe secret key (live mode)
- [ ] Set NEXT_PUBLIC_API_URL to production domain

### 2. Database
- [ ] PostgreSQL 15 installed and running
- [ ] Database created: `quizbattle`
- [ ] User created with proper permissions
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Seed initial data if needed
- [ ] Set up automated backups (daily)
- [ ] Configure backup retention policy

### 3. Redis
- [ ] Redis 7 installed and running
- [ ] Password authentication enabled
- [ ] Persistence enabled (AOF)
- [ ] Memory limit configured
- [ ] Eviction policy set

### 4. Security
- [ ] SSL/TLS certificates installed
- [ ] HTTPS enforced
- [ ] CORS origins whitelisted
- [ ] Rate limiting configured
- [ ] Helmet security headers enabled
- [ ] Environment variables secured
- [ ] Secrets not in version control
- [ ] Database credentials rotated

### 5. Infrastructure
- [ ] Server provisioned (min 2GB RAM, 2 CPU cores)
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] Fail2ban installed

### 6. Monitoring & Logging
- [ ] Error tracking setup (Sentry recommended)
- [ ] Log aggregation configured
- [ ] Uptime monitoring enabled
- [ ] Performance monitoring active
- [ ] Alerts configured (email/SMS)
- [ ] Dashboard access configured

### 7. CDN & Performance
- [ ] CDN configured (CloudFront/Cloudflare)
- [ ] Static assets cached
- [ ] Gzip/Brotli compression enabled
- [ ] Image optimization enabled
- [ ] DNS configured correctly

### 8. Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Load testing completed
- [ ] Security scan completed
- [ ] Accessibility audit done
- [ ] Cross-browser testing done
- [ ] Mobile testing done

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Build & Test Locally
```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build all packages
npm run build

# Run tests
npm test
```

### Step 2: Database Migration
```bash
cd packages/db
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### Step 3: Docker Build
```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Verify images
docker images | grep quiz-battle
```

### Step 4: Deploy
```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 5: Health Checks
```bash
# API health
curl https://api.yourdomain.com/health

# Web health
curl https://yourdomain.com

# Redis connection
docker exec quiz-battle-redis redis-cli ping

# Database connection
docker exec quiz-battle-postgres pg_isready
```

---

## ✅ POST-DEPLOYMENT (After Launch)

### 1. Smoke Tests
- [ ] Home page loads
- [ ] User can register/login
- [ ] Game creation works
- [ ] Game joining works
- [ ] All game modes playable
- [ ] Socket.io connections stable
- [ ] Payment flow works
- [ ] Profile page accessible

### 2. Monitoring Setup
- [ ] Error tracking active
- [ ] Logs being collected
- [ ] Metrics being recorded
- [ ] Alerts configured
- [ ] Dashboard accessible

### 3. Backup Verification
- [ ] Database backup successful
- [ ] Backup restoration tested
- [ ] Backup schedule confirmed
- [ ] Backup retention verified

### 4. Performance Check
- [ ] Page load time < 2s
- [ ] API response time < 200ms
- [ ] WebSocket latency < 100ms
- [ ] No memory leaks
- [ ] CPU usage normal

### 5. Security Audit
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] No exposed secrets
- [ ] Rate limiting working
- [ ] CORS configured correctly

---

## 🔄 ROLLBACK PLAN

### If Deployment Fails:

1. **Stop new services**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Restore previous version**
   ```bash
   git checkout <previous-tag>
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Restore database backup**
   ```bash
   pg_restore -d quizbattle backup.sql
   ```

4. **Verify rollback**
   - Check all services running
   - Test critical flows
   - Monitor error rates

---

## 📊 MONITORING CHECKLIST

### Daily
- [ ] Check error rates
- [ ] Review slow queries
- [ ] Check disk space
- [ ] Review user feedback

### Weekly
- [ ] Review performance metrics
- [ ] Check backup integrity
- [ ] Update dependencies
- [ ] Security scan

### Monthly
- [ ] Full system audit
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Cost optimization review

---

## 🆘 TROUBLESHOOTING

### API Not Responding
```bash
# Check logs
docker logs quiz-battle-api

# Restart service
docker-compose -f docker-compose.prod.yml restart api

# Check database connection
docker exec quiz-battle-api node -e "console.log(process.env.DATABASE_URL)"
```

### Database Connection Issues
```bash
# Check PostgreSQL status
docker exec quiz-battle-postgres pg_isready

# Check connections
docker exec quiz-battle-postgres psql -U quizuser -d quizbattle -c "SELECT count(*) FROM pg_stat_activity;"

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

### Redis Connection Issues
```bash
# Check Redis status
docker exec quiz-battle-redis redis-cli ping

# Check memory usage
docker exec quiz-battle-redis redis-cli info memory

# Restart Redis
docker-compose -f docker-compose.prod.yml restart redis
```

### High Memory Usage
```bash
# Check container stats
docker stats

# Restart specific service
docker-compose -f docker-compose.prod.yml restart <service>

# Scale down if needed
docker-compose -f docker-compose.prod.yml scale api=1
```

---

## 📞 SUPPORT CONTACTS

- **DevOps Lead**: [email]
- **Backend Lead**: [email]
- **Frontend Lead**: [email]
- **Database Admin**: [email]
- **Security Team**: [email]

---

## 📝 DEPLOYMENT LOG

| Date | Version | Deployed By | Status | Notes |
|------|---------|-------------|--------|-------|
| YYYY-MM-DD | v1.0.0 | Name | ✅ Success | Initial deployment |
| | | | | |

---

## ✅ FINAL CHECKLIST

Before marking deployment as complete:

- [ ] All services running
- [ ] Health checks passing
- [ ] Monitoring active
- [ ] Backups configured
- [ ] SSL working
- [ ] DNS configured
- [ ] CDN active
- [ ] Error tracking enabled
- [ ] Team notified
- [ ] Documentation updated
- [ ] Rollback plan tested
- [ ] Support team briefed

---

**Status**: 🟢 READY FOR PRODUCTION

**Confidence Level**: HIGH

**Recommendation**: DEPLOY! 🚀

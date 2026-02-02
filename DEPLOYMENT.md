# Deployment Guide

Complete guide for deploying Xmarket to production.

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database created and migrated
- [ ] Platform wallet set up and funded
- [ ] X API credentials obtained
- [ ] Polymarket API access configured
- [ ] Domain name purchased (optional)
- [ ] SSL certificates ready

## Architecture Overview

```
Production Setup:
┌─────────────────────┐
│   Vercel (Web App)  │ → Next.js frontend
└─────────────────────┘
           ↓
┌─────────────────────┐
│ Railway/Render      │ → Bot service
│ (Background Worker) │
└─────────────────────┘
           ↓
┌─────────────────────┐
│ PostgreSQL Database │ → Supabase/Railway
└─────────────────────┘
```

## 1. Database Setup

### Option A: Supabase (Recommended)

1. Create account at https://supabase.com
2. Create new project
3. Copy database connection string
4. Update `.env`:
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
```

5. Run migrations:
```bash
npm run db:push
```

### Option B: Railway

1. Create account at https://railway.app
2. Create new PostgreSQL database
3. Copy connection string
4. Follow same steps as Supabase

## 2. Web App Deployment (Vercel)

### Setup

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Configure:
   - Framework: Next.js
   - Root Directory: `apps/web`
   - Build Command: `cd ../.. && npm run build --filter=@xmarket/web`
   - Output Directory: `apps/web/.next`

### Environment Variables

Add in Vercel dashboard:

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-here"

# X OAuth
NEXT_PUBLIC_X_CLIENT_ID="your-client-id"
X_CLIENT_SECRET="your-client-secret"

# Platform Wallet (public address only)
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS="0x..."

# Polygon
NEXT_PUBLIC_POLYGON_RPC_URL="https://polygon-rpc.com"
NEXT_PUBLIC_CHAIN_ID="137"
```

### Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit your deployment URL
4. Test sign in and wallet connection

## 3. Bot Service Deployment

### Option A: Railway (Recommended)

1. Go to https://railway.app
2. Create new project
3. Add service from GitHub repo
4. Configure:
   - Root Directory: `apps/bot`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Watch Paths: `apps/bot/**`

5. Add environment variables:

```bash
# Database
DATABASE_URL="postgresql://..."

# X API
X_API_KEY="..."
X_API_SECRET="..."
X_ACCESS_TOKEN="..."
X_ACCESS_TOKEN_SECRET="..."
X_BEARER_TOKEN="..."
X_BOT_USER_ID="..."

# Polymarket
POLYMARKET_PRIVATE_KEY="0x..."
POLYMARKET_API_KEY="..."
POLYMARKET_API_SECRET="..."
POLYMARKET_API_PASSPHRASE="..."

# Platform Wallet (KEEP SECRET!)
PLATFORM_WALLET_PRIVATE_KEY="0x..."
PLATFORM_WALLET_ADDRESS="0x..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Polygon
POLYGON_RPC_URL="https://polygon-rpc.com"

# Environment
NODE_ENV="production"
```

6. Deploy and monitor logs

### Option B: Render

1. Go to https://render.com
2. Create new Web Service
3. Connect GitHub repo
4. Configure:
   - Environment: Node
   - Build Command: `cd apps/bot && npm install && npm run build`
   - Start Command: `cd apps/bot && npm start`

5. Add environment variables (same as Railway)
6. Deploy

### Option C: Self-Hosted VPS

1. Rent VPS (DigitalOcean, Linode, etc.)
2. SSH into server:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/yourusername/xmarket.git
cd xmarket

# Install dependencies
npm install

# Build
npm run build

# Set up environment variables
cp .env.example .env
nano .env  # Edit with your values

# Run with PM2
npm install -g pm2
pm2 start apps/bot/dist/index.js --name xmarket-bot
pm2 save
pm2 startup
```

## 4. Monitoring & Logs

### Vercel Logs

- View in Vercel dashboard
- Real-time streaming available
- Filter by severity

### Railway/Render Logs

- Built-in log viewer
- Can export to external services

### Error Tracking

**Set up Sentry:**

1. Create account at https://sentry.io
2. Create new project
3. Install SDK:

```bash
npm install @sentry/node @sentry/nextjs
```

4. Configure in bot:

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## 5. Domain Setup (Optional)

### Custom Domain for Web App

1. In Vercel:
   - Go to Settings > Domains
   - Add your domain
   - Update DNS records as instructed

2. Update environment:
```bash
NEXTAUTH_URL="https://yourdomain.com"
```

## 6. Security Hardening

### Rate Limiting

Add to web API routes:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use('/api/', limiter);
```

### CORS Configuration

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
        ],
      },
    ];
  },
};
```

### Environment Secrets

- Never commit `.env` files
- Use secrets managers in production
- Rotate keys regularly
- Monitor for leaked secrets

## 7. Scaling Considerations

### Database

- Monitor query performance
- Add indexes as needed
- Consider read replicas for high traffic
- Set up automated backups

### Bot Service

- Can run multiple instances
- Use Redis for distributed locks
- Implement queue for withdrawals
- Monitor API rate limits

### Web App

- Vercel handles auto-scaling
- Add CDN for static assets
- Implement caching strategies

## 8. Backup & Disaster Recovery

### Database Backups

```bash
# Automated daily backups
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to S3 or similar
aws s3 cp backup-*.sql s3://your-bucket/backups/
```

### Wallet Backup

- Store private key in multiple secure locations
- Test recovery process
- Document access procedures

### Code Backups

- Use GitHub/GitLab
- Tag releases
- Maintain changelog

## 9. Post-Deployment Testing

### Smoke Tests

1. **Web App:**
   - [ ] Landing page loads
   - [ ] Sign in with X works
   - [ ] Wallet connection works
   - [ ] Dashboard displays correctly

2. **Bot Service:**
   - [ ] Bot responds to mentions
   - [ ] Find command works
   - [ ] Balance command works
   - [ ] Deposits are detected

3. **Wallet:**
   - [ ] Test deposit (small amount)
   - [ ] Test withdrawal (small amount)
   - [ ] Verify blockchain confirmations

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Create test script
artillery quick --count 10 --num 50 https://your-domain.com/api/user

# Monitor response times and errors
```

## 10. Monitoring Checklist

Set up alerts for:

- [ ] Bot service downtime
- [ ] Database connection errors
- [ ] X API rate limit exceeded
- [ ] Platform wallet balance low
- [ ] Gas (MATIC) balance low
- [ ] Failed transactions
- [ ] High error rates
- [ ] Slow response times

## Support & Maintenance

### Regular Tasks

**Daily:**
- Check bot logs
- Verify deposits processed
- Monitor wallet balance

**Weekly:**
- Review error rates
- Check database performance
- Audit user activity

**Monthly:**
- Security audit
- Dependency updates
- Backup verification
- Cost optimization

### Incident Response

1. Monitor alerts
2. Check logs immediately
3. Rollback if necessary
4. Communicate with users
5. Document incident
6. Implement fixes
7. Post-mortem review

## Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Vercel (Hobby) | $0 - $20 |
| Railway/Render | $5 - $50 |
| Database (Supabase) | $0 - $25 |
| X API Basic | $100 |
| Domain | $1 - $2 |
| OpenAI API | $10 - $50 |
| **Total** | **$116 - $247** |

## Troubleshooting

### Common Issues

**Build fails on Vercel:**
- Check build logs
- Verify dependencies
- Test build locally

**Bot not responding:**
- Check Railway/Render logs
- Verify X API credentials
- Check rate limits

**Deposits not detected:**
- Verify wallet service is running
- Check user's wallet is linked
- Verify transaction on Polygonscan

**Database connection errors:**
- Check DATABASE_URL is correct
- Verify IP whitelist (if any)
- Check connection limits

## Going Live Checklist

Final checks before launch:

- [ ] All tests passing
- [ ] Production database migrated
- [ ] Environment variables set
- [ ] Platform wallet funded
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Error tracking enabled
- [ ] Rate limiting implemented
- [ ] Security audit completed
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Support email configured
- [ ] Team trained on operations
- [ ] Incident response plan documented

## Next Steps

After successful deployment:

1. Soft launch with limited users
2. Monitor closely for issues
3. Gather feedback
4. Iterate and improve
5. Scale marketing efforts

Good luck! 🚀

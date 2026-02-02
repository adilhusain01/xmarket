# Quick Start Guide

Get Xmarket up and running in 15 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- X/Twitter Developer account
- Basic knowledge of terminal/command line

## Step 1: Clone and Install (2 min)

```bash
# Navigate to project directory
cd /Users/adilhusain/Downloads/Xmarket

# Install dependencies
npm install

# This will install all packages for the monorepo
```

## Step 2: Database Setup (3 min)

### Option A: Local PostgreSQL

```bash
# Create database
createdb xmarket

# Set connection string
echo 'DATABASE_URL="postgresql://localhost:5432/xmarket"' > .env
```

### Option B: Supabase (Free)

1. Go to https://supabase.com/dashboard
2. Create new project
3. Copy connection string from Settings > Database
4. Add to `.env`:

```bash
echo 'DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"' > .env
```

### Initialize Database

```bash
# Push schema to database
npm run db:push

# Generate Prisma client
npm run db:generate
```

## Step 3: X API Setup (5 min)

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create an app (or use existing)
3. Generate tokens and keys

Add to `.env`:

```bash
X_API_KEY="your_api_key"
X_API_SECRET="your_api_secret"
X_ACCESS_TOKEN="your_access_token"
X_ACCESS_TOKEN_SECRET="your_access_token_secret"
X_BEARER_TOKEN="your_bearer_token"
X_BOT_USER_ID="your_bot_numeric_id"

# For web app OAuth
NEXT_PUBLIC_X_CLIENT_ID="your_oauth_client_id"
X_CLIENT_SECRET="your_oauth_client_secret"
```

**Get your bot's user ID:**
- Go to https://tweeterid.com/
- Enter your bot's username (e.g., @XmarketBot)
- Copy the numeric ID

## Step 4: Create Platform Wallet (2 min)

```bash
# Run wallet generator
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address, '\nPrivate Key:', w.privateKey);"
```

Add to `.env`:

```bash
PLATFORM_WALLET_PRIVATE_KEY="0x..."
PLATFORM_WALLET_ADDRESS="0x..."
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS="0x..."

# Polygon RPC
POLYGON_RPC_URL="https://polygon-rpc.com"
```

**Fund the wallet:**
- Get some MATIC (for gas): https://wallet.polygon.technology/
- Get some USDC (for testing): Bridge or buy on exchange

## Step 5: Configure NextAuth (1 min)

```bash
# Generate secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to `.env`:

```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_generated_secret"
```

## Step 6: Optional - OpenAI (1 min)

For semantic market search (optional):

```bash
OPENAI_API_KEY="sk-..."
```

Skip this if you don't have an OpenAI key. The bot will still work with keyword matching.

## Step 7: Start the App (1 min)

### Development Mode

```bash
# Start all apps (web + bot)
npm run dev
```

This will start:
- Web app at http://localhost:3000
- Bot service (running in background)

### Or run individually:

```bash
# Terminal 1 - Web app
cd apps/web
npm run dev

# Terminal 2 - Bot
cd apps/bot
npm run dev
```

## Testing (Verify Everything Works)

### Test Web App

1. Open http://localhost:3000
2. Click "Sign In with X"
3. Authorize the app
4. You should see the dashboard

### Test Bot

1. Tweet at your bot:
   ```
   @YourBotHandle balance
   ```

2. The bot should reply with your balance

3. Try finding markets:
   ```
   @YourBotHandle find bitcoin
   ```

### Test Deposits (Optional)

1. Send USDC from your linked wallet to platform wallet
2. Wait ~1 minute
3. Check bot logs - should see deposit detected
4. Refresh dashboard - balance should update

## Common Issues

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready

# Or restart it
brew services restart postgresql  # macOS
sudo systemctl restart postgresql  # Linux
```

### "X API authentication failed"
- Double-check all X API credentials
- Ensure no extra spaces in `.env`
- Verify bearer token is valid

### "Bot not responding"
- Check bot service is running
- Verify X_BOT_USER_ID is correct (numeric ID, not @handle)
- Check you're mentioning the correct bot account

### "Module not found"
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### "Prisma Client not generated"
```bash
npm run db:generate
```

## Your `.env` File Should Look Like This

```bash
# Database
DATABASE_URL="postgresql://localhost:5432/xmarket"

# X/Twitter API
X_API_KEY="..."
X_API_SECRET="..."
X_ACCESS_TOKEN="..."
X_ACCESS_TOKEN_SECRET="..."
X_BEARER_TOKEN="..."
X_BOT_USER_ID="..."

# X OAuth (Web)
NEXT_PUBLIC_X_CLIENT_ID="..."
X_CLIENT_SECRET="..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Platform Wallet
PLATFORM_WALLET_PRIVATE_KEY="0x..."
PLATFORM_WALLET_ADDRESS="0x..."
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS="0x..."

# Polygon
POLYGON_RPC_URL="https://polygon-rpc.com"
NEXT_PUBLIC_CHAIN_ID="137"

# Optional
OPENAI_API_KEY="sk-..."

# Polymarket (for real trades - optional for testing)
POLYMARKET_PRIVATE_KEY="0x..."
POLYMARKET_API_KEY="..."
POLYMARKET_API_SECRET="..."
POLYMARKET_API_PASSPHRASE="..."
```

## Next Steps

1. **Customize the Bot**
   - Update bot name and branding
   - Adjust command patterns in `packages/shared/src/constants.ts`
   - Add new commands in `apps/bot/src/commands/`

2. **Integrate Real Trading**
   - Get Polymarket API credentials
   - Test with small amounts first
   - Monitor trades closely

3. **Deploy to Production**
   - Follow [DEPLOYMENT.md](./DEPLOYMENT.md)
   - Set up monitoring
   - Configure backups

4. **Launch**
   - Soft launch with limited users
   - Gather feedback
   - Iterate and improve

## Useful Commands

```bash
# Development
npm run dev              # Start all apps
npm run build           # Build all apps
npm run lint            # Lint code

# Database
npm run db:push         # Push schema changes
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Create migration
npm run db:studio       # Open Prisma Studio (GUI)

# Individual apps
cd apps/web && npm run dev     # Web only
cd apps/bot && npm run dev     # Bot only
```

## Need Help?

- Check the logs in terminal
- Read [SETUP.md](./SETUP.md) for detailed configuration
- Review [README.md](./README.md) for project overview
- Open an issue on GitHub

## Production Readiness

Before going live, complete:

- [ ] Read [WALLET_SETUP.md](./WALLET_SETUP.md)
- [ ] Read [DEPLOYMENT.md](./DEPLOYMENT.md)
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Review Terms of Service
- [ ] Test with real money (small amounts)
- [ ] Set up customer support

---

**You're all set!** 🎉

Tweet at your bot and start betting on Polymarket markets!

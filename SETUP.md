# Setup Guide

## Environment Variables

### Database
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/xmarket?schema=public"
```

### X/Twitter API

1. Go to [developer.twitter.com](https://developer.twitter.com/)
2. Create a new app or use existing
3. Get your credentials:

```bash
X_API_KEY="your_api_key"
X_API_SECRET="your_api_secret"
X_ACCESS_TOKEN="your_access_token"
X_ACCESS_TOKEN_SECRET="your_access_token_secret"
X_BEARER_TOKEN="your_bearer_token"
X_BOT_USER_ID="your_bot_user_id"
```

### X OAuth (Web App)

For user login on the web platform:

```bash
NEXT_PUBLIC_X_CLIENT_ID="your_oauth_client_id"
X_CLIENT_SECRET="your_oauth_client_secret"
```

### Polymarket

Contact Polymarket or use test credentials:

```bash
POLYMARKET_PRIVATE_KEY="your_ethereum_private_key"
POLYMARKET_API_KEY="your_api_key"
POLYMARKET_API_SECRET="your_api_secret"
POLYMARKET_API_PASSPHRASE="your_passphrase"
```

### OpenAI

For semantic market search:

```bash
OPENAI_API_KEY="sk-..."
```

### Platform Wallet

Create a new Ethereum wallet for the platform:

```bash
PLATFORM_WALLET_PRIVATE_KEY="0x..."
PLATFORM_WALLET_ADDRESS="0x..."
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS="0x..."
```

**Important**: Keep the private key secure! Never commit it to version control.

### NextAuth

Generate a random secret:

```bash
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_random_secret"
```

Generate secret:
```bash
openssl rand -base64 32
```

### Polygon

```bash
NEXT_PUBLIC_POLYGON_RPC_URL="https://polygon-rpc.com"
NEXT_PUBLIC_CHAIN_ID="137"
```

## Database Setup

### Local PostgreSQL

1. Install PostgreSQL:
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu
sudo apt install postgresql
sudo systemctl start postgresql
```

2. Create database:
```bash
createdb xmarket
```

3. Update DATABASE_URL in .env

4. Push schema:
```bash
npm run db:push
```

### Cloud Database (Railway/Supabase)

1. Create a new PostgreSQL database
2. Copy the connection string
3. Update DATABASE_URL in .env
4. Run migrations:
```bash
npm run db:push
```

## X API Setup

### Getting Basic Tier Access

1. Go to [developer.twitter.com/en/portal/products/basic](https://developer.twitter.com/en/portal/products/basic)
2. Subscribe to Basic tier ($100/month)
3. Create a new app or upgrade existing
4. Generate tokens and keys
5. Get your bot's user ID:
   - Go to your bot's profile
   - Use [tweeterid.com](https://tweeterid.com/) to get the numeric ID

### Testing the Bot

```bash
cd apps/bot
npm run dev
```

Tweet at your bot to test commands!

## Polymarket Setup

### Getting API Access

Polymarket CLOB API requires:
1. Ethereum wallet with USDC on Polygon
2. API credentials (contact Polymarket or use SDK)

For testing, the bot uses mock data until you configure real credentials.

## Deployment

### Web App (Vercel)

1. Connect your GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Bot Service (Railway/Render)

1. Create a new service
2. Connect your GitHub repo
3. Set build command: `cd apps/bot && npm run build`
4. Set start command: `cd apps/bot && npm start`
5. Add environment variables
6. Deploy

## Troubleshooting

### "Error: P1001: Can't reach database server"
- Check your DATABASE_URL
- Ensure PostgreSQL is running
- Check firewall/security groups

### "Error: Invalid credentials" (X API)
- Verify all X API credentials are correct
- Ensure you have Basic tier access
- Check that tokens haven't expired

### "Bot not responding to mentions"
- Verify X_BOT_USER_ID is correct
- Check bot logs for errors
- Ensure X API rate limits aren't exceeded

### "Trade execution failed"
- Check Polymarket credentials
- Verify wallet has USDC balance
- Check Polygon RPC connection

## Next Steps

1. Test all bot commands
2. Set up monitoring (Sentry, LogRocket)
3. Configure rate limiting
4. Set up backup/restore for database
5. Create admin dashboard
6. Launch beta with limited users

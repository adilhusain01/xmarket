# Xmarket - Polymarket Betting on X/Twitter

Bet on Polymarket prediction markets directly from X/Twitter through simple mention commands.

## Project Structure

This is a Turborepo monorepo with the following structure:

```
xmarket/
├── apps/
│   ├── web/          # Next.js frontend (registration, wallet, dashboard)
│   └── bot/          # X bot service (mention listener, command handler)
├── packages/
│   ├── db/           # Prisma schema + database client
│   └── shared/       # Shared types, constants, and utilities
```

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, RainbowKit, wagmi
- **Backend**: Node.js, TypeScript, twitter-api-v2
- **Database**: PostgreSQL + Prisma ORM
- **Blockchain**: Polygon (USDC), ethers.js
- **APIs**: Polymarket Gamma + CLOB, OpenAI (semantic search)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- X/Twitter Developer Account (Basic tier)
- Polymarket API credentials
- OpenAI API key (optional, for semantic search)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd xmarket
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Fill in your credentials
```

4. Set up the database:
```bash
npm run db:push
```

5. Generate Prisma client:
```bash
npm run db:generate
```

### Development

Run all apps in development mode:
```bash
npm run dev
```

Run specific app:
```bash
# Web app only
cd apps/web && npm run dev

# Bot only
cd apps/bot && npm run dev
```

Build all apps:
```bash
npm run build
```

## How It Works

1. **User Registration**: Users visit xmarket.xyz, connect their wallet, and link their X account
2. **Deposit**: Users deposit USDC on Polygon to their Xmarket account
3. **Discovery**: Users tweet `@XmarketBot find [topic]` to search markets
4. **Betting**: Users reply `@XmarketBot bet [amount] yes/no` to place bets
5. **Execution**: Bot executes trade on Polymarket and replies with confirmation

## Bot Commands

| Command | Example | Description |
|---------|---------|-------------|
| `find [query]` | `@XmarketBot find bitcoin 100k` | Search markets |
| `bet [amount] [side]` | `@XmarketBot bet 10 yes` | Place bet |
| `balance` | `@XmarketBot balance` | Check balance |

## Database Schema

- **users**: User accounts with X ID, wallet, and balance
- **bets**: Bet history with market details and status
- **transactions**: Deposit/withdrawal/bet transactions
- **user_contexts**: Last shown markets for context-aware betting

## Architecture

### Custodial Wallet Model
- Platform holds master wallet with user balances in database
- Single signing key for all trades (secure environment variable)
- Clear ToS explaining custodial nature

### Market Matching
- Gamma API for fetching active markets
- Keyword matching + semantic search (OpenAI embeddings)
- Volume/liquidity weighting for relevance

### Trade Execution
- CLOB API for order placement
- Real-time price discovery
- Confirmation via X reply

## API Costs

- X API Basic: $100/month (10K reads, 50K writes)
- Polymarket API: Free
- OpenAI: ~$10-50/month (embeddings)
- Server: ~$20-50/month
- Database: ~$20/month
- **Total: ~$150-220/month**

## Security Considerations

- Platform wallet private key stored in secure environment
- Hot wallet for active trading, cold wallet for reserves
- Rate limiting on bot commands
- Balance validation before trade execution
- Clear ToS about custodial model

## Future Enhancements

- [ ] Position tracking and management
- [ ] Sell/close position commands
- [ ] DM notifications for market resolution
- [ ] Referral system
- [ ] Non-custodial smart wallet option
- [ ] Multi-language support

## License

MIT

## Support

For issues or questions, visit [xmarket.xyz](https://xmarket.xyz) or open an issue on GitHub.

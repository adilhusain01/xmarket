import 'dotenv/config';
import { TwitterBot } from './x-client.js';
import { CommandHandler } from './commands/handler.js';
import { WalletService } from './services/wallet-service.js';

async function main() {
  console.log('🤖 Starting Xmarket Bot...\n');

  // Validate environment variables
  const requiredEnvVars = [
    'X_API_KEY',
    'X_API_SECRET',
    'X_ACCESS_TOKEN',
    'X_ACCESS_TOKEN_SECRET',
    'X_BOT_USER_ID',
    'DATABASE_URL',
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Initialize services
  const bot = new TwitterBot({
    appKey: process.env.X_API_KEY!,
    appSecret: process.env.X_API_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
  });

  const commandHandler = new CommandHandler();

  // Initialize wallet service if configured
  let walletService: WalletService | null = null;
  if (process.env.PLATFORM_WALLET_PRIVATE_KEY) {
    walletService = new WalletService();
    await walletService.startMonitoring();

    // Log platform balance
    const balance = await walletService.getPlatformBalance();
    const userBalances = await walletService.getTotalUserBalances();
    console.log(`\n💰 Platform wallet balance: ${balance.toFixed(2)} USDC`);
    console.log(`👥 Total user balances: ${userBalances.toFixed(2)} USDC`);
    console.log(`📊 Reserve: ${(balance - userBalances).toFixed(2)} USDC\n`);
  }

  console.log('✅ Bot initialized successfully');
  console.log('👂 Listening for mentions...\n');

  // Start polling for mentions
  await bot.pollMentions(async (tweet) => {
    console.log(`\n📨 New mention from @${tweet.author?.username}: ${tweet.text}`);
    await commandHandler.handle(tweet, bot);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

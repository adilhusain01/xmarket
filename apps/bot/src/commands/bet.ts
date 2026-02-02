import {
  ParsedCommand,
  validateBetAmount,
  MIN_BET_AMOUNT,
  MAX_BET_AMOUNT,
  formatUsdc,
  BET_STATUS,
  TRANSACTION_TYPE,
  calculateShares,
} from '@xmarket/shared';
import { User, prisma } from '@xmarket/db';
import { TwitterBot, TweetWithAuthor } from '../x-client.js';
import { TradeExecutor } from '../polymarket/trade-executor.js';

const tradeExecutor = new TradeExecutor();

export async function handleBetCommand(
  tweet: TweetWithAuthor,
  command: ParsedCommand,
  user: User,
  bot: TwitterBot
): Promise<void> {
  if (!command.amount || !command.side) {
    await bot.reply(
      tweet.id,
      '❓ Invalid bet command. Example: bet 5 yes or bet 10 USDC no'
    );
    return;
  }

  // Validate amount
  const validation = validateBetAmount(command.amount, MIN_BET_AMOUNT, MAX_BET_AMOUNT);
  if (!validation.valid) {
    await bot.reply(tweet.id, `❌ ${validation.error}`);
    return;
  }

  // Check balance
  if (user.balanceUsdc.toNumber() < command.amount) {
    await bot.reply(
      tweet.id,
      `❌ Insufficient balance. You have ${formatUsdc(user.balanceUsdc.toNumber())}. Deposit at xmarket.xyz`
    );
    return;
  }

  // Get market - either from marketId or last shown markets
  let marketId: string;
  let marketTitle: string;
  let price: number;

  if (command.marketId) {
    // TODO: Fetch market by short ID
    await bot.reply(tweet.id, '❌ Betting on specific market IDs coming soon. Use the last shown market for now.');
    return;
  } else {
    // Get last shown markets
    const context = await prisma.userContext.findUnique({
      where: { xUserId: user.xUserId },
    });

    if (!context || !context.lastMarkets) {
      await bot.reply(
        tweet.id,
        '❌ No recent markets found. Use "find [topic]" to search for markets first.'
      );
      return;
    }

    const markets = context.lastMarkets as any[];
    const lastMarket = markets[0];
    marketId = lastMarket.id;
    marketTitle = lastMarket.question;
    price = command.side === 'yes' ? lastMarket.yesPrice : lastMarket.noPrice;
  }

  console.log(`💰 Placing bet: ${command.amount} USDC on ${command.side} for market ${marketId}`);

  // Create pending bet record
  const bet = await prisma.bet.create({
    data: {
      userId: user.id,
      marketId,
      marketTitle,
      side: command.side,
      amountUsdc: command.amount,
      price,
      shares: calculateShares(command.amount, price),
      tweetId: tweet.id,
      status: BET_STATUS.PENDING,
    },
  });

  try {
    // Execute trade
    const result = await tradeExecutor.placeBet({
      userId: user.id,
      marketId,
      side: command.side,
      amount: command.amount,
      tweetId: tweet.id,
    });

    if (!result.success) {
      // Update bet status to failed
      await prisma.bet.update({
        where: { id: bet.id },
        data: { status: BET_STATUS.FAILED },
      });

      await bot.reply(tweet.id, `❌ Failed to place bet: ${result.error || 'Unknown error'}`);
      return;
    }

    // Update bet with order details
    await prisma.bet.update({
      where: { id: bet.id },
      data: {
        orderId: result.orderId,
        shares: result.shares,
        price: result.price,
        status: BET_STATUS.FILLED,
      },
    });

    // Deduct from user balance
    await prisma.user.update({
      where: { id: user.id },
      data: {
        balanceUsdc: {
          decrement: command.amount,
        },
      },
    });

    // Record transaction
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: TRANSACTION_TYPE.BET,
        amountUsdc: -command.amount,
        metadata: {
          betId: bet.id,
          marketId,
          side: command.side,
        },
      },
    });

    const newBalance = user.balanceUsdc.toNumber() - command.amount;
    const shares = result.shares || calculateShares(command.amount, price);

    await bot.reply(
      tweet.id,
      `✅ Bet placed! ${formatUsdc(command.amount)} on ${command.side.toUpperCase()} @ ${formatUsdc(price)}

📈 Shares: ${shares.toFixed(2)}
💰 Balance: ${formatUsdc(newBalance)}

Good luck! 🍀`
    );
  } catch (error) {
    console.error('Error executing bet:', error);

    // Update bet status to failed
    await prisma.bet.update({
      where: { id: bet.id },
      data: { status: BET_STATUS.FAILED },
    });

    await bot.reply(
      tweet.id,
      '❌ Failed to execute bet. Please try again or contact support at xmarket.xyz'
    );
  }
}

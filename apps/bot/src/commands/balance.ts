import { formatUsdc, BET_STATUS } from '@xmarket/shared';
import { User, prisma } from '@xmarket/db';
import { TwitterBot, TweetWithAuthor } from '../x-client.js';

export async function handleBalanceCommand(
  tweet: TweetWithAuthor,
  user: User,
  bot: TwitterBot
): Promise<void> {
  // Get pending bets
  const pendingBets = await prisma.bet.findMany({
    where: {
      userId: user.id,
      status: BET_STATUS.PENDING,
    },
  });

  const pendingAmount = pendingBets.reduce(
    (sum, bet) => sum + bet.amountUsdc.toNumber(),
    0
  );

  // Get active positions
  const activeBets = await prisma.bet.count({
    where: {
      userId: user.id,
      status: BET_STATUS.FILLED,
    },
  });

  let response = `💰 Balance: ${formatUsdc(user.balanceUsdc.toNumber())}\n`;

  if (pendingAmount > 0) {
    response += `⏳ Pending: ${formatUsdc(pendingAmount)}\n`;
  }

  if (activeBets > 0) {
    response += `📊 Active positions: ${activeBets}\n`;
  }

  response += `\n💳 Deposit or withdraw at xmarket.xyz`;

  await bot.reply(tweet.id, response);
}

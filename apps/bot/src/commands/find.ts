import { ParsedCommand, formatUsdc, formatLargeNumber, generateShortId } from '@xmarket/shared';
import { User, prisma } from '@xmarket/db';
import { TwitterBot, TweetWithAuthor } from '../x-client.js';
import { MarketMatcher } from '../polymarket/market-matcher.js';

const marketMatcher = new MarketMatcher();

export async function handleFindCommand(
  tweet: TweetWithAuthor,
  command: ParsedCommand,
  user: User,
  bot: TwitterBot
): Promise<void> {
  if (!command.query) {
    await bot.reply(tweet.id, '❓ Please provide a search query. Example: find Trump 2028');
    return;
  }

  console.log(`🔍 Searching markets for: "${command.query}"`);

  const results = await marketMatcher.findMarkets(command.query);

  if (results.length === 0) {
    await bot.reply(
      tweet.id,
      `❌ No markets found for "${command.query}". Try different keywords or check polymarket.com`
    );
    return;
  }

  // Store last shown markets for context-aware betting
  if (!user.xUserId) {
    console.warn('User has no xUserId, skipping context storage');
  } else {
    await prisma.userContext.upsert({
      where: { xUserId: user.xUserId },
      create: {
        xUserId: user.xUserId,
        lastMarkets: results.slice(0, 3).map((r) => ({
          id: r.market.id,
          question: r.market.question,
          yesPrice: r.market.outcomePrices[0],
          noPrice: r.market.outcomePrices[1],
        })),
      },
      update: {
        lastMarkets: results.slice(0, 3).map((r) => ({
          id: r.market.id,
          question: r.market.question,
          yesPrice: r.market.outcomePrices[0],
          noPrice: r.market.outcomePrices[1],
        })),
      },
    });
  }

  // Format response
  const topMarket = results[0].market;
  const yesPrice = formatUsdc(topMarket.outcomePrices[0]);
  const noPrice = formatUsdc(topMarket.outcomePrices[1]);
  const volume = topMarket.volume ? formatLargeNumber(topMarket.volume) : 'N/A';
  const shortId = generateShortId(topMarket.id);

  let response = `📊 "${topMarket.question}"\n\n`;
  response += `Yes: ${yesPrice} | No: ${noPrice}\n`;
  response += `Volume: ${volume} | ID: #${shortId}\n\n`;
  response += `💡 Reply "bet [amount] yes" or "bet [amount] no" to place a bet`;

  if (results.length > 1) {
    response += `\n\n📋 Found ${results.length} markets. Showing top match.`;
  }

  await bot.reply(tweet.id, response);
}

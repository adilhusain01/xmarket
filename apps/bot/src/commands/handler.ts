import { parseCommand } from '@xmarket/shared';
import { prisma } from '@xmarket/db';
import { TwitterBot, TweetWithAuthor } from '../x-client.js';
import { handleFindCommand } from './find.js';
import { handleBetCommand } from './bet.js';
import { handleBalanceCommand } from './balance.js';

export class CommandHandler {
  async handle(tweet: TweetWithAuthor, bot: TwitterBot): Promise<void> {
    const command = parseCommand(tweet.text);

    // Check if user is registered
    const user = await prisma.user.findUnique({
      where: { xUserId: tweet.author_id! },
    });

    if (!user && command.type !== 'unknown') {
      await bot.reply(
        tweet.id,
        "👋 You're not registered yet! Sign up at xmarket.xyz to start betting on Polymarket."
      );
      return;
    }

    try {
      switch (command.type) {
        case 'find':
          await handleFindCommand(tweet, command, user!, bot);
          break;

        case 'bet':
          await handleBetCommand(tweet, command, user!, bot);
          break;

        case 'balance':
          await handleBalanceCommand(tweet, user!, bot);
          break;

        case 'positions':
          await bot.reply(
            tweet.id,
            '📊 Position tracking coming soon! For now, check your dashboard at xmarket.xyz'
          );
          break;

        case 'unknown':
          await bot.reply(
            tweet.id,
            `❓ Unknown command. Try:
• find [topic] - Search markets
• bet [amount] yes/no - Place a bet
• balance - Check your balance`
          );
          break;
      }
    } catch (error) {
      console.error('Error handling command:', error);
      await bot.reply(
        tweet.id,
        '❌ Something went wrong. Please try again or contact support at xmarket.xyz'
      );
    }
  }
}

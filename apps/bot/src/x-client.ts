import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';
import { POLL_INTERVAL_MS } from '@xmarket/shared';

export interface TwitterConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface TweetWithAuthor extends TweetV2 {
  author?: UserV2;
}

export class TwitterBot {
  private client: TwitterApi;
  private lastMentionId: string | null = null;

  constructor(config: TwitterConfig) {
    this.client = new TwitterApi({
      appKey: config.appKey,
      appSecret: config.appSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessSecret,
    });
  }

  /**
   * Poll for new mentions at regular intervals
   */
  async pollMentions(
    callback: (tweet: TweetWithAuthor) => Promise<void>,
    intervalMs: number = POLL_INTERVAL_MS
  ): Promise<void> {
    // Initial poll
    await this.fetchAndProcessMentions(callback);

    // Set up interval
    setInterval(async () => {
      await this.fetchAndProcessMentions(callback);
    }, intervalMs);
  }

  /**
   * Fetch and process new mentions
   */
  private async fetchAndProcessMentions(
    callback: (tweet: TweetWithAuthor) => Promise<void>
  ): Promise<void> {
    try {
      const botUserId = process.env.X_BOT_USER_ID!;

      const params: any = {
        expansions: ['author_id'],
        'tweet.fields': ['created_at', 'conversation_id'],
        max_results: 10,
      };

      if (this.lastMentionId) {
        params.since_id = this.lastMentionId;
      }

      const mentions = await this.client.v2.userMentionTimeline(botUserId, params);

      if (!mentions.data || mentions.data.data.length === 0) {
        return;
      }

      // Update last mention ID
      this.lastMentionId = mentions.data.data[0].id;

      // Process mentions in chronological order
      const tweets = mentions.data.data.reverse();

      for (const tweet of tweets) {
        const author = mentions.includes?.users?.find((u) => u.id === tweet.author_id);
        await callback({ ...tweet, author });
      }
    } catch (error) {
      console.error('Error fetching mentions:', error);
    }
  }

  /**
   * Reply to a tweet
   */
  async reply(tweetId: string, text: string): Promise<void> {
    try {
      await this.client.v2.reply(text, tweetId);
      console.log(`✅ Replied to tweet ${tweetId}`);
    } catch (error) {
      console.error(`❌ Failed to reply to tweet ${tweetId}:`, error);
      throw error;
    }
  }

  /**
   * Get user by X user ID
   */
  async getUser(userId: string): Promise<UserV2 | null> {
    try {
      const user = await this.client.v2.user(userId);
      return user.data;
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return null;
    }
  }
}

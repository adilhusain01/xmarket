// Command types
export type CommandType = 'find' | 'bet' | 'balance' | 'positions' | 'unknown';

export interface ParsedCommand {
  type: CommandType;
  query?: string;
  amount?: number;
  side?: 'yes' | 'no';
  marketId?: string;
}

// Market types
export interface Market {
  id: string;
  question: string;
  description?: string;
  outcomes: string[];
  outcomePrices: number[];
  volume?: number;
  liquidity?: number;
  active: boolean;
  endDate?: string;
  tags?: string[];
}

export interface MarketSearchResult {
  market: Market;
  relevanceScore: number;
}

// Bet types
export interface BetRequest {
  userId: string;
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  tweetId?: string;
}

export interface BetResult {
  success: boolean;
  orderId?: string;
  shares?: number;
  price?: number;
  error?: string;
}

// User types
export interface UserBalance {
  userId: string;
  balanceUsdc: number;
  pendingBets: number;
}

// Response types for bot
export interface BotResponse {
  text: string;
  inReplyToTweetId: string;
}

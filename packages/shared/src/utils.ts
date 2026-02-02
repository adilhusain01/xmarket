import { ParsedCommand, CommandType } from './types';
import { COMMAND_PATTERNS } from './constants';

/**
 * Parse a tweet text into a command
 */
export function parseCommand(text: string): ParsedCommand {
  // Remove @mentions and clean up
  const cleanText = text.replace(/@\w+/g, '').trim();

  // Check for 'find' command
  const findMatch = cleanText.match(COMMAND_PATTERNS.find);
  if (findMatch) {
    return {
      type: 'find',
      query: findMatch[1].trim(),
    };
  }

  // Check for 'bet' command
  const betMatch = cleanText.match(COMMAND_PATTERNS.bet);
  if (betMatch) {
    return {
      type: 'bet',
      amount: parseFloat(betMatch[1]),
      side: betMatch[3].toLowerCase() as 'yes' | 'no',
      marketId: betMatch[4] || undefined,
    };
  }

  // Check for 'balance' command
  if (COMMAND_PATTERNS.balance.test(cleanText)) {
    return { type: 'balance' };
  }

  // Check for 'positions' command
  if (COMMAND_PATTERNS.positions.test(cleanText)) {
    return { type: 'positions' };
  }

  return { type: 'unknown' };
}

/**
 * Format USDC amount with proper decimals
 */
export function formatUsdc(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format number with K/M suffix
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  }
  return `$${num.toFixed(0)}`;
}

/**
 * Format price as percentage (0.45 -> 45%)
 */
export function formatPrice(price: number): string {
  return `${(price * 100).toFixed(0)}%`;
}

/**
 * Validate USDC amount
 */
export function validateBetAmount(amount: number, minBet: number, maxBet: number): {
  valid: boolean;
  error?: string;
} {
  if (isNaN(amount) || amount <= 0) {
    return { valid: false, error: 'Invalid amount' };
  }
  if (amount < minBet) {
    return { valid: false, error: `Minimum bet is ${formatUsdc(minBet)}` };
  }
  if (amount > maxBet) {
    return { valid: false, error: `Maximum bet is ${formatUsdc(maxBet)}` };
  }
  return { valid: true };
}

/**
 * Calculate shares from amount and price
 */
export function calculateShares(amount: number, price: number): number {
  return amount / price;
}

/**
 * Generate a short market ID for display
 */
export function generateShortId(fullId: string): string {
  return fullId.slice(0, 8);
}

// Polymarket constants
export const POLYMARKET_GAMMA_API = 'https://gamma-api.polymarket.com';
export const POLYMARKET_CLOB_API = 'https://clob.polymarket.com';

// USDC contract on Polygon
export const USDC_CONTRACT_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
export const USDC_DECIMALS = 6;

// Platform constants
export const MIN_BET_AMOUNT = 1; // $1 minimum
export const MAX_BET_AMOUNT = 1000; // $1000 maximum for MVP
export const POLL_INTERVAL_MS = 30000; // 30 seconds

// Command patterns
export const COMMAND_PATTERNS = {
  find: /find\s+(.+)/i,
  bet: /bet\s+(\d+(?:\.\d+)?)\s*(usdc)?\s+(yes|no)(?:\s+#(\w+))?/i,
  balance: /balance/i,
  positions: /positions/i,
};

// Status constants
export const BET_STATUS = {
  PENDING: 'pending',
  FILLED: 'filled',
  FAILED: 'failed',
  SOLD: 'sold',
} as const;

export const TRANSACTION_TYPE = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  BET: 'bet',
  WIN: 'win',
  LOSS: 'loss',
} as const;

// Chrome extension messaging types

export enum MessageType {
  // Tweet selection
  TWEET_SELECTED = 'TWEET_SELECTED',
  OPEN_SIDE_PANEL = 'OPEN_SIDE_PANEL',

  // Market search
  SEARCH_MARKETS = 'SEARCH_MARKETS',
  MARKETS_FOUND = 'MARKETS_FOUND',

  // Wallet operations
  CONNECT_WALLET = 'CONNECT_WALLET',
  WALLET_CONNECTED = 'WALLET_CONNECTED',
  GET_BALANCES = 'GET_BALANCES',
  BALANCES_RESPONSE = 'BALANCES_RESPONSE',

  // Bet operations
  PREPARE_BET = 'PREPARE_BET',
  BET_PREPARED = 'BET_PREPARED',
  EXECUTE_BRIDGE = 'EXECUTE_BRIDGE',
  BRIDGE_EXECUTED = 'BRIDGE_EXECUTED',

  // Status updates
  STATUS_UPDATE = 'STATUS_UPDATE',
  ERROR = 'ERROR',
}

export interface TweetContext {
  tweetId: string;
  text: string;
  author?: string;
  authorHandle?: string;
  loggedInUser?: string; // The Twitter handle of the user using the extension
}

export interface Market {
  id: string;
  question: string;
  description?: string;
  outcomes: string[];
  prices: number[];
  volume: number;
  liquidity: number;
  endDate?: string;
  image?: string;
}

export interface BalanceInfo {
  chain: string;
  chainId: number;
  balance: string;
  formattedBalance: string;
}

export interface BetPreparation {
  marketId: string;
  side: 'yes' | 'no';
  amount: string;
  needsBridge: boolean;
  sourceChain?: string;
  bridgeRoute?: any;
}

// Message payloads
export interface Message<T = any> {
  type: MessageType;
  payload: T;
  error?: string;
}

export interface TweetSelectedPayload {
  tweet: TweetContext;
} 

export interface SearchMarketsPayload {
  query?: string;
  tweetText: string;
  isTestnet?: boolean;
}

export interface MarketsFoundPayload {
  markets: Market[];
}

export interface ConnectWalletPayload {
  address: string;
}

export interface BalancesResponsePayload {
  balances: BalanceInfo[];
  totalUsdc: string;
}

export interface PrepareBetPayload {
  marketId: string;
  side: 'yes' | 'no';
  amount: string;
  walletAddress: string;
}

export interface BetPreparedPayload {
  preparation: BetPreparation;
}

export interface ExecuteBridgePayload {
  route: any;
  walletAddress: string;
}

export interface StatusUpdatePayload {
  status: string;
  step: string;
  message: string;
}

// Check if extension context is valid
export function isContextValid(): boolean {
  try {
    // Try to access chrome.runtime.id to check if context is valid
    return chrome?.runtime?.id !== undefined;
  } catch {
    return false;
  }
}

// Helper to send messages
export async function sendMessage<T>(
  type: MessageType,
  payload: T
): Promise<any> {
  // Retry/backoff for transient extension context errors (service worker restarts)
  const maxRetries = 3;

  function isRetryableMessage(msg: string | undefined) {
    if (!msg) return false;
    return /Extension context invalidated|The message port closed before a response was received|Could not establish connection|Receiving end does not exist/i.test(msg);
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ type, payload } as Message<T>, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response?.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          });
        } catch (err) {
          reject(err);
        }
      });

      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = isRetryableMessage(msg);
      
      if (retryable && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 150; // exponential backoff: 150ms, 300ms, 600ms
        console.warn(`[Xmarket] sendMessage attempt ${attempt + 1} failed with retryable error: ${msg}. Retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Not retryable or out of attempts
      console.error(`[Xmarket] sendMessage failed after ${attempt + 1} attempts:`, msg);
      throw new Error(`Failed to send message (${type}): ${msg}`);
    }
  }
  
  throw new Error(`Failed to send message (${type}) after ${maxRetries} attempts`);
}


// Helper to send message to active tab
export async function sendMessageToTab<T>(
  tabId: number,
  type: MessageType,
  payload: T
): Promise<any> {
  // Retry/backoff for transient context errors when messaging tabs
  const maxRetries = 3;

  function isRetryableMessage(msg: string | undefined) {
    if (!msg) return false;
    return /Extension context invalidated|The message port closed before a response was received|Could not establish connection|Receiving end does not exist/i.test(msg);
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabId,
          { type, payload } as Message<T>,
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response?.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          }
        );
      });

      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = isRetryableMessage(msg);
      if (retryable && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 150;
        console.warn(`[Xmarket] sendMessageToTab attempt ${attempt + 1} failed with retryable error: ${msg}. Retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw err;
    }
  }
}


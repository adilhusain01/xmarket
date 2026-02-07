/**
 * Polymarket Bet Executor for Chrome Extension
 * 
 * Executes bets on Polymarket using user's MetaMask wallet
 * Flow:
 * 1. Get market details (token IDs for Yes/No)
 * 2. Check USDC allowance for CTF Exchange
 * 3. Approve USDC if needed
 * 4. Create and sign order
 * 5. Execute trade on CTF Exchange
 */

import { encodeFunctionData, parseUnits, formatUnits } from 'viem';

// Polymarket Polygon Contracts
const POLYMARKET_CONTRACTS = {
  CTF_EXCHANGE: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E', // Polymarket CTF Exchange on Polygon
  USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon (native)
  NEG_RISK_CTF_EXCHANGE: '0xC5d563A36AE78145C45a50134d48A1215220f80a', // Neg Risk CTF Exchange
  CTF: '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045', // Conditional Token Framework
};

const POLYMARKET_API = {
  GAMMA: 'https://gamma-api.polymarket.com',
  CLOB: 'https://clob.polymarket.com',
};

// ERC20 ABI (minimal for approve)
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// CTF Exchange ABI for filling orders
const CTF_EXCHANGE_ABI = [
  {
    name: 'fillOrder',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'order',
        type: 'tuple',
        components: [
          { name: 'salt', type: 'uint256' },
          { name: 'maker', type: 'address' },
          { name: 'signer', type: 'address' },
          { name: 'taker', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
          { name: 'makerAmount', type: 'uint256' },
          { name: 'takerAmount', type: 'uint256' },
          { name: 'expiration', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'feeRateBps', type: 'uint256' },
          { name: 'side', type: 'uint8' },
          { name: 'signatureType', type: 'uint8' },
        ],
      },
      { name: 'signature', type: 'bytes' },
      { name: 'fillAmount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export interface MarketTokens {
  conditionId: string;
  yesTokenId: string;
  noTokenId: string;
}

export interface BetExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  step?: string;
}

/**
 * Execute ethereum call via MetaMask in active tab
 */
async function executeEthereumCall(method: string, params: any[]): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        reject(new Error('No active tab'));
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          world: 'MAIN',
          func: (method: string, params: any[]) => {
            if (typeof window.ethereum === 'undefined') {
              return { error: 'MetaMask is not installed' };
            }
            return window.ethereum
              .request({ method, params })
              .then((result: any) => ({ result }))
              .catch((err: any) => ({ error: err?.message || 'RPC call failed' }));
          },
          args: [method, params],
        },
        (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          const result = results?.[0]?.result as any;
          if (result?.error) {
            reject(new Error(result.error));
          } else if (result?.result !== undefined) {
            resolve(result.result);
          } else {
            reject(new Error('No result returned'));
          }
        }
      );
    });
  });
}

/**
 * Fetch market details from Polymarket Gamma API
 */
export async function getMarketTokens(marketId: string): Promise<MarketTokens> {
  console.log(`[Polymarket] Fetching market details for ${marketId}...`);
  
  const response = await fetch(`${POLYMARKET_API.GAMMA}/markets/${marketId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch market: ${response.statusText}`);
  }

  const market = await response.json();
  console.log('[Polymarket] Market data:', { 
    id: market.id,
    question: market.question,
    hasTokens: !!market.tokens,
    hasClobTokenIds: !!market.clobTokenIds,
    outcomes: market.outcomes 
  });
  
  // Extract token IDs from market data
  // Try clobTokenIds first (newer format), then fall back to tokens array
  let tokenIds: string[] = [];
  
  if (market.clobTokenIds) {
    // Parse clobTokenIds JSON string
    try {
      tokenIds = JSON.parse(market.clobTokenIds);
    } catch (e) {
      console.error('[Polymarket] Failed to parse clobTokenIds:', e);
    }
  } else if (market.tokens && Array.isArray(market.tokens)) {
    // Legacy format
    tokenIds = market.tokens.map((t: any) => t.token_id || t.tokenId);
  }
  
  if (tokenIds.length < 2) {
    console.error('[Polymarket] Invalid token IDs:', { tokenIds, market });
    throw new Error(`Market does not have Yes/No tokens (found ${tokenIds.length} tokens)`);
  }

  console.log('[Polymarket] ✓ Token IDs extracted:', tokenIds);

  return {
    conditionId: market.conditionId || market.condition_id || '',
    yesTokenId: tokenIds[0],
    noTokenId: tokenIds[1],
  };
}

/**
 * Check USDC allowance for CTF Exchange
 */
export async function checkUsdcAllowance(
  walletAddress: `0x${string}`,
  amount: number
): Promise<boolean> {
  console.log(`[Polymarket] Checking USDC allowance...`);

  try {
    // Switch to Polygon
    await executeEthereumCall('wallet_switchEthereumChain', [{ chainId: '0x89' }]);

    // Encode allowance call
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [walletAddress, POLYMARKET_CONTRACTS.CTF_EXCHANGE as `0x${string}`],
    });

    // Check allowance
    const result = await executeEthereumCall('eth_call', [
      {
        to: POLYMARKET_CONTRACTS.USDC,
        data,
      },
      'latest',
    ]);

    const allowance = BigInt(result);
    const requiredAmount = parseUnits(amount.toString(), 6);

    console.log(`[Polymarket] Current allowance: ${formatUnits(allowance, 6)} USDC`);
    console.log(`[Polymarket] Required: ${amount} USDC`);

    return allowance >= requiredAmount;
  } catch (error) {
    console.error('[Polymarket] Error checking allowance:', error);
    throw error;
  }
}

/**
 * Approve USDC for CTF Exchange
 */
export async function approveUsdc(
  walletAddress: `0x${string}`,
  amount: number
): Promise<string> {
  console.log(`[Polymarket] Approving ${amount} USDC...`);

  try {
    // Switch to Polygon
    await executeEthereumCall('wallet_switchEthereumChain', [{ chainId: '0x89' }]);

    // Encode approve call
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [
        POLYMARKET_CONTRACTS.CTF_EXCHANGE as `0x${string}`,
        parseUnits(amount.toString(), 6),
      ],
    });

    // Send transaction
    const txHash = await executeEthereumCall('eth_sendTransaction', [
      {
        from: walletAddress,
        to: POLYMARKET_CONTRACTS.USDC,
        data,
      },
    ]);

    console.log(`[Polymarket] Approval tx sent: ${txHash}`);
    return txHash;
  } catch (error) {
    console.error('[Polymarket] Error approving USDC:', error);
    throw error;
  }
}

/**
 * Get current timestamp in seconds
 */
function getTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get best available order from orderbook
 */
async function getBestOrder(tokenId: string, side: 'buy'): Promise<any> {
  const response = await fetch(`${POLYMARKET_API.CLOB}/book?token_id=${tokenId}&side=${side === 'buy' ? 'sell' : 'buy'}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch orderbook: ${response.statusText}`);
  }

  const book = await response.json();
  
  // For buying, we want the best ask (sell order)
  const orders = side === 'buy' ? book.asks : book.bids;
  
  if (!orders || orders.length === 0) {
    throw new Error(`No orders available on the ${side === 'buy' ? 'ask' : 'bid'} side`);
  }

  // Return the best order (first in the list)
  return orders[0];
}

/**
 * Fill an existing order from the orderbook
 */
async function fillOrder(
  order: any,
  fillAmount: string,
  walletAddress: string
): Promise<string> {
  console.log('[Polymarket] Filling order on-chain...');

  // Encode fillOrder call
  const data = encodeFunctionData({
    abi: CTF_EXCHANGE_ABI,
    functionName: 'fillOrder',
    args: [
      {
        salt: BigInt(order.salt),
        maker: order.maker,
        signer: order.signer,
        taker: order.taker,
        tokenId: BigInt(order.tokenID),
        makerAmount: BigInt(order.makerAmount),
        takerAmount: BigInt(order.takerAmount),
        expiration: BigInt(order.expiration),
        nonce: BigInt(order.nonce),
        feeRateBps: BigInt(order.feeRateBps),
        side: order.side === 'BUY' ? 0 : 1,
        signatureType: order.signatureType,
      },
      order.signature as `0x${string}`,
      BigInt(fillAmount),
    ],
  });

  // Send transaction
  const txHash = await executeEthereumCall('eth_sendTransaction', [
    {
      from: walletAddress,
      to: POLYMARKET_CONTRACTS.CTF_EXCHANGE,
      data,
    },
  ]);

  console.log(`[Polymarket] Fill order tx: ${txHash}`);
  return txHash;
}

/**
 * Execute bet on Polymarket by filling an existing order
 */
export async function executeBet(
  marketId: string,
  side: 'yes' | 'no',
  amount: number,
  walletAddress: `0x${string}`
): Promise<BetExecutionResult> {
  console.log(`\n[Polymarket] 🎯 Executing bet...`);
  console.log(`[Polymarket]   Market: ${marketId}`);
  console.log(`[Polymarket]   Side: ${side.toUpperCase()}`);
  console.log(`[Polymarket]   Amount: $${amount.toFixed(2)}`);
  console.log(`[Polymarket]   Wallet: ${walletAddress}\n`);

  try {
    // Step 1: Get market token IDs
    console.log('[Polymarket] Step 1/4: Fetching market tokens...');
    const tokens = await getMarketTokens(marketId);
    const tokenId = side === 'yes' ? tokens.yesTokenId : tokens.noTokenId;
    console.log(`[Polymarket] ✓ Token ID: ${tokenId}`);

    // Step 2: Check and approve USDC if needed
    console.log('[Polymarket] Step 2/4: Checking USDC allowance...');
    const hasAllowance = await checkUsdcAllowance(walletAddress, amount);
    
    let approveTxHash: string | undefined;
    if (!hasAllowance) {
      console.log('[Polymarket] → Approval needed, requesting transaction...');
      approveTxHash = await approveUsdc(walletAddress, amount);
      console.log(`[Polymarket] ✓ Approval tx: ${approveTxHash}`);
      
      // Wait for approval confirmation
      console.log('[Polymarket] → Waiting for approval confirmation...');
      await waitForTransaction(approveTxHash);
      console.log('[Polymarket] ✓ Approval confirmed');
    } else {
      console.log('[Polymarket] ✓ Sufficient allowance');
    }

    // Step 3: Get best order from orderbook
    console.log('[Polymarket] Step 3/4: Fetching best order from orderbook...');
    const bestOrder = await getBestOrder(tokenId, 'buy');
    console.log(`[Polymarket] ✓ Best order: $${bestOrder.price} (size: ${formatUnits(BigInt(bestOrder.makerAmount), 6)} USDC)`);

    // Step 4: Fill the order
    console.log('[Polymarket] Step 4/4: Filling order on-chain...');
    const fillAmount = parseUnits(amount.toString(), 6).toString();
    const fillTxHash = await fillOrder(bestOrder, fillAmount, walletAddress);
    console.log(`[Polymarket] ✓ Fill order tx: ${fillTxHash}`);

    // Wait for fill transaction
    console.log('[Polymarket] → Waiting for fill confirmation...');
    await waitForTransaction(fillTxHash);
    console.log('[Polymarket] ✓ Order filled successfully!');

    return {
      success: true,
      step: 'completed',
      txHash: fillTxHash,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Polymarket] ✗ Bet execution failed:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      step: 'failed',
    };
  }
}

/**
 * Wait for transaction confirmation
 */
async function waitForTransaction(txHash: string, maxWait: number = 30000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const receipt = await executeEthereumCall('eth_getTransactionReceipt', [txHash]);
      
      if (receipt && receipt.status) {
        if (receipt.status === '0x1') {
          return; // Success
        } else {
          throw new Error('Transaction failed');
        }
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      // Continue waiting
    }
  }
  
  throw new Error('Transaction confirmation timeout');
}

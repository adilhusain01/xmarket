// Balance checker adapted for Chrome extension
// Checks USDC balances across multiple chains using MetaMask

import { erc20Abi, formatUnits, encodeFunctionData } from 'viem';
import { getActiveChains, getTargetChainId, getTargetChainName } from '@xmarket/shared';

export interface ChainBalance {
  chainId: number;
  chainName: string;
  balance: number; // human-readable e.g. 5.00
  balanceRaw: bigint;
}

/**
 * Execute ethereum RPC call via chrome.scripting in the active tab's MAIN world
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
 * Check USDC balance on a single chain using MetaMask's wallet_switchEthereumChain + eth_call
 */
export async function getUsdcBalanceOnChain(
  chainId: number,
  address: `0x${string}`,
  isTestnet: boolean = false
): Promise<ChainBalance> {
  const USDC_CHAINS = getActiveChains(isTestnet);
  const config = USDC_CHAINS.find((c) => c.chainId === chainId);

  if (!config) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  console.log(`  [BalanceCheck] → Querying ${config.name} (chain ${chainId}) via MetaMask...`);

  try {
    // Switch to the target chain
    await executeEthereumCall('wallet_switchEthereumChain', [
      { chainId: `0x${chainId.toString(16)}` }
    ]);

    // Encode the balanceOf call
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    });

    // Make the eth_call
    const result = await executeEthereumCall('eth_call', [
      {
        to: config.usdcAddress,
        data,
      },
      'latest',
    ]);

    // Handle empty response (contract doesn't exist or call failed)
    if (!result || result === '0x' || result === '0x0') {
      console.log(`  [BalanceCheck] ✓ ${config.name}: $0.00 USDC (no balance or contract not found)`);
      return { chainId, chainName: config.name, balance: 0, balanceRaw: 0n };
    }

    // Decode the result
    const balanceRaw = BigInt(result);
    const balance = Number(formatUnits(balanceRaw, config.usdcDecimals));
    
    console.log(`  [BalanceCheck] ✓ ${config.name}: $${balance.toFixed(2)} USDC`);

    return { chainId, chainName: config.name, balance, balanceRaw };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`  [BalanceCheck] ✗ ${config.name} failed:`, message);
    throw new Error(`${config.name}: ${message}`);
  }
}

/**
 * Check USDC balances on ALL supported chains sequentially (to avoid MetaMask rate limits).
 * Returns results sorted by balance descending.
 */
export async function getAllUsdcBalances(
  address: `0x${string}`,
  isTestnet: boolean = false
): Promise<ChainBalance[]> {
  console.log(`[BalanceCheck] Scanning all chains for ${address}...`);

  const USDC_CHAINS = getActiveChains(isTestnet);
  const TARGET_CHAIN_ID = getTargetChainId(isTestnet);

  const balances: ChainBalance[] = [];

  // Check chains sequentially to avoid overwhelming MetaMask
  for (const chain of USDC_CHAINS) {
    try {
      const balance = await getUsdcBalanceOnChain(chain.chainId, address, isTestnet);
      balances.push(balance);
    } catch (error) {
      console.warn(
        `  [BalanceCheck] ✗ ${chain.name} failed:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  balances.sort((a, b) => b.balance - a.balance);

  console.log(`[BalanceCheck] ── Summary ──`);
  balances.forEach((b) => {
    const tag = b.chainId === TARGET_CHAIN_ID ? '  ← destination' : '';
    console.log(`  ${b.chainName}: $${b.balance.toFixed(2)}${tag}`);
  });

  return balances;
}

/**
 * Pick the best source chain for a required amount.
 *   1. Polygon first (no bridge needed).
 *   2. Otherwise the chain with the highest balance.
 */
export function findBestSourceChain(
  balances: ChainBalance[],
  requiredAmount: number,
  isTestnet: boolean = false
): { chain: ChainBalance | null; needsBridge: boolean } {
  const TARGET_CHAIN_ID = getTargetChainId(isTestnet);
  const TARGET_CHAIN_NAME = getTargetChainName(isTestnet);

  const polygonBal = balances.find((b) => b.chainId === TARGET_CHAIN_ID);

  if (polygonBal && polygonBal.balance >= requiredAmount) {
    console.log(
      `[BalanceCheck] ✓ ${TARGET_CHAIN_NAME} has $${polygonBal.balance.toFixed(2)} — sufficient. No bridge needed.`
    );
    return { chain: polygonBal, needsBridge: false };
  }

  console.log(
    `[BalanceCheck] ✗ ${TARGET_CHAIN_NAME} has $${polygonBal?.balance.toFixed(2) ?? '0.00'} — need $${requiredAmount.toFixed(2)}. Looking for bridge source...`
  );

  // Highest-balance non-Polygon chain
  const best = balances.find((b) => b.chainId !== TARGET_CHAIN_ID && b.balance > 0);

  if (best) {
    console.log(
      `[BalanceCheck] → Found $${best.balance.toFixed(2)} on ${best.chainName}. Bridge required.`
    );
    return { chain: best, needsBridge: true };
  }

  console.log('[BalanceCheck] ✗ No USDC found on any supported chain.');
  return { chain: null, needsBridge: false };
}

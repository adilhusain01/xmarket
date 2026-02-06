// Balance checker adapted for Chrome extension
// Checks USDC balances across multiple chains

import { createPublicClient, http, erc20Abi, formatUnits } from 'viem';
import {
  mainnet,
  polygon,
  arbitrum,
  base,
  optimism,
  sepolia,
  polygonAmoy,
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
} from 'viem/chains';
import type { Chain } from 'viem';
import { getActiveChains, getTargetChainId, getTargetChainName } from '@xmarket/shared';

const VIEM_CHAINS_MAINNET: Record<number, Chain> = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  8453: base,
  10: optimism,
};

const VIEM_CHAINS_TESTNET: Record<number, Chain> = {
  11155111: sepolia,
  80002: polygonAmoy,
  421614: arbitrumSepolia,
  84532: baseSepolia,
  11155420: optimismSepolia,
};

export interface ChainBalance {
  chainId: number;
  chainName: string;
  balance: number; // human-readable e.g. 5.00
  balanceRaw: bigint;
}

/**
 * Check USDC balance on a single chain via public RPC.
 */
export async function getUsdcBalanceOnChain(
  chainId: number,
  address: `0x${string}`,
  isTestnet: boolean = false
): Promise<ChainBalance> {
  const VIEM_CHAINS: Record<number, Chain> = isTestnet
    ? VIEM_CHAINS_TESTNET
    : VIEM_CHAINS_MAINNET;

  const USDC_CHAINS = getActiveChains(isTestnet);

  const chain = VIEM_CHAINS[chainId];
  const config = USDC_CHAINS.find((c) => c.chainId === chainId);

  if (!chain || !config) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  console.log(`  [BalanceCheck] → Querying ${config.name} (chain ${chainId})...`);

  const client = createPublicClient({ chain, transport: http() });

  const balanceRaw = await client.readContract({
    address: config.usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  });

  const balance = Number(formatUnits(balanceRaw, config.usdcDecimals));
  console.log(`  [BalanceCheck] → ${config.name}: $${balance.toFixed(2)} USDC`);

  return { chainId, chainName: config.name, balance, balanceRaw };
}

/**
 * Check USDC balances on ALL supported chains in parallel.
 * Returns results sorted by balance descending.
 */
export async function getAllUsdcBalances(
  address: `0x${string}`,
  isTestnet: boolean = false
): Promise<ChainBalance[]> {
  console.log(`[BalanceCheck] Scanning all chains for ${address}...`);

  const USDC_CHAINS = getActiveChains(isTestnet);
  const TARGET_CHAIN_ID = getTargetChainId(isTestnet);

  const results = await Promise.allSettled(
    USDC_CHAINS.map((c) => getUsdcBalanceOnChain(c.chainId, address, isTestnet))
  );

  const balances: ChainBalance[] = [];
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      balances.push(result.value);
    } else {
      console.warn(
        `  [BalanceCheck] ✗ ${USDC_CHAINS[i].name} RPC failed:`,
        result.reason?.message ?? result.reason
      );
    }
  });

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
      `[BalanceCheck] ✓ Best source: ${best.chainName} ($${best.balance.toFixed(2)})`
    );
    if (best.balance < requiredAmount) {
      console.log(
        `[BalanceCheck] ⚠ ${best.chainName} balance ($${best.balance.toFixed(2)}) < required ($${requiredAmount.toFixed(2)})`
      );
    }
    return { chain: best, needsBridge: true };
  }

  console.log(`[BalanceCheck] ✗ No USDC found on any supported chain.`);
  return { chain: null, needsBridge: false };
}

import { createPublicClient, http, erc20Abi, formatUnits } from 'viem';
import { mainnet, polygon, arbitrum, base, optimism } from 'viem/chains';
import type { Chain } from 'viem';
import { USDC_CHAINS, POLYGON_CHAIN_ID } from '@xmarket/shared';

const VIEM_CHAINS: Record<number, Chain> = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  8453: base,
  10: optimism,
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
  address: `0x${string}`
): Promise<ChainBalance> {
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
  address: `0x${string}`
): Promise<ChainBalance[]> {
  console.log(`[BalanceCheck] Scanning all chains for ${address}...`);

  const results = await Promise.allSettled(
    USDC_CHAINS.map((c) => getUsdcBalanceOnChain(c.chainId, address))
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
    const tag = b.chainId === POLYGON_CHAIN_ID ? '  ← destination' : '';
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
  requiredAmount: number
): { chain: ChainBalance | null; needsBridge: boolean } {
  const polygonBal = balances.find((b) => b.chainId === POLYGON_CHAIN_ID);

  if (polygonBal && polygonBal.balance >= requiredAmount) {
    console.log(
      `[BalanceCheck] ✓ Polygon has $${polygonBal.balance.toFixed(2)} — sufficient. No bridge needed.`
    );
    return { chain: polygonBal, needsBridge: false };
  }

  console.log(
    `[BalanceCheck] ✗ Polygon has $${polygonBal?.balance.toFixed(2) ?? '0.00'} — need $${requiredAmount.toFixed(2)}. Looking for bridge source...`
  );

  // Highest-balance non-Polygon chain
  const best = balances.find(
    (b) => b.chainId !== POLYGON_CHAIN_ID && b.balance > 0
  );

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

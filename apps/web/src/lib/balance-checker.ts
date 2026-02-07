import { createPublicClient, http, fallback, erc20Abi, formatUnits } from 'viem';
import {
  mainnet, polygon, arbitrum, base, optimism,
  sepolia, polygonAmoy, arbitrumSepolia, baseSepolia, optimismSepolia,
} from 'viem/chains';
import type { Chain } from 'viem';
import { getActiveChains, getTargetChainId, getTargetChainName } from '@xmarket/shared';

const IS_TESTNET = process.env.NODE_ENV !== 'production';
const TARGET_CHAIN_NAME = getTargetChainName(IS_TESTNET);

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

const VIEM_CHAINS: Record<number, Chain> = IS_TESTNET
  ? VIEM_CHAINS_TESTNET
  : VIEM_CHAINS_MAINNET;

const USDC_CHAINS = getActiveChains(IS_TESTNET);
const TARGET_CHAIN_ID = getTargetChainId(IS_TESTNET);

// Fallback RPC URLs for each chain (using multiple providers for reliability)
const RPC_URLS: Record<number, string[]> = {
  // Mainnet
  1: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
  ],
  137: [
    process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon.llamarpc.com',
  ],
  42161: [
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.llamarpc.com',
  ],
  8453: [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://rpc.ankr.com/base',
  ],
  10: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://optimism.llamarpc.com',
  ],
  // Testnet
  11155111: [
    'https://rpc.ankr.com/eth_sepolia',
    'https://ethereum-sepolia.publicnode.com',
  ],
  80002: [
    process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology',
    'https://polygon-amoy.g.alchemy.com/v2/demo',
  ],
  421614: [
    'https://sepolia-rollup.arbitrum.io/rpc',
    'https://arbitrum-sepolia.blockpi.network/v1/rpc/public',
  ],
  84532: [
    'https://sepolia.base.org',
    'https://base-sepolia.blockpi.network/v1/rpc/public',
  ],
  11155420: [
    'https://sepolia.optimism.io',
    'https://optimism-sepolia.blockpi.network/v1/rpc/public',
  ],
};

export interface ChainBalance {
  chainId: number;
  chainName: string;
  balance: number; // human-readable e.g. 5.00
  balanceRaw: bigint;
}

/**
 * Check USDC balance on a single chain via public RPC with fallback providers.
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

  // Create transports with fallback for reliability
  const rpcUrls = RPC_URLS[chainId] || [];
  const transports = rpcUrls.map(url => http(url, {
    timeout: 10_000,
    retryCount: 2,
    retryDelay: 1000,
  }));

  const client = createPublicClient({
    chain,
    transport: transports.length > 1 ? fallback(transports) : transports[0],
  });

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
  requiredAmount: number
): { chain: ChainBalance | null; needsBridge: boolean } {
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
  const best = balances.find(
    (b) => b.chainId !== TARGET_CHAIN_ID && b.balance > 0
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

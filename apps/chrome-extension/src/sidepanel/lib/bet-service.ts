// Bet service adapted for Chrome extension - DEMO MODE

import type { WalletClient } from 'viem';
import { getTargetChainId, getTargetChainName } from '@xmarket/shared';
import {
  getUsdcBalanceOnChain,
  getAllUsdcBalances,
  findBestSourceChain,
  type ChainBalance,
} from './balance-checker';
import { getBridgeRoutes, executeBridgeRoute, type BridgeRoute } from './lifi-bridge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type BetFlowStatus =
  | 'idle'
  | 'checking-polygon'
  | 'scanning-chains'
  | 'getting-route'
  | 'ready' // Polygon has enough — place bet directly
  | 'needs-bridge' // route fetched, waiting for user to confirm bridge
  | 'bridging' // bridge tx in flight
  | 'bridge-complete' // USDC arrived on Polygon
  | 'insufficient' // not enough USDC anywhere
  | 'simulated' // Demo mode - simulated success
  | 'error';

export interface BetFlowResult {
  status: BetFlowStatus;
  amountUsd: number;
  polygonBalance: number;
  sourceChain?: ChainBalance;
  allBalances?: ChainBalance[];
  bestRoute?: BridgeRoute;
  error?: string;
}

// ---------------------------------------------------------------------------
// Step 1 + 2 + 3 — prepare (REAL balance checks, REAL route fetching)
// ---------------------------------------------------------------------------
export async function prepareBet(
  amountUsd: number,
  walletAddress: `0x${string}`,
  isTestnet: boolean = false
): Promise<BetFlowResult> {
  const TARGET_CHAIN_ID = getTargetChainId(isTestnet);
  const TARGET_CHAIN_NAME = getTargetChainName(isTestnet);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[BetFlow] 🎯 Starting bet flow`);
  console.log(`[BetFlow]   Amount   : $${amountUsd.toFixed(2)}`);
  console.log(`[BetFlow]   Wallet   : ${walletAddress}`);
  console.log(`[BetFlow]   Mode     : ${isTestnet ? 'TESTNET' : 'MAINNET'}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // ── 1. Check Polygon balance ─────────────────────────────────────────
  console.log(`[BetFlow] Step 1 of 3: Check ${TARGET_CHAIN_NAME} USDC balance`);

  let polygonBalance: ChainBalance;
  try {
    polygonBalance = await getUsdcBalanceOnChain(TARGET_CHAIN_ID, walletAddress, isTestnet);
  } catch (err) {
    console.error(`[BetFlow] ✗ ${TARGET_CHAIN_NAME} RPC error:`, err);
    return {
      status: 'error',
      amountUsd,
      polygonBalance: 0,
      error: `Failed to check ${TARGET_CHAIN_NAME} balance`,
    };
  }

  if (polygonBalance.balance >= amountUsd) {
    console.log(
      `\n[BetFlow] ✅ ${TARGET_CHAIN_NAME} balance $${polygonBalance.balance.toFixed(2)} ≥ $${amountUsd.toFixed(2)}`
    );
    console.log(`[BetFlow] → Ready to place bet directly on ${TARGET_CHAIN_NAME}.\n`);
    return {
      status: 'ready',
      amountUsd,
      polygonBalance: polygonBalance.balance,
      sourceChain: polygonBalance,
    };
  }

  // ── 2. Scan every supported chain ────────────────────────────────────
  console.log(
    `\n[BetFlow] Step 2 of 3: ${TARGET_CHAIN_NAME} insufficient ($${polygonBalance.balance.toFixed(2)}). Scanning all chains…`
  );

  let allBalances: ChainBalance[];
  try {
    allBalances = await getAllUsdcBalances(walletAddress, isTestnet);
  } catch (err) {
    console.error(`[BetFlow] ✗ Chain scan error:`, err);
    return {
      status: 'error',
      amountUsd,
      polygonBalance: polygonBalance.balance,
      error: 'Failed to scan chains',
    };
  }

  const { chain: bestChain, needsBridge } = findBestSourceChain(
    allBalances,
    amountUsd,
    isTestnet
  );

  if (!bestChain || !needsBridge) {
    const total = allBalances.reduce((s, b) => s + b.balance, 0);
    console.log(
      `\n[BetFlow] ✗ Insufficient USDC. Total across all chains: $${total.toFixed(2)}, need $${amountUsd.toFixed(2)}\n`
    );
    return {
      status: 'insufficient',
      amountUsd,
      polygonBalance: polygonBalance.balance,
      allBalances,
      error: `Total USDC $${total.toFixed(2)} < required $${amountUsd.toFixed(2)}`,
    };
  }

  // ── 3. Fetch LiFi bridge route ───────────────────────────────────────
  console.log(
    `\n[BetFlow] Step 3 of 3: Fetch bridge route ${bestChain.chainName} → ${TARGET_CHAIN_NAME}`
  );

  let bridgeRoutes: BridgeRoute[];
  try {
    bridgeRoutes = await getBridgeRoutes(
      bestChain.chainId,
      amountUsd,
      walletAddress,
      isTestnet
    );
  } catch (err) {
    console.error(`[BetFlow] ✗ LiFi route error:`, err);
    return {
      status: 'error',
      amountUsd,
      polygonBalance: polygonBalance.balance,
      allBalances,
      sourceChain: bestChain,
      error: 'Failed to fetch bridge routes from LiFi',
    };
  }

  if (bridgeRoutes.length === 0) {
    console.log(`\n[BetFlow] ✗ No bridge route available from ${bestChain.chainName}.\n`);
    return {
      status: 'error',
      amountUsd,
      polygonBalance: polygonBalance.balance,
      allBalances,
      sourceChain: bestChain,
      error: `No bridge route from ${bestChain.chainName} to ${TARGET_CHAIN_NAME}`,
    };
  }

  const chosen = bridgeRoutes[0];
  console.log(`\n[BetFlow] ✅ Bridge route ready`);
  console.log(
    `[BetFlow]   Source       : ${bestChain.chainName} ($${bestChain.balance.toFixed(2)} available)`
  );
  console.log(`[BetFlow]   Route        : ${chosen.steps.join(' → ')}`);
  console.log(`[BetFlow]   Est. time    : ~${Math.ceil(chosen.estimatedTimeSeconds / 60)} min`);
  console.log(`[BetFlow]   Est. gas cost: $${chosen.gasCostUsd}`);
  console.log(`[BetFlow] → Awaiting user confirmation to bridge.\n`);

  return {
    status: 'needs-bridge',
    amountUsd,
    polygonBalance: polygonBalance.balance,
    allBalances,
    sourceChain: bestChain,
    bestRoute: chosen,
  };
}

// ---------------------------------------------------------------------------
// Step 4 — execute the bridge (wallet signing)
// ---------------------------------------------------------------------------
export async function executeBridge(
  prepared: BetFlowResult,
  walletClient: WalletClient,
  isTestnet: boolean = false,
  switchChainFn?: (args: { chainId: number }) => Promise<unknown>
): Promise<BetFlowResult> {
  const TARGET_CHAIN_NAME = getTargetChainName(isTestnet);

  if (prepared.status !== 'needs-bridge' || !prepared.bestRoute) {
    console.log(`[BetFlow] ✗ Nothing to bridge (status=${prepared.status}).`);
    return prepared;
  }

  console.log(`\n[BetFlow] 🔄 User confirmed — executing bridge…`);
  console.log(
    `[BetFlow]   ${prepared.sourceChain?.chainName} → ${TARGET_CHAIN_NAME} | $${prepared.amountUsd.toFixed(2)}`
  );

  const result = await executeBridgeRoute(
    prepared.bestRoute.route,
    walletClient,
    switchChainFn
  );

  if (result.success) {
    console.log(`\n[BetFlow] ✅ Bridge initiated. USDC is moving to ${TARGET_CHAIN_NAME}…\n`);
    return { ...prepared, status: 'bridging' };
  }

  console.log(`\n[BetFlow] ✗ Bridge failed: ${result.error}\n`);
  return { ...prepared, status: 'error', error: result.error };
}

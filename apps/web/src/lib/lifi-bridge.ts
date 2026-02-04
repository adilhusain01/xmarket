import { EVM, createConfig, getRoutes, executeRoute } from '@lifi/sdk';
import type { Route } from '@lifi/types';
import { parseUnits } from 'viem';
import type { WalletClient } from 'viem';
import { USDC_CHAINS, POLYGON_CHAIN_ID } from '@xmarket/shared';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------
export interface BridgeRoute {
  route: Route;
  steps: string[];
  estimatedTimeSeconds: number;
  gasCostUsd: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getUsdcAddress(chainId: number): string {
  const config = USDC_CHAINS.find((c) => c.chainId === chainId);
  if (!config) throw new Error(`No USDC config for chain ${chainId}`);
  return config.usdcAddress;
}

// ---------------------------------------------------------------------------
// Route fetching (no wallet needed)
// ---------------------------------------------------------------------------
export async function getBridgeRoutes(
  fromChainId: number,
  amountUsd: number,
  userAddress: string
): Promise<BridgeRoute[]> {
  const fromName =
    USDC_CHAINS.find((c) => c.chainId === fromChainId)?.name ??
    `Chain ${fromChainId}`;

  console.log(
    `[Bridge] Getting routes: ${fromName} → Polygon for $${amountUsd.toFixed(2)} USDC…`
  );

  // 1 % buffer so received amount covers the bet after slippage
  const amountWithBuffer = amountUsd * 1.01;
  const amountRaw = parseUnits(amountWithBuffer.toFixed(6), 6);

  const { routes } = await getRoutes({
    fromChainId,
    toChainId: POLYGON_CHAIN_ID,
    fromTokenAddress: getUsdcAddress(fromChainId),
    toTokenAddress: getUsdcAddress(POLYGON_CHAIN_ID),
    fromAmount: amountRaw.toString(),
    fromAddress: userAddress,
  });

  if (!routes || routes.length === 0) {
    console.log(`[Bridge] ✗ No routes found from ${fromName} to Polygon.`);
    return [];
  }

  const parsed: BridgeRoute[] = routes.map((route, i) => {
    const steps = route.steps.map((s) => s.type);
    const totalSeconds = route.steps.reduce(
      (sum, s) => sum + ((s as any).estimate?.executionDuration ?? 0),
      0
    );
    const gasCost = route.gasCostUSD ?? '?';

    console.log(
      `[Bridge]   Route ${i + 1}: ${steps.join(' → ')} | ~${Math.ceil(totalSeconds / 60)} min | Gas: $${gasCost}`
    );

    return { route, steps, estimatedTimeSeconds: totalSeconds, gasCostUsd: gasCost };
  });

  console.log(
    `[Bridge] ✓ Best route: ${parsed[0].steps.join(' → ')} (~${Math.ceil(parsed[0].estimatedTimeSeconds / 60)} min)`
  );
  return parsed;
}

// ---------------------------------------------------------------------------
// Route execution (needs wallet)
// ---------------------------------------------------------------------------

/**
 * Wire up the EVM provider so LiFi can sign transactions via the connected
 * wagmi wallet, then execute the chosen route.
 *
 * @param route         The Route from getBridgeRoutes.
 * @param walletClient  viem WalletClient (wagmi useWalletClient).
 * @param switchChainFn wagmi switchChainAsync — used when LiFi needs to
 *                      switch the wallet to a different chain mid-bridge.
 */
export async function executeBridgeRoute(
  route: Route,
  walletClient: WalletClient,
  switchChainFn?: (args: { chainId: number }) => Promise<unknown>
): Promise<{ success: boolean; error?: string }> {
  console.log(`[Bridge] 🔄 Executing bridge…`);
  console.log(`[Bridge]   Steps : ${route.steps.map((s) => s.type).join(' → ')}`);
  console.log(`[Bridge]   Chains: ${route.fromChainId} → ${route.toChainId}`);

  try {
    // Register the EVM provider with the user's connected wallet
    const evmProvider = EVM({
      getWalletClient: async () => walletClient,
      switchChain: switchChainFn
        ? async (chainId: number) => {
            await switchChainFn({ chainId });
            return undefined; // LiFi expects Client | undefined
          }
        : undefined,
    });

    createConfig({
      integrator: 'xmarket',
      providers: [evmProvider],
    });

    console.log(`[Bridge] ⏳ Waiting for wallet approvals…`);

    // executeRoute resolves when all steps complete, or throws on failure.
    // LiFi internally handles ERC20 approvals and prompts the wallet.
    await executeRoute(route, {
      switchChainHook: switchChainFn
        ? async (chainId: number) => {
            await switchChainFn({ chainId });
            return undefined;
          }
        : undefined,
    });

    console.log(`[Bridge] ✅ Bridge completed successfully.`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Bridge] ✗ Execution error: ${msg}`);
    return { success: false, error: msg };
  }
}

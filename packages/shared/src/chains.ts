export interface ChainUsdcConfig {
  chainId: number;
  name: string;
  usdcAddress: `0x${string}`;
  usdcDecimals: number;
}

// ---------------------------------------------------------------------------
// Mainnet
// ---------------------------------------------------------------------------
export const POLYGON_CHAIN_ID = 137;

export const USDC_CHAINS: ChainUsdcConfig[] = [
  {
    chainId: 1,
    name: 'Ethereum',
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    usdcDecimals: 6,
  },
  {
    chainId: 137,
    name: 'Polygon',
    usdcAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    usdcDecimals: 6,
  },
  {
    chainId: 42161,
    name: 'Arbitrum One',
    usdcAddress: '0xaf88d065a77c8525ccd842bd5f7606569fb42d48',
    usdcDecimals: 6,
  },
  {
    chainId: 8453,
    name: 'Base',
    usdcAddress: '0x833589fCD6e073E2C0B4483a20Aca01c04a510bF',
    usdcDecimals: 6,
  },
  {
    chainId: 10,
    name: 'Optimism',
    usdcAddress: '0x0b3e28565e00a0a459efa680b591db37613f2a42',
    usdcDecimals: 6,
  },
];

// ---------------------------------------------------------------------------
// Testnet  (Circle testnet USDC on each chain)
// ---------------------------------------------------------------------------
export const POLYGON_AMOY_CHAIN_ID = 80002;

export const USDC_CHAINS_TESTNET: ChainUsdcConfig[] = [
  {
    chainId: 11155111,       // Sepolia
    name: 'Ethereum Sepolia',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    usdcDecimals: 6,
  },
  {
    chainId: 80002,          // Polygon Amoy
    name: 'Polygon Amoy',
    usdcAddress: '0x54FfB64197539BA5CDA38FeCc372d72C0bC8bDb1',
    usdcDecimals: 6,
  },
  {
    chainId: 421614,         // Arbitrum Sepolia
    name: 'Arbitrum Sepolia',
    usdcAddress: '0x42c3eb70114fA313e30bcc1ecf083a06fc96803D',
    usdcDecimals: 6,
  },
  {
    chainId: 84532,          // Base Sepolia
    name: 'Base Sepolia',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdcDecimals: 6,
  },
  {
    chainId: 11155420,       // Optimism Sepolia
    name: 'Optimism Sepolia',
    usdcAddress: '0x519a652510cf516AaE6340b101B76da40D3eaC91',
    usdcDecimals: 6,
  },
];

// ---------------------------------------------------------------------------
// Environment-aware helpers
// ---------------------------------------------------------------------------

/** Returns the active chain list based on the environment flag. */
export function getActiveChains(isTestnet: boolean): ChainUsdcConfig[] {
  return isTestnet ? USDC_CHAINS_TESTNET : USDC_CHAINS;
}

/** Returns the target (destination) chain ID — Polygon Amoy on testnet, Polygon on mainnet. */
export function getTargetChainId(isTestnet: boolean): number {
  return isTestnet ? POLYGON_AMOY_CHAIN_ID : POLYGON_CHAIN_ID;
}

/** Returns the human-readable name of the target chain. */
export function getTargetChainName(isTestnet: boolean): string {
  return isTestnet ? 'Polygon Amoy' : 'Polygon';
}

export function getUsdcConfig(chainId: number): ChainUsdcConfig | undefined {
  return USDC_CHAINS.find((c) => c.chainId === chainId);
}

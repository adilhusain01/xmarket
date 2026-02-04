export interface ChainUsdcConfig {
  chainId: number;
  name: string;
  usdcAddress: `0x${string}`;
  usdcDecimals: number;
}

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

export function getUsdcConfig(chainId: number): ChainUsdcConfig | undefined {
  return USDC_CHAINS.find((c) => c.chainId === chainId);
}

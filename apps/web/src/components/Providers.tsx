'use client';

import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import {
  mainnet, polygon, arbitrum, base, optimism,
  sepolia, polygonAmoy, arbitrumSepolia, baseSepolia, optimismSepolia,
} from 'viem/chains';
import type { Chain } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { SessionProvider } from 'next-auth/react';
import '@rainbow-me/rainbowkit/styles.css';

const IS_TESTNET = process.env.NODE_ENV !== 'production';

const chains: [Chain, ...Chain[]] = IS_TESTNET
  ? [polygonAmoy, sepolia, arbitrumSepolia, baseSepolia, optimismSepolia]
  : [polygon, mainnet, arbitrum, base, optimism];

const transports: Record<number, ReturnType<typeof http>> = IS_TESTNET
  ? {
      [polygonAmoy.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
      [sepolia.id]: http(),
      [arbitrumSepolia.id]: http(),
      [baseSepolia.id]: http(),
      [optimismSepolia.id]: http(),
    }
  : {
      [polygon.id]: http(process.env.NEXT_PUBLIC_POLYGON_RPC_URL),
      [mainnet.id]: http(),
      [arbitrum.id]: http(),
      [base.id]: http(),
      [optimism.id]: http(),
    };

const config = getDefaultConfig({
  appName: 'Xmarket',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains,
  transports,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>{children}</RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}

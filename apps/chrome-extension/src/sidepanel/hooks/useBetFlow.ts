// Bet flow hook for managing the betting process

import { create } from 'zustand';
import { prepareBet, executeBridge, type BetFlowResult } from '../lib/bet-service';
import type { WalletClient } from 'viem';

interface BetFlowState {
  // Current bet preparation result
  preparation: BetFlowResult | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  prepare: (amountUsd: number, walletAddress: `0x${string}`, isTestnet: boolean) => Promise<void>;
  execute: (walletClient: WalletClient, isTestnet: boolean, switchChainFn?: (args: { chainId: number }) => Promise<unknown>) => Promise<void>;
  reset: () => void;
}

export const useBetFlow = create<BetFlowState>((set, get) => ({
  preparation: null,
  isLoading: false,
  error: null,

  prepare: async (amountUsd: number, walletAddress: `0x${string}`, isTestnet: boolean) => {
    set({ isLoading: true, error: null });

    try {
      const result = await prepareBet(amountUsd, walletAddress, isTestnet);

      if (result.status === 'error') {
        set({
          preparation: result,
          isLoading: false,
          error: result.error || 'Failed to prepare bet',
        });
      } else {
        set({
          preparation: result,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to prepare bet';
      set({
        preparation: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  execute: async (walletClient: WalletClient, isTestnet: boolean, switchChainFn?: (args: { chainId: number }) => Promise<unknown>) => {
    const { preparation } = get();

    if (!preparation) {
      set({ error: 'No bet prepared' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const result = await executeBridge(preparation, walletClient, isTestnet, switchChainFn);

      if (result.status === 'error') {
        set({
          preparation: result,
          isLoading: false,
          error: result.error || 'Failed to execute bridge',
        });
      } else {
        set({
          preparation: result,
          isLoading: false,
          error: null,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute bridge';
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  reset: () => {
    set({
      preparation: null,
      isLoading: false,
      error: null,
    });
  },
}));

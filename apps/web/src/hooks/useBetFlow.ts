'use client';

import { useState, useCallback } from 'react';
import { useWalletClient, useSwitchChain } from 'wagmi';
import {
  prepareBet,
  executeBridge,
  type BetFlowResult,
} from '@/lib/bet-service';

export function useBetFlow() {
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [result, setResult] = useState<BetFlowResult | null>(null);
  const [loading, setLoading] = useState(false);

  /** Run balance checks + route fetch for a given amount. */
  const prepare = useCallback(
    async (amountUsd: number, walletAddress: `0x${string}`) => {
      setLoading(true);
      setResult(null);
      try {
        const res = await prepareBet(amountUsd, walletAddress);
        setResult(res);
        return res;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /** Execute the bridge that prepareBet returned. */
  const bridge = useCallback(async () => {
    if (!result || !walletClient) {
      console.log('[useBetFlow] ✗ No prepared result or wallet.');
      return;
    }
    setLoading(true);
    try {
      const res = await executeBridge(
        result,
        walletClient,
        switchChainAsync
      );
      setResult(res);
      return res;
    } finally {
      setLoading(false);
    }
  }, [result, walletClient, switchChainAsync]);

  /** Reset state. */
  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return { result, loading, prepare, bridge, reset };
}

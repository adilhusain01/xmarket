'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useBetFlow } from '@/hooks/useBetFlow';
import { getTargetChainName } from '@xmarket/shared';

const TARGET_CHAIN_NAME = getTargetChainName(process.env.NODE_ENV !== 'production');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Market {
  id: string;
  question: string;
  outcomePrices?: Record<string, string>;
  volume?: number;
  active?: boolean;
}

interface BetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function BetModal({ isOpen, onClose }: BetModalProps) {
  const { address, isConnected } = useAccount();
  const { result, loading, prepare, bridge, reset } = useBetFlow();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [fetchingMarkets, setFetchingMarkets] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('5');

  // ── fetch trending markets on open ──────────────────────────────────
  const fetchMarkets = useCallback(async () => {
    setFetchingMarkets(true);
    try {
      const res = await fetch('/api/markets');
      if (!res.ok) throw new Error(`Gamma API ${res.status}`);
      const data = await res.json();
      setMarkets(data);
      console.log(`[BetModal] Loaded ${data.length} markets from Polymarket`);
    } catch (err) {
      console.error('[BetModal] Failed to fetch markets:', err);
      setMarkets([]);
    } finally {
      setFetchingMarkets(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      reset();
      setSelectedMarket(null);
      fetchMarkets();
    }
  }, [isOpen, fetchMarkets, reset]);

  // ── step 1: user clicks "Place Bet" → runs prepareBet ───────────────
  async function handlePlaceBet() {
    if (!address || !selectedMarket) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return;

    console.log(
      `[BetModal] User initiated bet: $${amt} on "${selectedMarket.question}" side=${side}`
    );
    await prepare(amt, address);
  }

  // ── step 2: user confirms bridge ────────────────────────────────────
  async function handleBridge() {
    await bridge();
  }

  // ── guard: modal closed ─────────────────────────────────────────────
  if (!isOpen) return null;

  // ── guard: wallet not connected ─────────────────────────────────────
  if (!isConnected || !address) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Place a Bet</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-center py-8">
            Connect your wallet first to place a bet.
          </p>
        </div>
      </div>
    );
  }

  // ── render ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Place a Bet</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* ── Market picker ──────────────────────────────────────── */}
        {!result && (
          <div className="space-y-4">
            {/* Market list */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Market</label>
              {fetchingMarkets ? (
                <p className="text-sm text-gray-500 py-4">Loading markets…</p>
              ) : markets.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No markets available.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {markets.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMarket(m)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedMarket?.id === m.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium truncate">{m.question}</p>
                      {m.volume && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Vol: ${(m.volume / 1e6).toFixed(2)}M
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Yes / No toggle */}
            {selectedMarket && (
              <div>
                <label className="block text-sm font-medium mb-2">Pick a Side</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSide('yes')}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      side === 'yes'
                        ? 'bg-green-500 text-white'
                        : 'border border-green-300 text-green-700 dark:border-green-700 dark:text-green-400'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setSide('no')}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-colors ${
                      side === 'no'
                        ? 'bg-red-500 text-white'
                        : 'border border-red-300 text-red-700 dark:border-red-700 dark:text-red-400'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {/* Amount input */}
            {selectedMarket && (
              <div>
                <label className="block text-sm font-medium mb-2">Amount (USD)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">$</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Min $1 · Max $1,000</p>
              </div>
            )}

            {/* Submit */}
            {selectedMarket && (
              <button
                onClick={handlePlaceBet}
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Checking balances…' : 'Place Bet'}
              </button>
            )}
          </div>
        )}

        {/* ── Flow status panel (after prepareBet runs) ─────────── */}
        {result && (
          <div className="space-y-4">
            {/* summary of what was picked */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm">
              <p><span className="font-medium">Market:</span> {selectedMarket?.question}</p>
              <p><span className="font-medium">Side:</span> {side === 'yes' ? '✅ Yes' : '❌ No'} &nbsp; <span className="font-medium">Amount:</span> ${amount}</p>
            </div>

            {/* Status badge */}
            <div className={`rounded-lg p-4 ${statusColor(result.status)}`}>
              <p className="font-semibold">{statusLabel(result.status)}</p>
              {result.error && (
                <p className="text-sm mt-1 opacity-80">{result.error}</p>
              )}
            </div>

            {/* Polygon balance */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {TARGET_CHAIN_NAME} USDC balance: <span className="font-semibold">${result.polygonBalance.toFixed(2)}</span>
            </p>

            {/* Chain scan results */}
            {result.allBalances && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Balances across chains</p>
                {result.allBalances.map((b) => (
                  <div key={b.chainId} className="flex justify-between text-sm py-0.5">
                    <span className={b.chainId === 137 ? 'font-semibold' : ''}>{b.chainName}{b.chainId === 137 ? ' ← target' : ''}</span>
                    <span className="font-mono">${b.balance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bridge route details + confirm */}
            {result.status === 'needs-bridge' && result.bestRoute && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Bridge Required
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <span className="font-medium">{result.sourceChain?.chainName}</span> → {TARGET_CHAIN_NAME}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Route: {result.bestRoute.steps.join(' → ')}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ~{Math.ceil(result.bestRoute.estimatedTimeSeconds / 60)} min · Gas ~${result.bestRoute.gasCostUsd}
                </p>
                <button
                  onClick={handleBridge}
                  disabled={loading}
                  className="mt-3 w-full btn-primary disabled:opacity-50"
                >
                  {loading ? 'Bridging…' : 'Confirm Bridge'}
                </button>
              </div>
            )}

            {/* Ready state — bet can be placed */}
            {result.status === 'ready' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ {TARGET_CHAIN_NAME} has enough USDC. Bet placement coming next.
                </p>
              </div>
            )}

            {/* Bridge in flight */}
            {result.status === 'bridging' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  🔄 Bridge is in progress… check console for live updates.
                </p>
              </div>
            )}

            {/* Back button */}
            <button
              onClick={() => reset()}
              className="w-full btn-secondary"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusLabel(status: string) {
  switch (status) {
    case 'ready':           return '✅ Ready to bet';
    case 'needs-bridge':    return '🔄 Bridge needed';
    case 'bridging':        return '⏳ Bridging…';
    case 'bridge-complete': return '✅ Bridge complete';
    case 'insufficient':    return '❌ Insufficient USDC';
    case 'error':           return '❌ Error';
    default:                return status;
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'ready':
    case 'bridge-complete':
      return 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800';
    case 'needs-bridge':
    case 'bridging':
      return 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800';
    case 'insufficient':
    case 'error':
      return 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700';
  }
}

'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { address } = useAccount();
  const [depositInfo, setDepositInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDepositInfo();
    }
  }, [isOpen]);

  async function fetchDepositInfo() {
    try {
      const response = await fetch('/api/wallet/deposit');
      if (response.ok) {
        const data = await response.json();
        setDepositInfo(data);
      }
    } catch (error) {
      console.error('Error fetching deposit info:', error);
    } finally {
      setLoading(false);
    }
  }

  async function linkWallet() {
    if (!address) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (response.ok) {
        await fetchDepositInfo();
      }
    } catch (error) {
      console.error('Error linking wallet:', error);
    } finally {
      setUpdating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Deposit USDC</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-4">
            {!depositInfo?.userWallet && address ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  Link your wallet to enable automatic deposit detection
                </p>
                <button onClick={linkWallet} disabled={updating} className="btn-primary w-full">
                  {updating ? 'Linking...' : 'Link Wallet'}
                </button>
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium mb-2">Platform Wallet Address</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={depositInfo?.platformWallet || ''}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(depositInfo?.platformWallet)}
                  className="btn-secondary"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Polygon network only</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside text-gray-700 dark:text-gray-300">
                {depositInfo?.instructions?.map((instruction: string, i: number) => (
                  <li key={i}>{instruction}</li>
                ))}
              </ol>
            </div>

            {depositInfo?.userWallet && (
              <div>
                <label className="block text-sm font-medium mb-2">Your Linked Wallet</label>
                <div className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 font-mono text-sm">
                  {depositInfo.userWallet}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Deposits from this address will be automatically credited
                </p>
              </div>
            )}

            <div className="pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current Balance:{' '}
                <span className="font-semibold">
                  ${depositInfo?.currentBalance?.toFixed(2) || '0.00'}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

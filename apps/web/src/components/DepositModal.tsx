'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useSession } from 'next-auth/react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { address } = useAccount();
  const { data: session } = useSession();
  const { signMessageAsync } = useSignMessage();
  const [depositInfo, setDepositInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
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
    } catch (err) {
      console.error('Error fetching deposit info:', err);
    } finally {
      setLoading(false);
    }
  }

  async function linkWallet() {
    if (!address || !session?.user?.id) return;

    setUpdating(true);
    setError(null);
    try {
      const message = `Link this wallet to Xmarket\n\nUser ID: ${session.user.id}\nAddress: ${address}\nTimestamp: ${Date.now()}`;

      const signature = await signMessageAsync({ message });

      const response = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, message, signature }),
      });

      if (response.ok) {
        await fetchDepositInfo();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to link wallet');
      }
    } catch (err) {
      if ((err as Error).message?.includes('User rejected')) {
        setError('Signature rejected by wallet');
      } else {
        setError('Failed to sign message');
      }
    } finally {
      setUpdating(false);
    }
  }

  async function unlinkWallet() {
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch('/api/wallet/link', { method: 'DELETE' });
      if (response.ok) {
        await fetchDepositInfo();
      } else {
        setError('Failed to unlink wallet');
      }
    } catch {
      setError('Failed to unlink wallet');
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
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {!depositInfo?.userWallet && address ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  Sign a message with your wallet to link it to your account
                </p>
                <button onClick={linkWallet} disabled={updating} className="btn-primary w-full">
                  {updating ? 'Sign in wallet...' : 'Sign & Link Wallet'}
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
                <div className="flex gap-2">
                  <div className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-900 font-mono text-sm truncate">
                    {depositInfo.userWallet}
                  </div>
                  <button
                    onClick={unlinkWallet}
                    disabled={updating}
                    className="px-3 py-2 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    {updating ? '...' : 'Remove'}
                  </button>
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

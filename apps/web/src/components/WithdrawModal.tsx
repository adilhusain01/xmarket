'use client';

import { useState } from 'react';
import { formatUsdc } from '@xmarket/shared';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
}

export function WithdrawModal({ isOpen, onClose, currentBalance }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleWithdraw() {
    setError('');
    setSuccess('');

    const withdrawAmount = parseFloat(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (withdrawAmount > currentBalance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: withdrawAmount }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message || 'Withdrawal request submitted successfully!');
        setAmount('');
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else {
        setError(data.error || 'Failed to process withdrawal');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Withdraw USDC</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount (USDC)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              max={currentBalance}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available: {formatUsdc(currentBalance)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAmount((currentBalance * 0.25).toFixed(2))}
              className="btn-secondary flex-1"
            >
              25%
            </button>
            <button
              onClick={() => setAmount((currentBalance * 0.5).toFixed(2))}
              className="btn-secondary flex-1"
            >
              50%
            </button>
            <button
              onClick={() => setAmount((currentBalance * 0.75).toFixed(2))}
              className="btn-secondary flex-1"
            >
              75%
            </button>
            <button
              onClick={() => setAmount(currentBalance.toFixed(2))}
              className="btn-secondary flex-1"
            >
              Max
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              USDC will be sent to your linked wallet address on the Polygon network. Processing
              may take a few minutes.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button onClick={handleWithdraw} disabled={loading} className="btn-primary flex-1">
              {loading ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

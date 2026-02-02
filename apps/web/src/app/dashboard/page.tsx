'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useSession, signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { formatUsdc } from '@xmarket/shared';
import { AuthButton } from '@/components/AuthButton';
import { DepositModal } from '@/components/DepositModal';
import { WithdrawModal } from '@/components/WithdrawModal';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    if (session) {
      // User data is in session
      setUser({
        balanceUsdc: session.user.balanceUsdc || 0,
        xUsername: session.user.xUsername,
        activeBets: 0,
        totalVolume: 0,
      });
      setLoading(false);
    }
  }, [session]);

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-600">Xmarket</h1>
            <AuthButton />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Welcome to Xmarket</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              Sign in with X to get started
            </p>
            <button onClick={() => signIn('twitter')} className="btn-primary text-lg px-8 py-3">
              Sign In with X
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary-600">Xmarket</h1>
          <div className="flex items-center gap-4">
            <ConnectButton />
            <AuthButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Balance Card */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Balance
            </h3>
            <p className="text-3xl font-bold">
              {user ? formatUsdc(user.balanceUsdc) : '$0.00'}
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Active Bets
            </h3>
            <p className="text-3xl font-bold">{user?.activeBets || 0}</p>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Total Volume
            </h3>
            <p className="text-3xl font-bold">
              {user ? formatUsdc(user.totalVolume || 0) : '$0.00'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <button onClick={() => setShowDepositModal(true)} className="btn-primary">
              Deposit USDC
            </button>
            <button onClick={() => setShowWithdrawModal(true)} className="btn-secondary">
              Withdraw USDC
            </button>
          </div>
        </div>

        {/* Modals */}
        <DepositModal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} />
        <WithdrawModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          currentBalance={user?.balanceUsdc || 0}
        />

        {/* X Account Status */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">X/Twitter Account</h2>
          {session?.user.xUsername ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300">
                  Connected as <span className="font-semibold">@{session.user.xUsername}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  You can now bet on Polymarket by mentioning @XmarketBot on X
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  ✓ Connected
                </span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your X account is linked and ready to use!
              </p>
            </div>
          )}
        </div>

        {/* How to Use */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">How to Use Xmarket</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Search for Markets</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Tweet <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    @XmarketBot find [topic]
                  </code>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Place a Bet</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Reply with{' '}
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    @XmarketBot bet [amount] yes/no
                  </code>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Check Your Balance</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Tweet{' '}
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    @XmarketBot balance
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="card">
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No recent activity. Start betting to see your history here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

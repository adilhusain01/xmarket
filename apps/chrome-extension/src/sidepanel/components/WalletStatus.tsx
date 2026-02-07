// Wallet status component - MetaMask connect/disconnect

import React from 'react';
import { useWallet } from '../hooks/useWallet';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletStatus() {
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  return (
    <div className="section">
      {isConnected && address ? (
        <div className="status-message" style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Wallet Connected</div>
              <div style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 2 }}>
                {truncateAddress(address)}
              </div>
            </div>
            <button
              onClick={disconnect}
              style={{
                background: 'transparent',
                border: '1px solid #bbf7d0',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: 11,
                color: '#166534',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={connect}
            disabled={isConnecting}
            className="btn btn-primary btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {isConnecting ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14 }}></div>
                Connecting...
              </>
            ) : (
              'Connect MetaMask'
            )}
          </button>
          {error && (
            <div style={{
              marginTop: 8,
              padding: 8,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 4,
              fontSize: 12,
              color: '#991b1b',
            }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Wallet status component - Custodial mode

import React from 'react';

export function WalletStatus() {
  return (
    <div className="section">
      <div className="status-message" style={{ 
        background: '#f0f9ff', 
        border: '1px solid #bfdbfe',
        color: '#1e40af'
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>🔒 Custodial Wallet</div>
        <div style={{ fontSize: 12 }}>
          Your funds are managed securely by Xmarket. No wallet connection needed.
        </div>
      </div>
    </div>
  );
}

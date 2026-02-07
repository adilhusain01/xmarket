// Bet flow status component

import React from 'react';
import type { BetFlowResult } from '../lib/bet-service';

interface BetFlowStatusProps {
  preparation: BetFlowResult;
  onExecuteBridge?: () => void;
  onPlaceBet?: () => void;
  isExecuting?: boolean;
}

export function BetFlowStatus({ preparation, onExecuteBridge, onPlaceBet, isExecuting }: BetFlowStatusProps) {
  const { status, polygonBalance, sourceChain, allBalances, bestRoute, error } = preparation;

  // Ready to bet directly on Polygon
  if (status === 'ready') {
    return (
      <div className="section">
        <div className="status-message status-success">
          <div style={{ fontWeight: 600 }}>✓ Ready to Place Bet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Your Polygon balance (${polygonBalance.toFixed(2)}) is sufficient.
          </div>
        </div>
        
        {onPlaceBet && (
          <button
            className="btn btn-primary btn-full"
            onClick={onPlaceBet}
            disabled={isExecuting}
            style={{ marginTop: 12 }}
          >
            {isExecuting ? (
              <>
                <div className="spinner" style={{ marginRight: 8 }}></div>
                Placing bet on Polymarket...
              </>
            ) : (
              'Execute Bet on Polymarket'
            )}
          </button>
        )}
      </div>
    );
  }

  // Simulated - demo mode success
  if (status === 'simulated') {
    return (
      <div className="section">
        <div className="section-title">Bet Execution Simulated</div>
        <div className="status-message status-success" style={{ color: '#0a0' }}>
          ✅ Transaction simulated successfully
        </div>
        <div style={{ 
          padding: 12, 
          background: '#f0f9f0', 
          border: '1px solid #c3e6cb',
          borderRadius: 6,
          fontSize: 13,
          marginTop: 12
        }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>📊 Details:</div>
          <div>• Amount: ${preparation.amountUsd.toFixed(2)}</div>
          <div>• Your Balance: ${preparation.polygonBalance.toFixed(2)}</div>
          <div>• Status: Ready (simulation mode)</div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#666', fontStyle: 'italic' }}>
            Note: Balance checks were real. Only transaction execution was simulated.
          </div>
        </div>
      </div>
    );
  }

  // Need to bridge from another chain
  if (status === 'needs-bridge' && bestRoute && sourceChain) {
    return (
      <div className="section">
        <div className="bridge-info">
          <div className="bridge-info-title">Bridge Required</div>
          <div className="bridge-info-details">
            <div>
              <strong>From:</strong> {sourceChain.chainName} (${sourceChain.balance.toFixed(2)}{' '}
              available)
            </div>
            <div>
              <strong>To:</strong> Polygon (current: ${polygonBalance.toFixed(2)})
            </div>
            <div>
              <strong>Route:</strong> {bestRoute.steps.join(' → ')}
            </div>
            <div>
              <strong>Est. Time:</strong> ~{Math.ceil(bestRoute.estimatedTimeSeconds / 60)} minutes
            </div>
            <div>
              <strong>Est. Gas:</strong> ${bestRoute.gasCostUsd}
            </div>
          </div>
        </div>

        {onExecuteBridge && (
          <button
            className="btn btn-primary btn-full"
            onClick={onExecuteBridge}
            disabled={isExecuting}
          >
            {isExecuting ? (
              <>
                <div className="spinner" style={{ marginRight: 8 }}></div>
                Executing bridge...
              </>
            ) : (
              'Confirm Bridge'
            )}
          </button>
        )}
      </div>
    );
  }

  // Bridging in progress
  if (status === 'bridging') {
    return (
      <div className="status-message status-info">
        <div className="loading">
          <div className="spinner"></div>
          Bridge in progress... Please wait.
        </div>
        <div style={{ fontSize: 12, marginTop: 8 }}>
          Your USDC is being transferred to Polygon. This may take a few minutes.
        </div>
      </div>
    );
  }

  // Bridge complete
  if (status === 'bridge-complete') {
    return (
      <div className="status-message status-success">
        <div style={{ fontWeight: 600 }}>✓ Bridge Complete</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>Your USDC is now on Polygon. Ready to bet!</div>
      </div>
    );
  }

  // Insufficient funds
  if (status === 'insufficient') {
    const total = allBalances?.reduce((sum, b) => sum + b.balance, 0) || 0;
    return (
      <div className="status-message status-error">
        <div style={{ fontWeight: 600 }}>Insufficient Balance</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          Total USDC across all chains: ${total.toFixed(2)}
        </div>
        <div style={{ fontSize: 12 }}>Required: ${preparation.amountUsd.toFixed(2)}</div>
        {allBalances && allBalances.length > 0 && (
          <div className="balance-list" style={{ marginTop: 12 }}>
            {allBalances.map((bal) => (
              <div key={bal.chainId} className="balance-item">
                <span className="balance-chain">{bal.chainName}</span>
                <span className="balance-amount">${bal.balance.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (status === 'error' && error) {
    return (
      <div className="status-message status-error">
        <div style={{ fontWeight: 600 }}>Error</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
      </div>
    );
  }

  // Loading states
  if (status === 'checking-polygon') {
    return (
      <div className="status-message status-info">
        <div className="loading">
          <div className="spinner"></div>
          Checking Polygon balance...
        </div>
      </div>
    );
  }

  if (status === 'scanning-chains') {
    return (
      <div className="status-message status-info">
        <div className="loading">
          <div className="spinner"></div>
          Scanning all chains for USDC...
        </div>
      </div>
    );
  }

  if (status === 'getting-route') {
    return (
      <div className="status-message status-info">
        <div className="loading">
          <div className="spinner"></div>
          Finding best bridge route...
        </div>
      </div>
    );
  }

  return null;
}

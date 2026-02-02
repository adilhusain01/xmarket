# Platform Wallet Setup Guide

## Creating a Platform Wallet

The platform wallet is the custodial wallet that holds user funds. Follow these steps to create and configure it securely.

### 1. Generate a New Wallet

**Option A: Using Node.js**

```javascript
const { ethers } = require('ethers');

// Generate new wallet
const wallet = ethers.Wallet.createRandom();

console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);

// SAVE THESE SECURELY!
```

**Option B: Using MetaMask or Hardware Wallet**

1. Create a new account in MetaMask
2. Export the private key (Settings > Security & Privacy > Export Private Key)
3. **Never use your personal wallet as the platform wallet**

### 2. Secure Storage

**CRITICAL**: The private key must be stored securely!

For development:
```bash
# .env file (NEVER commit to git)
PLATFORM_WALLET_PRIVATE_KEY="0x..."
PLATFORM_WALLET_ADDRESS="0x..."
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS="0x..."
```

For production:
- Use environment variables in your hosting platform
- Consider using a secrets manager (AWS Secrets Manager, Google Secret Manager, etc.)
- Use hardware security modules (HSM) for maximum security
- Consider multi-signature wallets for withdrawals

### 3. Fund the Wallet

The platform wallet needs:

1. **MATIC (for gas fees)**
   - Get MATIC on Polygon network
   - Recommended: 10-20 MATIC to start
   - Refill when balance drops below 5 MATIC

2. **USDC (initial reserve)**
   - Get USDC on Polygon network
   - Recommended: Start with at least $1000 reserve
   - This ensures you can process withdrawals

### 4. Get USDC on Polygon

**Option 1: Bridge from Ethereum**
1. Go to https://wallet.polygon.technology/bridge
2. Connect your wallet
3. Bridge USDC from Ethereum to Polygon

**Option 2: Buy on Exchange**
1. Buy USDC on Coinbase/Binance
2. Withdraw to your platform wallet address
3. **Make sure to select Polygon network!**

**Option 3: Swap on Polygon**
1. Get MATIC on Polygon
2. Use QuickSwap or Uniswap (Polygon) to swap for USDC
3. USDC contract: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

### 5. Configure Environment Variables

```bash
# Platform Wallet (Server-side only)
PLATFORM_WALLET_PRIVATE_KEY="0x1234...abc"  # KEEP SECRET!
PLATFORM_WALLET_ADDRESS="0xYourWalletAddress"

# Public (Client-side safe)
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS="0xYourWalletAddress"

# Polygon RPC
POLYGON_RPC_URL="https://polygon-rpc.com"
# Or use a dedicated provider:
# POLYGON_RPC_URL="https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY"
```

### 6. Test the Setup

```bash
# In apps/bot directory
npm run dev

# You should see:
# ✅ Wallet service initialized
# 📍 Platform wallet: 0x...
# 💰 Platform wallet balance: XX.XX USDC
```

### 7. Monitor the Wallet

**Important metrics to track:**

1. **Platform Balance** - Total USDC in wallet
2. **User Balances** - Sum of all user balances in database
3. **Reserve** - Platform Balance - User Balances (should stay positive)
4. **Gas Balance** - MATIC for transaction fees

**Set up alerts for:**
- Reserve dropping below $100
- MATIC balance below 1
- Large withdrawals (>$1000)
- Failed transactions

### 8. Security Best Practices

1. **Cold/Hot Wallet Split**
   - Keep majority of funds in cold wallet
   - Transfer to hot wallet (platform wallet) as needed
   - Minimum reserve in hot wallet

2. **Multi-Signature**
   - Use Gnosis Safe for large operations
   - Require 2-of-3 signatures for withdrawals >$10k

3. **Access Control**
   - Limit who has access to private key
   - Use role-based access in your team
   - Audit all wallet access

4. **Monitoring**
   - Set up alerts for all transactions
   - Daily balance reconciliation
   - Weekly security audits

5. **Backup**
   - Store mnemonic phrase in secure location
   - Multiple backup locations (safe, bank, etc.)
   - Test backup recovery process

### 9. Withdrawal Processing

The bot service automatically processes withdrawals:

```typescript
// User requests withdrawal via web app
// → Creates transaction in database with status='pending'
// → Bot picks up pending withdrawals
// → Validates balance and wallet address
// → Executes transfer
// → Updates transaction with txHash
```

**Manual withdrawal processing:**

```typescript
import { WalletService } from './services/wallet-service';

const walletService = new WalletService();
await walletService.processWithdrawal(userId, amount);
```

### 10. Troubleshooting

**Issue: "Insufficient funds for gas"**
- Fund wallet with more MATIC
- Check MATIC balance: https://polygonscan.com/address/YOUR_ADDRESS

**Issue: "Transaction underpriced"**
- Polygon network congestion
- Increase gas price in transaction
- Wait and retry

**Issue: "Nonce too low"**
- Reset nonce counter
- Clear pending transactions

**Issue: Deposits not being detected**
- Check wallet service is running
- Verify user's wallet address is linked
- Check Polygonscan for transaction status
- Ensure deposit was from linked address

## Production Checklist

Before going live:

- [ ] Platform wallet created and secured
- [ ] Private key stored in production secrets manager
- [ ] Wallet funded with MATIC (gas) and USDC (reserve)
- [ ] Environment variables configured
- [ ] Wallet monitoring set up
- [ ] Alerts configured
- [ ] Backup plan tested
- [ ] Team access documented
- [ ] Insurance considered (Nexus Mutual, etc.)
- [ ] Legal compliance reviewed
- [ ] Terms of Service updated with custodial disclaimer

## Support

For issues or questions about wallet setup:
- Check the logs in apps/bot
- Review Polygonscan transactions
- Contact support@xmarket.xyz

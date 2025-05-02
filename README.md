# Monad HUB (MCP)

The Monad Hub (MCP) is your all-in-one toolkit for interacting with the Monad testnet ecosystem. Whether you're trading tokens, minting NFTs, participating in price predictions, or analyzing blockchain data, MCP provides simple and powerful tools to help you get started.

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/zaki9501/MonadHub-MCP.git

# Navigate to the project directory
cd MonadHub-MCP

# Run the setup script
node setup.js
```

The setup script will:
- Install all required dependencies
- Guide you through configuration setup
- Create necessary directories
- Set up your environment variables

### Option 2: Manual Setup

If you prefer to set things up manually:

```bash
# Clone the repository
git clone https://github.com/zaki9501/MonadHub-MCP.git

# Navigate to the project directory
cd MonadHub-MCP

# Install dependencies
npm install

# Create and configure your environment
cp .env.example .env
```

Then edit `.env` with your credentials:
```env
# Required for transactions
PRIVATE_KEY=your_wallet_private_key

# Required for blockchain data
BLOCKVISION_API_KEY=your_blockvision_api_key

# Required for NFT operations
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_secret
```

### Getting API Keys

1. **BlockVision API Key**:
   - Visit [BlockVision](https://blockvision.org/)
   - Sign up for an account
   - Navigate to API Keys section
   - Create a new API key

2. **Pinata API Key**:
   - Go to [Pinata](https://www.pinata.cloud/)
   - Create an account
   - Navigate to API Keys
   - Generate new key pair

3. **Private Key** (⚠️ Use with caution):
   - Export from your wallet
   - Never share or commit this
   - Use a testnet-only wallet for safety

## 📋 Table of Contents
- [Features Overview](#features-overview)
- [Tool Categories](#tool-categories)
  - [Wallet & Account Tools](#wallet--account-tools)
  - [Trading Tools](#trading-tools)
  - [NFT Tools](#nft-tools)
  - [Analytics Tools](#analytics-tools)
  - [Price Prediction Tools](#price-prediction-tools)
- [Detailed Usage Guide](#detailed-usage-guide)
- [Common Operations](#common-operations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🌟 Features Overview

MCP integrates with major protocols on Monad testnet:

- **🔄 Trading & Swaps**: Monorail DEX integration for token swaps
- **🎨 NFT Operations**: Create, mint, and manage NFT collections
- **📊 Analytics**: BlockVisio integration for comprehensive blockchain data
- **🎯 Price Predictions**: Participate in Castora prediction markets
- **🚀 Meme Tokens**: Create and trade tokens on Nad.fun

## 🛠 Tool Categories

### Wallet & Account Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `get-mon-balance` | Check MON balance | `get-mon-balance 0x123...` |
| `retrieve_account_tokens` | List account tokens | `retrieve_account_tokens 0x123...` |
| `retrieve_account_nfts` | View owned NFTs | `retrieve_account_nfts 0x123...` |

### Trading Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `get_monorail_quote` | Get swap quote | `get_monorail_quote 1.5 MON USDC` |
| `execute_monorail_swap` | Execute swap | `execute_monorail_swap 1.5 MON USDC` |
| `trade_nadfun_token` | Trade meme tokens | `trade_nadfun_token buy 0x123... 100` |

### NFT Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `mint_nft` | Mint from collection | `mint_nft 0x123... 2` |
| `upload_to_pinata` | Upload NFT art | `upload_to_pinata image.png` |
| `track_nft_transaction` | Track mint status | `track_nft_transaction 0x123...` |

### Analytics Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `retrieve_token_holders` | List token holders | `retrieve_token_holders 0x123...` |
| `get_token_chart_data` | Price/volume charts | `get_token_chart_data 0x123...` |
| `retrieve_contract_source_code` | View contract code | `retrieve_contract_source_code 0x123...` |

### Price Prediction Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `submit_price_prediction` | Submit prediction | `submit_price_prediction 1 2500.75` |
| `claim_winnings` | Claim rewards | `claim_winnings 1 5` |
| `list_castora_pools` | View active pools | `list_castora_pools` |

## 📖 Detailed Usage Guide

### Setting Up Your Environment

1. **API Keys Setup**:
   ```env
   PRIVATE_KEY=your_wallet_private_key
   BLOCKVISION_API_KEY=your_blockvision_api_key
   PINATA_API_KEY=your_pinata_api_key
   PINATA_API_SECRET=your_pinata_secret
   ```

2. **Wallet Configuration**:
   - Ensure your wallet has sufficient MON for transactions
   - Keep your private key secure and never share it

### Common Operations

#### 1. Trading Tokens
```javascript
// Get a quote first
const quote = await mcp.get_monorail_quote({
    fromTokenAddress: "MON",
    toTokenAddress: "USDC",
    amount: "1.5"
});

// Execute the swap if quote looks good
const swap = await mcp.execute_monorail_swap({
    fromTokenAddress: "MON",
    toTokenAddress: "USDC",
    amount: "1.5",
    slippage: 0.5 // 0.5% slippage tolerance
});
```

#### 2. Minting NFTs
```javascript
// Upload artwork first
const imageUrl = await mcp.upload_to_pinata({
    imageData: "path/to/image.png"
});

// Mint NFT
const mint = await mcp.mint_nft({
    contractAddress: "0x123...",
    quantity: 2,
    useContractPrice: true
});

// Track mint status
const status = await mcp.track_nft_transaction({
    transactionHash: mint.txHash
});
```

#### 3. Creating Meme Tokens
```javascript
const token = await mcp.trade_nadfun_token({
    action: "create_token",
    name: "MyMemeToken",
    symbol: "MEME",
    totalSupply: "1000000"
});
```

#### 4. Price Predictions
```javascript
// View available pools
const pools = await mcp.list_castora_pools();

// Submit prediction
const prediction = await mcp.submit_price_prediction({
    poolId: 1,
    predictedPrice: 2500.75
});
```

## 🔧 Troubleshooting

Common issues and solutions:

1. **Transaction Failures**
   - Ensure sufficient MON balance
   - Check slippage settings
   - Verify contract approval status

2. **API Errors**
   - Verify API keys are correctly set
   - Check network connectivity
   - Ensure you're using correct contract addresses

3. **NFT Minting Issues**
   - Confirm collection is still minting
   - Check mint price and wallet balance
   - Verify collection allows public minting

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Monad Documentation](https://docs.monad.xyz)
- [Monad Testnet Explorer](https://testnet.monad.xyz)
- [Monorail DEX](https://testnet.monorail.xyz)
- [Nad.fun Platform](https://testnet.nad.fun)
- [Castora Predictions](https://testnet.castora.xyz)

---

Need help? Join our [Discord](https://discord.gg/monad) or [Telegram](https://t.me/monad) communities!

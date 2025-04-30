# Monad Control Panel (MCP)

The Monad Control Panel is a comprehensive toolkit for interacting with various protocols and services on the Monad testnet. This toolkit provides easy access to BlockVisio, Castora, Monorail DEX, Nad.fun, and NFT functionalities.

## Table of Contents
- [Installation](#installation)
- [Features](#features)
- [Available Tools](#available-tools)
  - [BlockVisio](#blockvisio)
  - [Castora](#castora)
  - [Monorail DEX](#monorail-dex)
  - [Nad.fun](#nadfun)
  - [NFT Tools](#nft-tools)
- [Usage Examples](#usage-examples)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/MonadHub-MCP.git

# Navigate to the project directory
cd MonadHub-MCP

# Install dependencies
npm install
```

## Features

- **BlockVisio Integration**: Comprehensive blockchain explorer functionality
- **Castora Price Predictions**: Participate in price prediction markets
- **Monorail DEX**: Decentralized token swapping
- **Nad.fun**: Meme token creation and trading platform
- **NFT Tools**: Create and manage NFT collections

## Available Tools

### BlockVisio

#### Account Information
- `get-mon-balance` - Check MON balance for any address
- `retrieve_account_tokens` - Get list of tokens owned by an account
- `retrieve_account_nfts` - Get NFTs owned by an account
- `retrieve_account_activities` - Get account activity history
- `retrieve_account_transactions` - Get transaction history
- `retrieve_account_internal_transactions` - Get internal transaction history

#### Token & Collection Analytics
- `retrieve_token_holders` - Get list of token holders
- `retrieve_monad_holders` - Get list of MON token holders
- `retrieve_collection_holders` - Get NFT collection holders
- `retrieve_token_activities` - Get token-specific activities
- `retrieve_collection_activities` - Get collection activities
- `retrieve_contract_source_code` - Get verified contract source code
- `retrieve_token_gating` - Check token gating information

### Castora

#### Price Prediction Platform
- `submit_price_prediction` - Submit price predictions for assets
- `claim_winnings` - Claim rewards from successful predictions
- `list_castora_pools` - View available prediction pools

### Monorail DEX

#### Trading Operations
- `get_monorail_quote` - Get token swap quotes
- `execute_monorail_swap` - Execute token swaps

### Nad.fun

#### Token Management
- `trade_nadfun_token` - Create and trade meme tokens
- `get_token_by_market_cap` - List tokens ordered by market cap
- `get_tokens_by_creation_time` - List newest tokens
- `get_tokens_by_latest_trade` - List recently traded tokens
- `get_token_chart_data` - Get price and volume charts
- `get_token_swap_history` - Get token swap history
- `get_token_metadata` - Get detailed token information

### NFT Tools

#### NFT Creation & Management
- `create_nft_collection` - Create and mint NFT collections
- `upload_to_pinata` - Upload images to IPFS via Pinata### Command Table

The following table provides a quick reference for key MCP tools, their descriptions, and example commands to use them via the MCP interface.

|
 Feature                     
|
 Description                                           
|
 Example Command                                                                 
|
|
-----------------------------
|
-------------------------------------------------------
|
---------------------------------------------------------------------------------
|
|
**
get-mon-balance
**
|
 Check the MON balance for a Monad testnet address     
|
`check mon balance for 0xa2573a37744ea28e5e2848817e9d66c6cb9f765`
|
|
**
retrieve_account_tokens
**
|
 Get list of tokens owned by an account                
|
`get tokens for 0xa2573a37744ea28e5e2848817e9d66c6cb9f765`
|
|
**
retrieve_account_nfts
**
|
 Get NFTs owned by an account                          
|
`get nfts for 0xa2573a37744ea28e5e2848817e9d66c6cb9f765`
|
|
**
retrieve_account_transactions
**
|
 Get transaction history for an account           
|
`get transactions for 0xa2573a37744ea28e5e2848817e9d66c6cb9f765`
|
|
**
retrieve_token_holders
**
|
 Get list of holders for a specific token              
|
`get holders for token 0x1234...5678`
|
|
**
retrieve_collection_holders
**
|
 Get holders of an NFT collection                  
|
`get holders for collection 0x9876...5432`
|
|
**
submit_price_prediction
**
|
 Submit a price prediction on Castora                  
|
`submit prediction for ETH at 3000 on 2025-05-01`
|
|
**
claim_winnings
**
|
 Claim winnings from a Castora prediction pool         
|
`claim winnings from pool 123`
|
|
**
list_castora_pools
**
|
 View available prediction pools on Castora            
|
`list castora pools`
|
|
**
get_monorail_quote
**
|
 Get a token swap quote on Monorail DEX                
|
`get swap quote from 0x1234...5678 to 0x9876...5432 for 1.0`
|
|
**
execute_monorail_swap
**
|
 Execute a token swap on Monorail DEX                  
|
`swap 1.0 from 0x1234...5678 to 0x9876...5432`
|
|
**
trade_nadfun_token
**
|
 Create or trade a meme token on Nad.fun               
|
`create token MyToken with symbol MTK and supply 1000000`
|
|
**
get_token_by_market_cap
**
|
 List Nad.fun tokens by market cap                     
|
`list tokens by market cap`
|
|
**
get_token_metadata
**
|
 Get detailed metadata for a Nad.fun token             
|
`get metadata for token 0x1234...5678`
|
|
**
create_nft_collection
**
|
 Create an NFT collection on Monad testnet             
|
`create nft collection MyNFT with symbol MNFT and supply 1000`
|
|
**
upload_to_pinata
**
|
 Upload an image to IPFS via Pinata for NFT creation   
|
`upload image mynft.jpg to pinata`
||

|
|
**
get_market_data
**
|



## Usage Examples

### Checking Account Balance
```javascript
const balance = await mcp.get_mon_balance({
    address: "0x..."
});
```

### Creating a Meme Token
```javascript
const tokenResult = await mcp.trade_nadfun_token({
    action: "create_token",
    name: "MyToken",
    symbol: "MTK",
    totalSupply: "1000000"
});
```

### Executing a Token Swap
```javascript
const swapResult = await mcp.execute_monorail_swap({
    fromTokenAddress: "0x...",
    toTokenAddress: "0x...",
    amount: "1.0"
});
```

### Creating an NFT Collection
```javascript
const nftResult = await mcp.create_nft_collection({
    name: "My NFT Collection",
    symbol: "MNFT",
    description: "A unique collection of digital art",
    artType: "unique",
    maxSupply: 1000,
    royaltyFee: 2.5,
    recipientAddress: "0x...",
    collectionImageUrl: "ipfs://..."
});
```

## Contributing

We welcome contributions to the Monad Control Panel! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

For more information, visit [Monad Documentation](https://docs.monad.xyz)

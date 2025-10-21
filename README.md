<div align="center">

# 💎 Aster MCP Server v0.1.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![MCP Protocol](https://img.shields.io/badge/MCP-2024--11--05-blue)](https://modelcontextprotocol.io)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com)

**Production-ready Model Context Protocol (MCP) server for AsterDEX**

[Features](#-features) • [Quick Start](#-quick-start) • [Tools](#-available-tools) • [Prompts](#-prompts) • [Security](#-security) • [Contributing](#-contributing)

</div>

---

## 🚀 Features

### 🏗️ **Multi-Chain Support**
- **Ethereum** - EVM-compatible smart contracts
- **Arbitrum** - Layer 2 scaling solution
- **BNB Chain** - High-performance blockchain
- **Solana** - Ultra-fast blockchain with low fees
- Seamless cross-chain operations

### 🛠️ **Comprehensive Trading Tools**
- Wallet creation for all supported networks
- On-chain balance checks (native & tokens)
- Market buy orders on AsterDEX
- Real-time price data
- Deposit & withdrawal operations
- Cross-chain swap & bridge in one command

### 🔧 **Developer-Friendly**
- Simple JSON-RPC interface
- Comprehensive error handling
- Environment-based per-network configuration
- Docker containerization support
- MCP protocol 2024-11-05 implementation
- Automatic token symbol resolution (USDT, ARB, etc.)

### 🎯 **Production-Ready Architecture**
- Dual-server design (HTTP + MCP stdio)
- Rate limiting built-in
- EIP-712 signatures for secure withdrawals
- Automatic ERC20 token approval handling
- Per-network wallet configuration
- Graceful error handling and logging

---

## 📦 Quick Start

### ✅ Prerequisites
```bash
# Required
Node.js >= 18.0.0
npm >= 9.0.0
```

### 🔑 Configuration

Create a `.env` file with your configuration:

**Required for Trading:**
- **ASTER_API_KEY:** Your AsterDEX API key
- **ASTER_API_SECRET:** Your AsterDEX API secret
- **ASTER_API_BASE_URL:** AsterDEX API endpoint (default: https://sapi.asterdex.com)

**Per-Network Wallet Configuration (for deposits/withdrawals):**
- **ETHEREUM_WALLET_PRIVATE_KEY** or **ETHEREUM_WALLET_MNEMONIC**
- **ARBITRUM_WALLET_PRIVATE_KEY** or **ARBITRUM_WALLET_MNEMONIC**
- **BNB_WALLET_PRIVATE_KEY** or **BNB_WALLET_MNEMONIC**
- **SOLANA_WALLET_PRIVATE_KEY** or **SOLANA_WALLET_MNEMONIC**

**RPC Endpoints (optional, defaults provided):**
- **ETHEREUM_RPC_URL** (default: https://eth.llamarpc.com)
- **ARBITRUM_RPC_URL** (default: https://arbitrum-one-rpc.publicnode.com)
- **BNB_RPC_URL** (default: https://bsc-rpc.publicnode.com)
- **SOLANA_RPC_URL** (default: https://solana-rpc.publicnode.com)

**Debug Mode (optional):**
- **DEBUG_FULL** - Set to `true` for detailed transaction logging including gas usage, allowances, block numbers, and tx hashes (default: false)

### 📥 Installation

```bash
# Clone the repository
git clone https://github.com/Tairon-ai/aster-mcp.git
cd aster-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API credentials and wallet keys

# Start the HTTP server
npm start

# MCP stdio server for Claude Desktop
npm run mcp
```

### 🤖 Claude Desktop Integration

In Claude Desktop settings, go to the **Developer** tab and edit the configuration by adding the following:

```json
{
  "mcpServers": {
    "aster-dex": {
      "command": "node",
      "args": ["/path/to/aster-mcp/mcp/index.js"],
      "env": {
        "ASTER_API_KEY": "your_api_key_here",
        "ASTER_API_SECRET": "your_api_secret_here",
        "ETHEREUM_WALLET_PRIVATE_KEY": "0x...",
        "ARBITRUM_WALLET_PRIVATE_KEY": "0x...",
        "BNB_WALLET_PRIVATE_KEY": "0x...",
        "SOLANA_WALLET_PRIVATE_KEY": "base58_key_here"
      }
    }
  }
}
```

---

## 🛠 Available Tools

### 💼 **Wallet Management**

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `create_evm_wallet` | Create new EVM wallet (Ethereum/Arbitrum/BNB) | `network` (ethereum/arbitrum/bnb) | Address, private key, mnemonic |
| `create_solana_wallet` | Create new Solana wallet | None | Address, private key, mnemonic |

### 💰 **Balance & Portfolio**

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `get_network_balance` | Check on-chain wallet balance | `network`, `address` (optional), `tokenAddress` (optional) | Balance, decimals, symbol |
| `get_account_balance` | Get AsterDEX exchange balance | None | Available & locked balances for all assets |

### 📊 **Market Data**

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `get_price` | Get current market price | `symbol` (e.g., ETHUSDT) | Current price & 24h stats |
| `get_exchange_info` | Get exchange trading rules | `symbol` (optional) | Trading pairs, filters, limits |

### 🛒 **Trading**

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `market_buy` | Execute market buy order | `symbol` (e.g., BTCUSDT), `quoteAmount` (e.g., "100") | Order details & execution price |

### 📥 **Deposits & Withdrawals**

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `deposit` | Deposit tokens to AsterDEX | `network`, `token`, `amount`, `privateKey` (optional) | Transaction hash & status |
| `get_withdraw_fee` | Get withdrawal fee estimate | `token`, `network` | Fee amount & network |
| `withdraw` | Withdraw from AsterDEX to wallet | `network`, `token`, `amount`, `toAddress` (optional), `privateKey` (optional) | Transaction details & status |

### 🌉 **Cross-Chain Operations**

| Tool | Description | Parameters | Returns |
|------|-------------|------------|---------|
| `swap_and_bridge` | Cross-chain swap in one command | `fromNetwork`, `fromToken`, `fromAmount`, `targetToken`, `toNetwork`, `toAddress`, `privateKey` (optional) | Complete transaction flow details |

---

## 🤖 Prompts

### 💼 **Wallet Management**

```
"Create a new Ethereum wallet"
"Generate a Solana wallet for me"
"Create an Arbitrum wallet"
```

### 💰 **Balance Checks**

```
"Check my Ethereum balance"
"What's my USDT balance on Arbitrum?"
"Show balance of 0x... on Ethereum"
"Check SOL balance of [solana_address]"
```

### 📊 **Exchange Balance & Info**

```
"Show my AsterDEX account balance"
"What's my balance on the exchange?"
"Get exchange info for BTCUSDT"
"Show all available trading pairs"
```

### 💹 **Price Checks**

```
"What's the current price of BTCUSDT?"
"Get ETH price in USDT"
"Show me ASTER price"
```

### 🛒 **Trading**

```
"Buy BTC for 2 USDT"
"Market buy ETHUSDT with 1 USDT"
"Buy ASTER for 3 USDT"
"Execute market buy of 2 USDT worth of BTC"
```

### 📥 **Deposits**

```
"Deposit 1 USDT from Ethereum to AsterDEX"
"Deposit 2 SOL from Solana"
"Deposit 3 USDC from Arbitrum"
"Transfer 1.5 BNB from BNB Chain to exchange"
```

### 📤 **Withdrawals**

```
"What's the withdrawal fee for USDT on Ethereum?"
"Get withdrawal fee for BTC on Arbitrum"
"Withdraw 2 USDT to 0x... on Ethereum"
"Send 1 USDC to my Arbitrum wallet 0x..."
"Withdraw 1 USDT to my wallet on BNB Chain"
"Withdraw 0.5 ETH on Ethereum (to my env wallet)"
```

### 🌉 **Cross-Chain Swaps**

```
"Deposit 2 USDT from BNB, buy USDC, and withdraw to Arbitrum address 0x..."
"Swap 1 USDC from Ethereum to BTC and bridge to Arbitrum"
"Deposit 3 USDT from Arbitrum, swap to ASTER, withdraw to BSC 0x..."
```

### 🔧 Testing Tools

```bash
# Test with curl (HTTP endpoint)
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_price", "arguments": {"symbol": "BTCUSDT"}}, "id": 1}'

# Health check
curl http://localhost:8080/health

# Server info
curl http://localhost:8080/info
```

---

## 🔒 Security

### 🛡️ Security Best Practices

- **API Key Protection** - Never commit `.env` files or API keys to version control
- **Per-Network Wallets** - Each network has isolated wallet configuration
- **Private Key Security** - Private keys never leave your environment, only used for signing
- **Environment Variables** - All sensitive data stored in environment variables
- **Input Validation** - All inputs validated before processing
- **EIP-712 Signatures** - Secure withdrawal signatures following Ethereum standards
- **Rate Limiting** - Built-in rate limiting prevents API abuse
- **Secure Communication** - HTTPS for all external API calls
- **Error Handling** - Errors don't expose sensitive information

### 🔐 Wallet Configuration Priority

The server uses this priority order for wallet credentials:
1. **User-provided private key** (in tool parameters)
2. **Network-specific private key** (from `NETWORK_WALLET_PRIVATE_KEY` env var)
3. **Network-specific mnemonic** (from `NETWORK_WALLET_MNEMONIC` env var)

### ⚠️ Important Security Notes

- **Solana private keys** must be in base58 format (NO 0x prefix!)
- **EVM private keys** must be in hex format WITH 0x prefix
- Keep separate wallets for different networks if needed
- Use hardware wallets or secure key management in production
- Never share your private keys or mnemonics

---

## 🚀 Deployment

### 🏭 Production Deployment

```bash
# Start production HTTP server
NODE_ENV=production npm start

# With PM2
pm2 start server.js --name aster-mcp

# With Docker
docker build -t aster-mcp .
docker run -d -p 8080:8080 --env-file .env aster-mcp

# Docker Compose
docker-compose up -d
```

### 🔑 Environment Variables

```env
# Aster DEX API Configuration
ASTER_API_KEY=your_api_key_here
ASTER_API_SECRET=your_api_secret_here
ASTER_API_BASE_URL=https://sapi.asterdex.com
ASTER_RECV_WINDOW=5000

# Ethereum Wallet (EVM - hex format with 0x prefix)
ETHEREUM_WALLET_PRIVATE_KEY=0x_your_ethereum_private_key_here
ETHEREUM_WALLET_MNEMONIC=your twelve word ethereum mnemonic phrase here
ETHEREUM_RPC_URL=https://eth.llamarpc.com

# Arbitrum Wallet (EVM - hex format with 0x prefix)
ARBITRUM_WALLET_PRIVATE_KEY=0x_your_arbitrum_private_key_here
ARBITRUM_WALLET_MNEMONIC=your twelve word arbitrum mnemonic phrase here
ARBITRUM_RPC_URL=https://arbitrum-one-rpc.publicnode.com

# BNB Chain Wallet (EVM - hex format with 0x prefix)
BNB_WALLET_PRIVATE_KEY=0x_your_bnb_private_key_here
BNB_WALLET_MNEMONIC=your twelve word bnb mnemonic phrase here
BNB_RPC_URL=https://bsc-rpc.publicnode.com

# Solana Wallet (base58 format - NO 0x prefix!)
SOLANA_WALLET_PRIVATE_KEY=your_solana_private_key_base58_here
SOLANA_WALLET_MNEMONIC=your twelve word solana mnemonic phrase here
SOLANA_RPC_URL=https://solana-rpc.publicnode.com

# Server Configuration
PORT=8080
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_SECOND=10

# Debug Mode (set to 'true' for detailed transaction logging)
# Enables verbose logging for deposits, approvals, and transactions
# Shows: RPC URLs, gas usage, allowances, block numbers, tx hashes
DEBUG_FULL=false
```

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our development process.

```bash
# Fork the repository
git clone https://github.com/Tairon-ai/aster-mcp.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git commit -m 'feat: add amazing feature'
git push origin feature/amazing-feature

# Open Pull Request
```

### 📝 Development Guidelines

- Follow existing code style and structure
- Add tests for new features
- Update documentation for API changes
- Ensure security best practices
- Test with all supported networks

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📚 Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [AsterDEX Documentation](https://asterdex.com/docs)
- [AsterDEX Spot API](https://github.com/asterdex/api-docs/blob/master/aster-finance-spot-api.md)
- [Express.js Documentation](https://expressjs.com/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)

---

## 🎯 Supported Networks & Chains

| Network | Chain ID | Type | Native Token |
|---------|----------|------|--------------|
| Ethereum | 1 | EVM | ETH |
| Arbitrum | 42161 | EVM L2 | ETH |
| BNB Chain | 56 | EVM | BNB |
| Solana | mainnet-beta | Non-EVM | SOL |

---

## 🔗 Links

- **Website:** [asterdex.com](https://asterdex.com)
- **Documentation:** [docs.asterdex.com](https://docs.asterdex.com)
- **API Reference:** [sapi.asterdex.com](https://sapi.asterdex.com)
- **Support:** [support@asterdex.com](mailto:support@asterdex.com)

---

<div align="center">

**Built by [Tairon.ai](https://tairon.ai) team with help from Claude**

</div>

#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const dotenv = require('dotenv');
const ToolsAPI = require('./tools.js');

dotenv.config();

const toolsApi = new ToolsAPI();

const server = new Server(
    {
        name: 'aster-mcp-server',
        version: '0.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Aster DEX MCP Tools
const TOOLS = [
    {
        name: 'create_evm_wallet',
        description: 'Create a new wallet for EVM-compatible chains (Ethereum, Arbitrum, or BNB Chain). Returns wallet address, private key, and mnemonic seed phrase.',
        inputSchema: {
            type: 'object',
            properties: {
                network: {
                    type: 'string',
                    description: 'Network to create wallet for: ethereum, arbitrum, or bnb',
                    enum: ['ethereum', 'arbitrum', 'bnb'],
                },
            },
            required: ['network'],
        },
    },
    {
        name: 'create_solana_wallet',
        description: 'Create a new wallet for Solana network. Returns wallet address, private key, and mnemonic seed phrase.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'get_account_balance',
        description: 'Get account balance on Aster Exchange. Returns available and locked balances for all assets.',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'market_buy',
        description: 'Execute a market buy order on Aster Exchange. Buys crypto at current market price using specified quote amount.',
        inputSchema: {
            type: 'object',
            properties: {
                symbol: {
                    type: 'string',
                    description: 'Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")',
                },
                quoteAmount: {
                    type: 'string',
                    description: 'Amount of quote asset to spend (e.g., "100" for 100 USDT)',
                },
            },
            required: ['symbol', 'quoteAmount'],
        },
    },
    {
        name: 'get_price',
        description: 'Get latest price for a trading pair on Aster Exchange.',
        inputSchema: {
            type: 'object',
            properties: {
                symbol: {
                    type: 'string',
                    description: 'Trading pair symbol (e.g., "BTCUSDT", "ETHUSDT")',
                },
            },
            required: ['symbol'],
        },
    },
    {
        name: 'get_exchange_info',
        description: 'Get exchange information including all trading pairs, trading rules, price/quantity filters, and rate limits. Can optionally filter by specific symbol.',
        inputSchema: {
            type: 'object',
            properties: {
                symbol: {
                    type: 'string',
                    description: 'Optional: Trading pair symbol to get info for specific pair (e.g., "BTCUSDT")',
                },
            },
            required: [],
        },
    },
    {
        name: 'get_network_balance',
        description: 'Check on-chain balance for any wallet address on Ethereum, Arbitrum, BNB Chain, or Solana. Supports native tokens (ETH, BNB, SOL) and ERC20/SPL tokens. If address not provided, uses wallet from environment variables. If user provides address without network, ask which network or check all networks. Address format: 0x... for EVM chains (42 chars), base58 for Solana (32-44 chars).',
        inputSchema: {
            type: 'object',
            properties: {
                network: {
                    type: 'string',
                    description: 'Network name: ethereum, arbitrum, bnb, or solana. REQUIRED. If user does not specify, ask or infer from address format.',
                    enum: ['ethereum', 'arbitrum', 'bnb', 'solana'],
                },
                address: {
                    type: 'string',
                    description: 'Optional: Wallet address to check balance for (0x... for EVM chains, base58 for Solana). If not provided, uses wallet configured in environment variables for the specified network.',
                },
                tokenAddress: {
                    type: 'string',
                    description: 'Optional: Token contract address for ERC20 (EVM) or mint address (Solana). Can also use token symbol like "USDT", "ARB". Omit for native token balance.',
                },
            },
            required: ['network'],
        },
    },
    {
        name: 'deposit',
        description: 'Deposit tokens from blockchain to AsterDEX exchange. Automatically handles token approval for ERC20 tokens. Supports Ethereum, Arbitrum, BNB Chain, and Solana.',
        inputSchema: {
            type: 'object',
            properties: {
                network: {
                    type: 'string',
                    description: 'Source network: ethereum, arbitrum, bnb, or solana',
                    enum: ['ethereum', 'arbitrum', 'bnb', 'solana'],
                },
                token: {
                    type: 'string',
                    description: 'Token to deposit: symbol like "USDT", "SOL", "USDC" or contract address',
                },
                amount: {
                    type: 'string',
                    description: 'Amount to deposit (e.g., "100.5")',
                },
                privateKey: {
                    type: 'string',
                    description: 'Optional: Private key for signing (base58 for Solana, hex for EVM)',
                },
            },
            required: ['network', 'token', 'amount'],
        },
    },
    {
        name: 'get_withdraw_fee',
        description: 'Get estimated withdrawal fee for a specific token and network from Aster Exchange.',
        inputSchema: {
            type: 'object',
            properties: {
                token: {
                    type: 'string',
                    description: 'Token symbol (e.g., "USDT", "BTC", "ETH")',
                },
                network: {
                    type: 'string',
                    description: 'Network to withdraw to: ethereum, arbitrum, or bnb',
                    enum: ['ethereum', 'arbitrum', 'bnb'],
                },
            },
            required: ['token', 'network'],
        },
    },
    {
        name: 'withdraw',
        description: 'Withdraw assets from Aster Exchange to external wallet. Uses EIP-712 signature for security. If destination address not provided, withdraws to the wallet configured in environment variables for the specified network.',
        inputSchema: {
            type: 'object',
            properties: {
                network: {
                    type: 'string',
                    description: 'Network to withdraw to: ethereum, arbitrum, or bnb',
                    enum: ['ethereum', 'arbitrum', 'bnb'],
                },
                token: {
                    type: 'string',
                    description: 'Token symbol to withdraw (e.g., "USDT", "BTC", "ETH")',
                },
                amount: {
                    type: 'string',
                    description: 'Amount to withdraw (e.g., "100.5")',
                },
                toAddress: {
                    type: 'string',
                    description: 'Optional: Destination wallet address (0x... format for EVM). If not provided, uses wallet from environment variables.',
                },
                privateKey: {
                    type: 'string',
                    description: 'Optional: Private key for signing (if not provided, uses network-specific env variables)',
                },
            },
            required: ['network', 'token', 'amount'],
        },
    },
    {
        name: 'swap_and_bridge',
        description: 'Cross-chain swap through AsterDEX: Deposit tokens from one network → Swap to target token → Withdraw to another network. Example: "Deposit USDT from BNB, buy ASTER, withdraw to Arbitrum". One-command cross-chain trading!',
        inputSchema: {
            type: 'object',
            properties: {
                fromNetwork: {
                    type: 'string',
                    description: 'Source network to deposit from: ethereum, arbitrum, or bnb',
                    enum: ['ethereum', 'arbitrum', 'bnb'],
                },
                fromToken: {
                    type: 'string',
                    description: 'Token to deposit (e.g., "USDT", "BNB")',
                },
                fromAmount: {
                    type: 'string',
                    description: 'Amount to deposit and swap (e.g., "100")',
                },
                targetToken: {
                    type: 'string',
                    description: 'Token to buy/swap to (e.g., "ASTER", "BTC")',
                },
                toNetwork: {
                    type: 'string',
                    description: 'Destination network to withdraw to: ethereum, arbitrum, or bnb',
                    enum: ['ethereum', 'arbitrum', 'bnb'],
                },
                toAddress: {
                    type: 'string',
                    description: 'Destination wallet address on target network (0x... format)',
                },
                privateKey: {
                    type: 'string',
                    description: 'Optional: Private key for signing all transactions',
                },
            },
            required: ['fromNetwork', 'fromToken', 'fromAmount', 'targetToken', 'toNetwork', 'toAddress'],
        },
    },
];

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result;

        switch (name) {
            case 'create_evm_wallet':
                result = await toolsApi.createEvmWallet(args.network);
                break;

            case 'create_solana_wallet':
                result = await toolsApi.createSolanaWallet();
                break;

            case 'get_account_balance':
                result = await toolsApi.getAccountBalance();
                break;

            case 'market_buy':
                result = await toolsApi.marketBuy(args.symbol, args.quoteAmount);
                break;

            case 'get_price':
                result = await toolsApi.getPrice(args.symbol);
                break;

            case 'get_exchange_info':
                result = await toolsApi.getExchangeInfo(args.symbol);
                break;

            case 'get_network_balance':
                result = await toolsApi.getNetworkBalance(args.network, args.address, args.tokenAddress);
                break;

            case 'deposit':
                result = await toolsApi.deposit(args.network, args.token, args.amount, args.privateKey);
                break;

            case 'get_withdraw_fee':
                result = await toolsApi.getWithdrawFee(args.token, args.network);
                break;

            case 'withdraw':
                result = await toolsApi.withdraw(
                    args.network,
                    args.token,
                    args.amount,
                    args.toAddress,
                    args.privateKey
                );
                break;

            case 'swap_and_bridge':
                result = await toolsApi.swapAndBridge(
                    args.fromNetwork,
                    args.fromToken,
                    args.fromAmount,
                    args.targetToken,
                    args.toNetwork,
                    args.toAddress,
                    args.privateKey
                );
                break;

            default:
                throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Aster MCP Server running on stdio');
    console.error('Supported networks: Ethereum, Arbitrum, BNB Chain, Solana');
}

main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});

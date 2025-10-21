const { ethers } = require('ethers');
const { Keypair, Connection, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const bip39 = require('bip39');
const bs58 = require('bs58').default || require('bs58');
const {
    handleError,
    validateTradingSymbol,
    validateAmount,
    validateNetwork,
    formatBalance,
    getWalletPrivateKey,
    getNetworkPrivateKey,
    getNetworkRpcUrl,
    generateEIP712Signature,
    makeApiRequest
} = require('./utils');
const { getTokenConfig } = require('./tokens-config');
const {
    getDepositContract,
    ERC20_ABI,
    DEPOSIT_CONTRACT_ABI
} = require('./deposit-contracts');
const { createSolDepositInstruction } = require('./solana-deposit-builder');

/**
 * ToolsAPI - Main class for MCP tool implementations
 *
 * This class handles all tool functionality for the Aster MCP server.
 * Provides wallet generation and DEX integration tools for multiple chains.
 */
class ToolsAPI {
    constructor() {
        // Aster API Configuration
        this.asterApiKey = process.env.ASTER_API_KEY || '';
        this.asterApiSecret = process.env.ASTER_API_SECRET || '';
        this.asterBaseUrl = process.env.ASTER_API_BASE_URL || 'https://sapi.asterdex.com';
        this.recvWindow = parseInt(process.env.ASTER_RECV_WINDOW || '5000');

        // Debug mode
        this.debugFull = process.env.DEBUG_FULL === 'true';

        console.error('Aster MCP Server - ToolsAPI initialized');
        console.error(`API Base URL: ${this.asterBaseUrl}`);
        console.error(`API Key configured: ${this.asterApiKey ? 'Yes' : 'No'}`);
        console.error(`Debug Full: ${this.debugFull ? 'Enabled' : 'Disabled'}`);

        // Show wallet configuration status per chain
        console.error('Wallet Configuration:');
        const networks = ['ETHEREUM', 'ARBITRUM', 'BNB', 'SOLANA'];
        networks.forEach(network => {
            const hasPrivateKey = !!process.env[`${network}_WALLET_PRIVATE_KEY`];
            const hasMnemonic = !!process.env[`${network}_WALLET_MNEMONIC`];
            const status = hasPrivateKey ? 'Yes (PrivateKey)' : hasMnemonic ? 'Yes (Mnemonic)' : 'No';
            console.error(`  ${network.padEnd(10)}: ${status}`);
        });
    }



    /**
     * Make authenticated request to Aster API (wrapper around makeApiRequest util)
     * @param {string} endpoint - API endpoint (e.g., "/api/v1/account")
     * @param {string} method - HTTP method (GET, POST, DELETE)
     * @param {Object} params - Request parameters
     * @param {boolean} signed - Whether request requires signature (TRADE/USER_DATA)
     * @returns {Promise<Object>} API response
     * @private
     */
    async _asterApiRequest(endpoint, method = 'GET', params = {}, signed = false) {
        return makeApiRequest({
            baseUrl: this.asterBaseUrl,
            endpoint,
            method,
            params,
            signed,
            apiKey: this.asterApiKey,
            apiSecret: this.asterApiSecret,
            recvWindow: this.recvWindow
        });
    }

    /**
     * Create a new wallet for EVM-compatible chains (Ethereum, Arbitrum, BNB Chain)
     * @param {string} network - Network name: ethereum, arbitrum, or bnb
     * @returns {Object} Wallet details with address, private key, and mnemonic
     */
    async createEvmWallet(network = 'ethereum') {
        try {
            // Validate network (EVM only)
            validateNetwork(network, ['ethereum', 'arbitrum', 'bnb']);
            const networkLower = network.toLowerCase();

            // Generate mnemonic (12 words)
            const mnemonic = bip39.generateMnemonic();

            // Create wallet from mnemonic
            const wallet = ethers.Wallet.fromPhrase(mnemonic);

            // Network configuration
            const networkConfig = {
                ethereum: { name: 'Ethereum', chainId: 1, symbol: 'ETH' },
                arbitrum: { name: 'Arbitrum One', chainId: 42161, symbol: 'ETH' },
                bnb: { name: 'BNB Chain', chainId: 56, symbol: 'BNB' }
            };

            const config = networkConfig[networkLower];

            return {
                success: true,
                network: config.name,
                chainId: config.chainId,
                nativeToken: config.symbol,
                wallet: {
                    address: wallet.address,
                    privateKey: wallet.privateKey,
                    mnemonic: mnemonic
                },
                warning: '⚠️ SECURITY WARNING: Store your private key and mnemonic securely. Never share them with anyone!',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Create a new wallet for Solana
     * @returns {Object} Wallet details with address, private key, and mnemonic
     */
    async createSolanaWallet() {
        try {
            // Generate mnemonic (12 words)
            const mnemonic = bip39.generateMnemonic();

            // Convert mnemonic to seed
            const seed = await bip39.mnemonicToSeed(mnemonic);

            // Use first 32 bytes of seed for keypair
            const keypair = Keypair.fromSeed(seed.slice(0, 32));

            // Get private key in base58 format (standard for Solana)
            const privateKeyBase58 = bs58.encode(keypair.secretKey);

            // Get public key (wallet address)
            const publicKey = keypair.publicKey.toBase58();

            return {
                success: true,
                network: 'Solana',
                chainId: 'mainnet-beta',
                nativeToken: 'SOL',
                wallet: {
                    address: publicKey,
                    privateKey: privateKeyBase58,
                    mnemonic: mnemonic
                },
                warning: '⚠️ SECURITY WARNING: Store your private key and mnemonic securely. Never share them with anyone!',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Get account balance on Aster Exchange
     * @returns {Object} Account information with balances
     */
    async getAccountBalance() {
        try {
            // Call Aster API to get account information
            const response = await this._asterApiRequest('/api/v1/account', 'GET', {}, true);

            if (!response.success) {
                return {
                    success: false,
                    error: response.error
                };
            }

            const accountData = response.data;

            return {
                success: true,
                canTrade: accountData.canTrade,
                canDeposit: accountData.canDeposit,
                canWithdraw: accountData.canWithdraw,
                balances: accountData.balances.map(bal => formatBalance(bal)),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Execute market buy order on Aster Exchange
     * @param {string} symbol - Trading pair (e.g., "BTCUSDT")
     * @param {string} quoteAmount - Amount of quote asset to spend (e.g., "100" USDT)
     * @returns {Object} Order result
     */
    async marketBuy(symbol, quoteAmount) {
        try {
            // Validate parameters
            validateTradingSymbol(symbol);
            validateAmount(quoteAmount, 'quoteAmount');

            // Prepare order parameters
            const orderParams = {
                symbol: symbol.toUpperCase(),
                side: 'BUY',
                type: 'MARKET',
                quoteOrderQty: quoteAmount
            };

            // Execute market buy order
            const response = await this._asterApiRequest('/api/v1/order', 'POST', orderParams, true);

            if (!response.success) {
                return {
                    success: false,
                    error: response.error
                };
            }

            const orderData = response.data;

            return {
                success: true,
                order: {
                    orderId: orderData.orderId,
                    symbol: orderData.symbol,
                    side: orderData.side,
                    type: orderData.type,
                    status: orderData.status,
                    executedQty: orderData.executedQty,      // Amount of base asset bought
                    avgPrice: orderData.avgPrice,            // Average execution price
                    cumQuote: orderData.cumQuote,            // Total quote asset spent
                    updateTime: orderData.updateTime
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Get latest price for a trading pair
     * @param {string} symbol - Trading pair (e.g., "BTCUSDT")
     * @returns {Object} Price information
     */
    async getPrice(symbol) {
        try {
            // Validate symbol
            validateTradingSymbol(symbol);

            const response = await this._asterApiRequest('/api/v1/ticker/price', 'GET', {
                symbol: symbol.toUpperCase()
            }, false);

            if (!response.success) {
                return {
                    success: false,
                    error: response.error
                };
            }

            return {
                success: true,
                symbol: response.data.symbol,
                price: response.data.price,
                time: response.data.time,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Get exchange information including trading pairs, limits, and filters
     * @param {string} symbol - Optional trading pair to get info for specific symbol
     * @returns {Object} Exchange information
     */
    async getExchangeInfo(symbol = null) {
        try {
            const params = {};

            // If symbol provided, validate and add to params
            if (symbol) {
                validateTradingSymbol(symbol);
                params.symbol = symbol.toUpperCase();
            }

            const response = await this._asterApiRequest('/api/v1/exchangeInfo', 'GET', params, false);

            if (!response.success) {
                // Format error properly
                const errorMsg = typeof response.error === 'object'
                    ? response.error.message || JSON.stringify(response.error)
                    : response.error;

                return {
                    success: false,
                    error: errorMsg
                };
            }

            const exchangeData = response.data;

            // If specific symbol requested, return just that symbol's info
            if (symbol && exchangeData.symbols) {
                const symbolInfo = exchangeData.symbols.find(s => s.symbol === symbol.toUpperCase());

                if (!symbolInfo) {
                    return {
                        success: false,
                        error: `Symbol ${symbol.toUpperCase()} not found on exchange`
                    };
                }

                return {
                    success: true,
                    symbol: symbolInfo,
                    timezone: exchangeData.timezone,
                    serverTime: exchangeData.serverTime,
                    timestamp: new Date().toISOString()
                };
            }

            // Return full exchange info
            return {
                success: true,
                timezone: exchangeData.timezone,
                serverTime: exchangeData.serverTime,
                rateLimits: exchangeData.rateLimits || [],
                symbols: exchangeData.symbols || [],
                symbolCount: exchangeData.symbols ? exchangeData.symbols.length : 0,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Get on-chain balance for native tokens or ERC20 tokens
     * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
     * @param {string} address - Wallet address to check balance for (optional - uses env if not provided)
     * @param {string} tokenAddress - Optional: Token contract address OR token symbol (e.g., "USDT", "ARB")
     * @returns {Object} Balance information
     */
    async getNetworkBalance(network, address = null, tokenAddress = null) {
        try {
            // Validate network
            validateNetwork(network);
            const networkLower = network.toLowerCase();

            // If address not provided, derive from private key in env
            let walletAddress = address;
            if (!walletAddress) {
                try {
                    const privateKey = getNetworkPrivateKey(networkLower);

                    if (networkLower === 'solana') {
                        // Derive Solana address from private key
                        const secretKey = bs58.decode(privateKey);
                        const keypair = Keypair.fromSecretKey(secretKey);
                        walletAddress = keypair.publicKey.toBase58();
                        console.error(`Using Solana wallet from env: ${walletAddress}`);
                    } else {
                        // Derive EVM address from private key
                        const wallet = new ethers.Wallet(privateKey);
                        walletAddress = wallet.address;
                        console.error(`Using ${network} wallet from env: ${walletAddress}`);
                    }
                } catch (error) {
                    return {
                        success: false,
                        error: `No wallet address provided and unable to derive from environment: ${error.message}`
                    };
                }
            }

            // Get RPC URL
            const rpcUrl = getNetworkRpcUrl(networkLower);

            // If tokenAddress is provided, check if it's a symbol or address
            let resolvedTokenAddress = tokenAddress;
            let tokenSymbolFromConfig = null;

            if (tokenAddress && !tokenAddress.startsWith('0x') && tokenAddress.length < 40) {
                // Likely a token symbol (e.g., "USDT", "ARB")
                const tokenConfig = getTokenConfig(tokenAddress, networkLower);

                if (tokenConfig) {
                    if (tokenConfig.type === 'native') {
                        // Native token requested by symbol (ETH, BNB, SOL)
                        resolvedTokenAddress = null;
                        tokenSymbolFromConfig = tokenConfig.symbol;
                    } else {
                        // ERC20/SPL token
                        resolvedTokenAddress = tokenConfig.address;
                        tokenSymbolFromConfig = tokenConfig.symbol;
                    }
                } else {
                    return {
                        success: false,
                        error: `Token ${tokenAddress} is not supported on ${network}. Use contract address directly or add to tokens-config.js`
                    };
                }
            }

            if (networkLower === 'solana') {
                // Solana balance checking
                const connection = new Connection(rpcUrl, 'confirmed');
                const publicKey = new PublicKey(walletAddress);

                if (resolvedTokenAddress) {
                    // SPL token balance
                    const tokenPublicKey = new PublicKey(resolvedTokenAddress);
                    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                        mint: tokenPublicKey
                    });

                    if (tokenAccounts.value.length === 0) {
                        return {
                            success: true,
                            network: 'Solana',
                            address: walletAddress,
                            tokenAddress: resolvedTokenAddress,
                            balance: '0',
                            decimals: 0,
                            symbol: tokenSymbolFromConfig || 'SPL',
                            timestamp: new Date().toISOString()
                        };
                    }

                    const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
                    const balance = accountInfo.tokenAmount.uiAmount;
                    const decimals = accountInfo.tokenAmount.decimals;

                    return {
                        success: true,
                        network: 'Solana',
                        address: walletAddress,
                        tokenAddress: resolvedTokenAddress,
                        balance: balance.toString(),
                        decimals: decimals,
                        symbol: tokenSymbolFromConfig || 'SPL',
                        timestamp: new Date().toISOString()
                    };
                } else {
                    // Native SOL balance
                    const balance = await connection.getBalance(publicKey);
                    const balanceInSol = balance / 1e9; // Convert lamports to SOL

                    return {
                        success: true,
                        network: 'Solana',
                        address: walletAddress,
                        balance: balanceInSol.toString(),
                        decimals: 9,
                        symbol: tokenSymbolFromConfig || 'SOL',
                        timestamp: new Date().toISOString()
                    };
                }
            } else {
                // EVM networks (Ethereum, Arbitrum, BNB)
                const provider = new ethers.JsonRpcProvider(rpcUrl);

                // Normalize address (handle checksum)
                const normalizedAddress = ethers.getAddress(walletAddress.toLowerCase());

                // Network symbol mapping
                const networkSymbols = {
                    ethereum: 'ETH',
                    arbitrum: 'ETH',
                    bnb: 'BNB'
                };

                const symbol = networkSymbols[networkLower];

                if (resolvedTokenAddress) {
                    // ERC20 token balance
                    const erc20Abi = [
                        'function balanceOf(address owner) view returns (uint256)',
                        'function decimals() view returns (uint8)',
                        'function symbol() view returns (string)'
                    ];

                    const normalizedTokenAddress = ethers.getAddress(resolvedTokenAddress.toLowerCase());
                    const contract = new ethers.Contract(normalizedTokenAddress, erc20Abi, provider);

                    const [balance, decimals, tokenSymbol] = await Promise.all([
                        contract.balanceOf(normalizedAddress),
                        contract.decimals(),
                        contract.symbol()
                    ]);

                    const formattedBalance = ethers.formatUnits(balance, decimals);

                    return {
                        success: true,
                        network: network,
                        address: normalizedAddress,
                        tokenAddress: normalizedTokenAddress,
                        balance: formattedBalance,
                        decimals: Number(decimals), // Convert BigInt to Number
                        symbol: tokenSymbolFromConfig || tokenSymbol,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    // Native token balance (ETH, BNB)
                    const balance = await provider.getBalance(normalizedAddress);
                    const formattedBalance = ethers.formatEther(balance);

                    return {
                        success: true,
                        network: network,
                        address: normalizedAddress,
                        balance: formattedBalance,
                        decimals: 18,
                        symbol: tokenSymbolFromConfig || symbol,
                        timestamp: new Date().toISOString()
                    };
                }
            }

        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Deposit tokens to AsterDEX from blockchain
     * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
     * @param {string} token - Token symbol or contract address
     * @param {string} amount - Amount to deposit
     * @param {string} privateKey - Optional: Private key for signing (uses env if not provided)
     * @returns {Object} Deposit transaction result
     */
    async deposit(network, token, amount, privateKey = null) {
        try {
            // Validate parameters
            validateNetwork(network); // All networks supported
            validateAmount(amount, 'amount');

            const networkLower = network.toLowerCase();

            // Handle Solana deposits separately
            if (networkLower === 'solana') {
                return await this._depositSolana(token, amount, privateKey);
            }

            // EVM deposits (Ethereum, Arbitrum, BNB)

            // Get token config
            const tokenConfig = getTokenConfig(token, networkLower);
            const isNative = tokenConfig && tokenConfig.type === 'native';
            const tokenAddress = tokenConfig ? tokenConfig.address : token;

            // Get deposit contract
            const depositContract = getDepositContract(networkLower);

            // Get RPC and private key
            const rpcUrl = getNetworkRpcUrl(networkLower);
            const signingKey = getNetworkPrivateKey(networkLower, privateKey);

            // Create provider and wallet with timeout
            const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
                staticNetwork: true,
                batchMaxCount: 1
            });
            const wallet = new ethers.Wallet(signingKey, provider);

            if (this.debugFull) {
                console.error(`\n=== DEPOSIT DEBUG INFO ===`);
                console.error(`Network: ${network}`);
                console.error(`RPC URL: ${rpcUrl}`);
                console.error(`Wallet address: ${wallet.address}`);
                console.error(`Deposit contract: ${depositContract.address}`);
                console.error(`Token: ${token}`);
                console.error(`Amount: ${amount}`);
                console.error(`Is Native: ${isNative}`);
                if (!isNative) {
                    console.error(`Token address: ${tokenAddress}`);
                }
                console.error(`=========================\n`);
            }

            console.error(`Initiating deposit on ${network}...`);
            console.error(`Token: ${token}, Amount: ${amount}`);
            console.error(`Deposit contract: ${depositContract.address}`);

            if (isNative) {
                // Deposit native token (ETH, BNB)
                console.error('Depositing native token...');

                const contract = new ethers.Contract(
                    depositContract.address,
                    DEPOSIT_CONTRACT_ABI,
                    wallet
                );

                // Send native token with transaction
                // broker parameter: 1000 for SPOT account deposits
                const tx = await contract.depositNative(1000, {
                    value: ethers.parseEther(amount)
                });

                console.error(`Transaction sent: ${tx.hash}`);
                console.error('Waiting for confirmation...');

                const receipt = await tx.wait();

                return {
                    success: true,
                    deposit: {
                        network: network,
                        token: tokenConfig.symbol,
                        amount: amount,
                        txHash: tx.hash,
                        blockNumber: receipt.blockNumber,
                        status: 'confirmed',
                        explorerUrl: `${depositContract.explorerUrl}${tx.hash}`
                    },
                    timestamp: new Date().toISOString()
                };

            } else {
                // Deposit ERC20 token
                console.error('Depositing ERC20 token...');

                const normalizedTokenAddress = ethers.getAddress(tokenAddress.toLowerCase());

                // Step 1: Approve token spending
                console.error('Step 1: Approving token...');

                const tokenContract = new ethers.Contract(
                    normalizedTokenAddress,
                    ERC20_ABI,
                    wallet
                );

                if (this.debugFull) {
                    console.error(`Getting token decimals...`);
                }
                const decimals = await tokenContract.decimals();
                const amountBN = ethers.parseUnits(amount, decimals);

                if (this.debugFull) {
                    console.error(`Token decimals: ${decimals}`);
                    console.error(`Amount in base units: ${amountBN.toString()}`);
                    console.error(`Checking current allowance...`);
                }

                // Check current allowance
                const currentAllowance = await tokenContract.allowance(
                    wallet.address,
                    depositContract.address
                );

                if (this.debugFull) {
                    console.error(`Current allowance: ${currentAllowance.toString()}`);
                    console.error(`Required amount: ${amountBN.toString()}`);
                    console.error(`Need approval: ${currentAllowance < amountBN}`);
                }

                if (currentAllowance < amountBN) {
                    console.error(`Approving ${amount} tokens...`);
                    if (this.debugFull) {
                        console.error(`Spender: ${depositContract.address}`);
                        console.error(`Amount to approve: ${amountBN.toString()}`);
                    }

                    const approveTx = await tokenContract.approve(
                        depositContract.address,
                        amountBN,
                        {
                            // Increase timeout to 5 minutes for slow networks
                            gasLimit: 100000
                        }
                    );

                    console.error(`Approval tx sent: ${approveTx.hash}`);
                    if (this.debugFull) {
                        console.error(`Waiting for approval confirmation... (this may take 1-3 minutes on BNB Chain)`);
                        console.error(`Block explorer: ${depositContract.explorerUrl}${approveTx.hash}`);
                    }

                    // Wait with extended timeout (5 minutes)
                    const receipt = await approveTx.wait(1, 300000); // 1 confirmation, 5 min timeout

                    console.error('Approval confirmed!');
                    if (this.debugFull) {
                        console.error(`Approval block: ${receipt.blockNumber}`);
                        console.error(`Gas used: ${receipt.gasUsed.toString()}`);
                    }
                } else {
                    console.error('Sufficient allowance already exists');
                }

                // Step 2: Deposit tokens
                console.error('Step 2: Depositing tokens...');

                const depositContractInstance = new ethers.Contract(
                    depositContract.address,
                    DEPOSIT_CONTRACT_ABI,
                    wallet
                );

                if (this.debugFull) {
                    console.error(`Calling deposit() with:`);
                    console.error(`  Token: ${normalizedTokenAddress}`);
                    console.error(`  Amount: ${amountBN.toString()}`);
                    console.error(`  Broker: 1000 (SPOT account)`);
                }

                // broker parameter: 1000 for SPOT account deposits
                const depositTx = await depositContractInstance.deposit(
                    normalizedTokenAddress,
                    amountBN,
                    1000
                );

                console.error(`Deposit tx sent: ${depositTx.hash}`);
                if (this.debugFull) {
                    console.error(`Block explorer: ${depositContract.explorerUrl}${depositTx.hash}`);
                }
                console.error('Waiting for confirmation...');

                const receipt = await depositTx.wait(1, 300000); // 1 confirmation, 5 min timeout

                if (this.debugFull) {
                    console.error(`Deposit confirmed!`);
                    console.error(`Block: ${receipt.blockNumber}`);
                    console.error(`Gas used: ${receipt.gasUsed.toString()}`);
                }

                return {
                    success: true,
                    deposit: {
                        network: network,
                        token: token,
                        tokenAddress: normalizedTokenAddress,
                        amount: amount,
                        txHash: depositTx.hash,
                        blockNumber: receipt.blockNumber,
                        status: 'confirmed',
                        explorerUrl: `${depositContract.explorerUrl}${depositTx.hash}`
                    },
                    timestamp: new Date().toISOString()
                };
            }

        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Get estimated withdrawal fee for a specific token and network
     * @param {string} token - Token symbol (e.g., "USDT")
     * @param {string} network - Network name (ethereum, arbitrum, bnb)
     * @returns {Object} Fee information
     */
    async getWithdrawFee(token, network) {
        try {
            // Validate parameters
            validateNetwork(network, ['ethereum', 'arbitrum', 'bnb']);

            // Map network to chain ID
            const chainIdMap = {
                ethereum: '1',
                arbitrum: '42161',
                bnb: '56'
            };

            const chainId = chainIdMap[network.toLowerCase()];

            const response = await this._asterApiRequest('/api/v1/aster/withdraw/estimateFee', 'GET', {
                chainId,
                asset: token.toUpperCase()
            }, true);

            if (!response.success) {
                return {
                    success: false,
                    error: response.error
                };
            }

            // Log full response in debug mode
            if (this.debugFull) {
                console.error('Withdraw fee API response:', JSON.stringify(response, null, 2));
            }

            // API returns gasCost instead of fee
            const fee = response.data.gasCost || response.data.fee;

            // Check if fee exists in response
            if (!response.data || fee === null || fee === undefined) {
                return {
                    success: false,
                    error: `Withdrawal fee not available for ${token.toUpperCase()} on ${network}. API response: ${JSON.stringify(response.data)}`,
                    chainId: chainId,
                    token: token.toUpperCase(),
                    network: network
                };
            }

            return {
                success: true,
                token: token.toUpperCase(),
                network: network,
                chainId: chainId,
                fee: fee,
                gasLimit: response.data.gasLimit,
                tokenPrice: response.data.tokenPrice,
                gasUsdValue: response.data.gasUsdValue,
                minAmount: response.data.minAmount,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Composite function: Deposit → Swap → Withdraw (Cross-chain swap through AsterDEX)
     * Example: Deposit USDT from BNB → Buy ASTER → Withdraw ASTER to Arbitrum
     *
     * @param {string} fromNetwork - Source network (ethereum, arbitrum, bnb)
     * @param {string} fromToken - Token to deposit (e.g., "USDT")
     * @param {string} fromAmount - Amount to deposit
     * @param {string} targetToken - Token to buy (e.g., "ASTER")
     * @param {string} toNetwork - Destination network (ethereum, arbitrum, bnb)
     * @param {string} toAddress - Destination wallet address
     * @param {string} privateKey - Optional: Private key for signing
     * @returns {Object} Complete operation result with all transaction hashes
     */
    async swapAndBridge(fromNetwork, fromToken, fromAmount, targetToken, toNetwork, toAddress, privateKey = null) {
        try {
            console.error('=== Starting Swap & Bridge Operation ===');
            console.error(`From: ${fromAmount} ${fromToken} on ${fromNetwork}`);
            console.error(`To: ${targetToken} on ${toNetwork}`);
            console.error(`Destination: ${toAddress}`);

            const results = {
                success: true,
                steps: [],
                timestamp: new Date().toISOString()
            };

            // Step 1: Deposit tokens to AsterDEX
            console.error('\n[Step 1/3] Depositing tokens to AsterDEX...');

            const depositResult = await this.deposit(fromNetwork, fromToken, fromAmount, privateKey);

            if (!depositResult.success) {
                return {
                    success: false,
                    error: `Deposit failed: ${depositResult.error}`,
                    failedAt: 'deposit'
                };
            }

            results.steps.push({
                step: 1,
                action: 'deposit',
                ...depositResult.deposit
            });

            console.error(`✅ Deposit successful! TX: ${depositResult.deposit.txHash}`);

            // Wait a bit for deposit to be processed
            console.error('Waiting for deposit to be processed...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Step 2: Swap tokens (market buy)
            console.error('\n[Step 2/3] Swapping tokens on AsterDEX...');

            const tradingPair = `${targetToken}${fromToken}`.toUpperCase();

            const swapResult = await this.marketBuy(tradingPair, fromAmount);

            if (!swapResult.success) {
                return {
                    success: false,
                    error: `Swap failed: ${swapResult.error}`,
                    failedAt: 'swap',
                    partialResults: results
                };
            }

            results.steps.push({
                step: 2,
                action: 'swap',
                ...swapResult.order
            });

            console.error(`✅ Swap successful! Bought ${swapResult.order.executedQty} ${targetToken}`);

            // Wait a bit for swap to settle
            console.error('Waiting for swap to settle...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Step 3: Withdraw tokens to destination network
            console.error('\n[Step 3/3] Withdrawing to destination network...');

            const withdrawAmount = swapResult.order.executedQty;

            const withdrawResult = await this.withdraw(
                toNetwork,
                targetToken,
                withdrawAmount,
                toAddress,
                privateKey
            );

            if (!withdrawResult.success) {
                return {
                    success: false,
                    error: `Withdrawal failed: ${withdrawResult.error}`,
                    failedAt: 'withdraw',
                    partialResults: results
                };
            }

            results.steps.push({
                step: 3,
                action: 'withdraw',
                ...withdrawResult.withdrawal
            });

            console.error(`✅ Withdrawal successful! TX: ${withdrawResult.withdrawal.txHash || withdrawResult.withdrawal.id}`);

            console.error('\n=== Swap & Bridge Completed Successfully! ===');

            return {
                success: true,
                summary: {
                    deposited: `${fromAmount} ${fromToken} on ${fromNetwork}`,
                    swapped: `${swapResult.order.executedQty} ${targetToken}`,
                    withdrawn: `${withdrawAmount} ${targetToken} to ${toNetwork}`,
                    destination: toAddress
                },
                steps: results.steps,
                timestamp: results.timestamp
            };

        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Withdraw assets from Aster Exchange to external wallet
     * @param {string} network - Network name (ethereum, arbitrum, bnb)
     * @param {string} token - Token symbol (e.g., "USDT")
     * @param {string} amount - Amount to withdraw
     * @param {string} toAddress - Destination wallet address
     * @param {string} privateKey - Optional private key (if not provided, uses env variables)
     * @returns {Object} Withdrawal result
     */
    async withdraw(network, token, amount, toAddress = null, privateKey = null) {
        try {
            // Validate parameters
            validateNetwork(network, ['ethereum', 'arbitrum', 'bnb']);
            validateAmount(amount, 'amount');

            const tokenUpper = token.toUpperCase();
            const networkLower = network.toLowerCase();

            // Check minimum withdrawal amount for stablecoins
            const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD'];
            if (stablecoins.includes(tokenUpper)) {
                const numAmount = parseFloat(amount);
                if (numAmount < 1) {
                    return {
                        success: false,
                        error: `Minimum withdrawal amount for ${tokenUpper} is 1.0 (stablecoin). You tried to withdraw ${amount}. For other tokens (BTC, ETH, BNB, ASTER, etc.) smaller amounts are allowed due to higher prices.`
                    };
                }
            }

            // Map network to chain ID
            const chainIdMap = {
                ethereum: '1',
                arbitrum: '42161',
                bnb: '56'
            };

            const chainId = chainIdMap[networkLower];

            // Get private key for signing (network-specific with fallback)
            const signingKey = getNetworkPrivateKey(networkLower, privateKey);

            // Get wallet address from private key
            const wallet = new ethers.Wallet(signingKey);
            const receiver = wallet.address;

            // If toAddress not provided, use receiver (withdraw to same wallet)
            const destination = toAddress || receiver;

            if (this.debugFull) {
                console.error(`\n=== WITHDRAW SETUP ===`);
                console.error(`Network: ${network}`);
                console.error(`Receiver (signing wallet): ${receiver}`);
                console.error(`Destination (toAddress): ${destination}`);
                console.error(`Using ${toAddress ? 'user-provided' : 'derived from env'} destination address`);
                console.error(`======================\n`);
            }

            // Get withdrawal fee
            const feeResponse = await this.getWithdrawFee(token, network);
            if (!feeResponse.success) {
                return {
                    success: false,
                    error: `Failed to get withdrawal fee: ${feeResponse.error}`
                };
            }

            const fee = feeResponse.fee;

            // Validate fee is not null/undefined
            if (fee === null || fee === undefined) {
                return {
                    success: false,
                    error: `Failed to get withdrawal fee: API returned null/undefined fee`
                };
            }

            // Generate timestamp ONCE and use for both nonce and API timestamp
            // This ensures nonce and timestamp are synchronized
            const timestamp = Date.now();
            const nonce = timestamp * 1000;  // nonce in microseconds

            // Convert amount to string to ensure it's not a number
            const amountStr = String(amount);
            const feeStr = String(fee);

            if (this.debugFull) {
                console.error('\n=== WITHDRAW DEBUG ===');
                console.error('Wallet receiver:', receiver);
                console.error('Destination (toAddress):', destination);
                console.error('Token:', tokenUpper);
                console.error('Amount:', amountStr);
                console.error('Fee:', feeStr);
                console.error('Chain ID:', chainId);
                console.error('Timestamp (ms):', timestamp);
                console.error('Nonce (μs):', nonce);
            }

            // Generate EIP-712 signature
            const userSignature = await generateEIP712Signature({
                chainId,
                destination: destination,
                receiver: receiver,
                token: tokenUpper,
                amount: amountStr,
                fee: feeStr,
                nonce  // Pass as number, will be converted to BigInt in generateEIP712Signature
            }, signingKey);

            if (this.debugFull) {
                console.error('Generated signature:', userSignature);
            }

            // Prepare withdraw parameters
            // NOTE: API parameters do NOT include 'destination' - that's only in the EIP-712 signature!
            // IMPORTANT: Include timestamp here so makeApiRequest doesn't generate a new one!
            const withdrawParams = {
                chainId,
                asset: tokenUpper,
                amount: amountStr,
                fee: feeStr,
                receiver,
                nonce: String(nonce),  // nonce in microseconds
                userSignature,
                timestamp  // Use same timestamp as nonce (but in milliseconds)
            };

            if (this.debugFull) {
                console.error('Withdraw params:', JSON.stringify(withdrawParams, null, 2));
                console.error('======================\n');
            }

            // Execute withdrawal
            const response = await this._asterApiRequest('/api/v1/aster/user-withdraw', 'POST', withdrawParams, true);

            if (!response.success) {
                return {
                    success: false,
                    error: response.error
                };
            }

            return {
                success: true,
                withdrawal: {
                    id: response.data.id || response.data.withdrawId,
                    network: network,
                    chainId: chainId,
                    token: tokenUpper,
                    amount: amount,
                    fee: fee,
                    from: receiver,
                    to: destination,
                    status: response.data.status || 'pending',
                    txHash: response.data.txHash || response.data.txId || null
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return handleError(error);
        }
    }

    /**
     * Internal: Deposit SOL to AsterDEX on Solana
     * @param {string} token - Token symbol (currently only SOL supported)
     * @param {string} amount - Amount to deposit
     * @param {string} privateKey - Optional: Private key (base58) for signing
     * @returns {Object} Deposit transaction result
     * @private
     */
    async _depositSolana(token, amount, privateKey = null) {
        try {
            console.error(`Initiating Solana deposit...`);
            console.error(`Token: ${token}, Amount: ${amount}`);

            // Get token config
            const tokenConfig = getTokenConfig(token, 'solana');

            if (!tokenConfig) {
                return {
                    success: false,
                    error: `Token ${token} not supported on Solana`
                };
            }

            // Currently only SOL native deposits are supported
            if (tokenConfig.type !== 'native') {
                return {
                    success: false,
                    error: `SPL token deposits not yet implemented. Only SOL deposits are currently supported.`
                };
            }

            // Get RPC URL
            const rpcUrl = getNetworkRpcUrl('solana');
            const connection = new Connection(rpcUrl, 'confirmed');

            // Get private key
            const signingKey = getNetworkPrivateKey('solana', privateKey);

            // Decode private key from base58 to Keypair
            const secretKey = bs58.decode(signingKey);
            const keypair = Keypair.fromSecretKey(secretKey);

            console.error(`Wallet: ${keypair.publicKey.toBase58()}`);

            // Create deposit instruction
            const instruction = await createSolDepositInstruction(
                keypair.publicKey,
                parseFloat(amount)
            );

            // Create transaction
            const transaction = new Transaction().add(instruction);

            // Get recent blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = keypair.publicKey;

            console.error('Sending transaction to Solana...');

            // Send and confirm transaction
            const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [keypair],
                {
                    commitment: 'confirmed',
                    skipPreflight: false
                }
            );

            console.error(`✅ Transaction confirmed: ${signature}`);

            // Get transaction details
            const txDetails = await connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });

            const slot = txDetails ? txDetails.slot : null;

            return {
                success: true,
                deposit: {
                    network: 'Solana',
                    token: tokenConfig.symbol,
                    amount: amount,
                    txHash: signature,
                    slot: slot,
                    status: 'confirmed',
                    explorerUrl: `https://solscan.io/tx/${signature}`
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Solana deposit error:', error);
            return handleError(error);
        }
    }
}

module.exports = ToolsAPI;

/**
 * Utility functions for MCP server
 *
 * This file contains helper functions used across the MCP server.
 * Add your own utility functions here to keep code organized.
 */

const crypto = require('crypto');
const axios = require('axios');
const { ethers } = require('ethers');

/**
 * Error handler - standardizes error responses
 * @param {Error} error - Error object to handle
 * @returns {Object} Standardized error response
 */
function handleError(error) {
    console.error('Error occurred:', error.message);

    return {
        success: false,
        isError: true,
        error: error.message,
        timestamp: new Date().toISOString()
    };
}

/**
 * Validate string input
 * @param {string} input - String to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateString(input, fieldName = 'Input') {
    if (!input || typeof input !== 'string') {
        throw new Error(`${fieldName} must be a non-empty string`);
    }
    return true;
}

/**
 * Validate number input
 * @param {number} input - Number to validate
 * @param {string} fieldName - Name of field for error messages
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateNumber(input, fieldName = 'Input', min = null, max = null) {
    if (typeof input !== 'number' || isNaN(input)) {
        throw new Error(`${fieldName} must be a valid number`);
    }

    if (min !== null && input < min) {
        throw new Error(`${fieldName} must be at least ${min}`);
    }

    if (max !== null && input > max) {
        throw new Error(`${fieldName} must be at most ${max}`);
    }

    return true;
}

/**
 * Format response object
 * @param {boolean} success - Whether operation was successful
 * @param {Object} data - Response data
 * @param {string} message - Optional message
 * @returns {Object} Formatted response
 */
function formatResponse(success, data, message = null) {
    const response = {
        success,
        data,
        timestamp: new Date().toISOString()
    };

    if (message) {
        response.message = message;
    }

    return response;
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of function
 */
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, i);
            console.error(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
            await sleep(delay);
        }
    }
}

/**
 * Sanitize string for safe output
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
    if (typeof str !== 'string') {
        return str;
    }

    // Remove control characters and trim
    return str.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
function isEmpty(value) {
    if (value === null || value === undefined) {
        return true;
    }

    if (typeof value === 'string') {
        return value.trim().length === 0;
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }

    return false;
}

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Truncate string to max length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add if truncated (default: '...')
 * @returns {string} Truncated string
 */
function truncate(str, maxLength, suffix = '...') {
    if (!str || str.length <= maxLength) {
        return str;
    }

    return str.substring(0, maxLength - suffix.length) + suffix;
}

// ============================================================================
// Cryptographic and API Helper Functions
// ============================================================================

/**
 * Generate HMAC SHA256 signature for API requests
 * @param {string} queryString - Query string to sign (e.g., "symbol=BTCUSDT&timestamp=123456")
 * @param {string} secret - API secret key
 * @returns {string} HMAC SHA256 signature (hex)
 */
function generateHmacSignature(queryString, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(queryString)
        .digest('hex');
}

/**
 * Build query string from parameters object
 * @param {Object} params - Parameters object
 * @returns {string} Query string with sorted keys
 */
function buildQueryString(params) {
    return Object.keys(params)
        .sort() // Sort alphabetically for consistent signatures
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
}

/**
 * Validate trading symbol format
 * @param {string} symbol - Trading pair symbol (e.g., "BTCUSDT")
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateTradingSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') {
        throw new Error('Symbol must be a non-empty string');
    }

    // Convert to uppercase for validation
    const upperSymbol = symbol.toUpperCase();

    // Validate format: uppercase letters only, 6-12 characters
    const symbolPattern = /^[A-Z]{6,12}$/;
    if (!symbolPattern.test(upperSymbol)) {
        throw new Error('Invalid trading symbol format. Expected format: BTCUSDT (6-12 uppercase letters)');
    }

    // Additional check: symbol should end with common quote assets (USDT, USDC, BTC, ETH, BNB, SOL)
    const quoteAssets = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB', 'SOL', 'BUSD'];
    const hasValidQuote = quoteAssets.some(quote => upperSymbol.endsWith(quote));

    if (!hasValidQuote) {
        throw new Error(`Invalid trading symbol. Symbol must end with one of: ${quoteAssets.join(', ')}`);
    }

    return true;
}

/**
 * Validate amount (for orders, balances, etc.)
 * @param {string|number} amount - Amount to validate
 * @param {string} fieldName - Name of field for error messages
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateAmount(amount, fieldName = 'Amount') {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error(`${fieldName} must be a positive number`);
    }

    return true;
}

/**
 * Validate network name
 * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
 * @param {string[]} allowedNetworks - Optional array of allowed networks
 * @returns {boolean} True if valid
 * @throws {Error} If validation fails
 */
function validateNetwork(network, allowedNetworks = null) {
    const validNetworks = allowedNetworks || ['ethereum', 'arbitrum', 'bnb', 'solana'];
    const networkLower = network ? network.toLowerCase() : '';

    if (!validNetworks.includes(networkLower)) {
        throw new Error(`Invalid network. Must be one of: ${validNetworks.join(', ')}`);
    }

    return true;
}

/**
 * Format balance object for consistent output
 * @param {Object} balance - Balance object with free and locked properties
 * @returns {Object} Formatted balance object
 */
function formatBalance(balance) {
    const free = parseFloat(balance.free) || 0;
    const locked = parseFloat(balance.locked) || 0;

    return {
        asset: balance.asset,
        free: balance.free,
        locked: balance.locked,
        total: (free + locked).toFixed(8)
    };
}

// ============================================================================
// Wallet Helper Functions
// ============================================================================

/**
 * Get wallet credentials for specific network from environment
 * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
 * @returns {Object} Wallet credentials {privateKey, mnemonic, rpcUrl}
 */
function getNetworkWalletEnv(network) {
    const networkUpper = network.toUpperCase();

    return {
        privateKey: process.env[`${networkUpper}_WALLET_PRIVATE_KEY`] || '',
        mnemonic: process.env[`${networkUpper}_WALLET_MNEMONIC`] || '',
        rpcUrl: process.env[`${networkUpper}_RPC_URL`] || ''
    };
}

/**
 * Get RPC URL for specific network
 * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
 * @returns {string} RPC URL
 * @throws {Error} If RPC URL not configured
 */
function getNetworkRpcUrl(network) {
    const networkUpper = network.toUpperCase();
    const rpcUrl = process.env[`${networkUpper}_RPC_URL`];

    if (!rpcUrl) {
        throw new Error(
            `RPC URL not configured for ${network}. Please set ${networkUpper}_RPC_URL in environment variables`
        );
    }

    return rpcUrl;
}

/**
 * Get wallet private key with fallback logic (pure function)
 * Priority: 1) User provided privateKey, 2) Config private key, 3) Config mnemonic -> derive key
 * @param {string} userPrivateKey - Optional private key from user
 * @param {string} configPrivateKey - Private key from configuration
 * @param {string} configMnemonic - Mnemonic from configuration
 * @param {string} network - Optional network name for better error messages
 * @returns {string} Private key
 * @throws {Error} If no wallet credentials available
 */
function getWalletPrivateKey(userPrivateKey = null, configPrivateKey = '', configMnemonic = '', network = '') {
    const networkInfo = network ? ` for ${network}` : '';

    // Priority 1: User provided private key
    if (userPrivateKey) {
        console.error(`Using private key from user parameter${networkInfo}`);
        return userPrivateKey;
    }

    // Priority 2: Configuration private key
    if (configPrivateKey) {
        console.error(`Using private key from configuration${networkInfo}`);
        return configPrivateKey;
    }

    // Priority 3: Derive from mnemonic
    if (configMnemonic) {
        console.error(`Deriving private key from mnemonic${networkInfo}`);
        try {
            const wallet = ethers.Wallet.fromPhrase(configMnemonic);
            return wallet.privateKey;
        } catch (error) {
            throw new Error(`Failed to derive private key from mnemonic: ${error.message}`);
        }
    }

    // No credentials available
    throw new Error(
        `No wallet credentials available${networkInfo}. Please provide privateKey parameter or set network-specific environment variables (e.g., ETHEREUM_WALLET_PRIVATE_KEY or ETHEREUM_WALLET_MNEMONIC)`
    );
}

/**
 * Get wallet private key for specific network
 * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
 * @param {string} userPrivateKey - Optional user-provided private key
 * @returns {string} Private key
 * @throws {Error} If no credentials available
 */
function getNetworkPrivateKey(network, userPrivateKey = null) {
    // Get network-specific credentials from environment
    const networkCreds = getNetworkWalletEnv(network);

    return getWalletPrivateKey(userPrivateKey, networkCreds.privateKey, networkCreds.mnemonic, network);
}

/**
 * Generate EIP-712 signature for Aster withdraw
 * @param {Object} params - Withdraw parameters
 * @param {string} params.chainId - Chain ID (1=ETH, 56=BSC, 42161=Arbi)
 * @param {string} params.destination - Destination address (where tokens go)
 * @param {string} params.receiver - Receiver address (wallet signing the transaction)
 * @param {string} params.token - Token symbol (e.g., "USDT")
 * @param {string} params.amount - Amount to withdraw
 * @param {string} params.fee - Withdrawal fee
 * @param {string} params.nonce - Nonce (current time in microseconds)
 * @param {string} privateKey - Private key for signing
 * @returns {Promise<string>} EIP-712 signature
 */
async function generateEIP712Signature(params, privateKey) {
    const { chainId, destination, receiver, token, amount, fee, nonce } = params;

    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey);

    // Use receiver if destination not provided (for backwards compatibility)
    const targetAddress = destination || receiver;

    // Validate and normalize destination address
    // Use lowercase first to avoid checksum issues, then get checksummed version
    let normalizedDestination;
    try {
        normalizedDestination = ethers.getAddress(targetAddress.toLowerCase());
    } catch (error) {
        throw new Error(`Invalid destination address: ${targetAddress}`);
    }

    // EIP-712 domain
    const domain = {
        name: 'Aster',
        version: '1',
        chainId: parseInt(chainId),
        verifyingContract: ethers.ZeroAddress
    };

    // EIP-712 types
    const types = {
        Action: [
            { name: 'type', type: 'string' },
            { name: 'destination', type: 'address' },
            { name: 'destination Chain', type: 'string' },
            { name: 'token', type: 'string' },
            { name: 'amount', type: 'string' },
            { name: 'fee', type: 'string' },
            { name: 'nonce', type: 'uint256' },
            { name: 'aster chain', type: 'string' }
        ]
    };

    // Chain name mapping
    const chainNames = {
        '1': 'ETH',
        '56': 'BSC',
        '42161': 'Arbi'
    };

    // EIP-712 value
    const value = {
        'type': 'Withdraw',
        'destination': normalizedDestination,
        'destination Chain': chainNames[chainId] || 'ETH',
        'token': token,
        'amount': amount,
        'fee': fee,
        'nonce': BigInt(nonce),
        'aster chain': 'Mainnet'
    };

    // Debug logging
    if (process.env.DEBUG_FULL === 'true') {
        console.error('\n=== EIP-712 SIGNATURE DEBUG ===');
        console.error('Domain:', JSON.stringify(domain, null, 2));
        console.error('Types:', JSON.stringify(types, null, 2));
        console.error('Value:', JSON.stringify(value, (key, val) =>
            typeof val === 'bigint' ? val.toString() : val, 2));
        console.error('================================\n');
    }

    // Sign typed data
    const signature = await wallet.signTypedData(domain, types, value);

    return signature;
}

// ============================================================================
// API Request Helper Functions
// ============================================================================

/**
 * Make authenticated request to API with HMAC SHA256 signature (pure function)
 * @param {Object} options - Request options
 * @param {string} options.baseUrl - API base URL
 * @param {string} options.endpoint - API endpoint (e.g., "/api/v1/account")
 * @param {string} options.method - HTTP method (GET, POST, DELETE)
 * @param {Object} options.params - Request parameters
 * @param {boolean} options.signed - Whether request requires signature
 * @param {string} options.apiKey - API key for authentication
 * @param {string} options.apiSecret - API secret for signature
 * @param {number} options.recvWindow - Receive window for signed requests
 * @returns {Promise<Object>} API response with {success, data, headers} or {success, error}
 */
async function makeApiRequest(options) {
    const {
        baseUrl,
        endpoint,
        method = 'GET',
        params = {},
        signed = false,
        apiKey = '',
        apiSecret = '',
        recvWindow = 5000
    } = options;

    try {
        // Validate API credentials for signed requests
        if (signed && (!apiKey || !apiSecret)) {
            throw new Error('API credentials not configured. API key and secret are required for signed requests');
        }

        // Clone params to avoid mutation
        const requestParams = { ...params };

        // Add timestamp and recvWindow for signed requests
        if (signed) {
            // Only add timestamp if not already provided (e.g., for withdraw)
            if (!requestParams.timestamp) {
                requestParams.timestamp = Date.now();
            }
            if (!requestParams.recvWindow) {
                requestParams.recvWindow = recvWindow;
            }
        }

        // Build query string
        const queryString = buildQueryString(requestParams);

        // Generate signature for signed requests
        let signature = '';
        if (signed) {
            signature = generateHmacSignature(queryString, apiSecret);

            // Debug logging for signed requests
            if (process.env.DEBUG_FULL === 'true') {
                console.error('\n=== API REQUEST DEBUG ===');
                console.error('Endpoint:', endpoint);
                console.error('Method:', method);
                console.error('Params:', JSON.stringify(requestParams, null, 2));
                console.error('Query String:', queryString);
                console.error('Signature:', signature);
                console.error('=========================\n');
            }
        }

        // Prepare request config
        const config = {
            method,
            url: `${baseUrl}${endpoint}`,
            headers: {}
        };

        // Add Content-Type header only for POST/PUT requests
        if (method === 'POST' || method === 'PUT') {
            config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        // Add API key header for authenticated requests
        if (apiKey) {
            config.headers['X-MBX-APIKEY'] = apiKey;
        }

        // Add query string and signature based on method
        if (method === 'GET' || method === 'DELETE') {
            const fullQuery = signed ? `${queryString}&signature=${signature}` : queryString;
            config.url += fullQuery ? `?${fullQuery}` : '';
        } else if (method === 'POST' || method === 'PUT') {
            const fullData = signed ? `${queryString}&signature=${signature}` : queryString;
            config.data = fullData;
        }

        // Make request
        const response = await axios(config);

        return {
            success: true,
            data: response.data,
            headers: response.headers
        };

    } catch (error) {
        // Handle API errors
        if (error.response) {
            // API returned error response
            return {
                success: false,
                error: {
                    code: error.response.data?.code || error.response.status,
                    message: error.response.data?.msg || error.message,
                    httpStatus: error.response.status
                }
            };
        } else {
            // Network or other error
            return {
                success: false,
                error: {
                    message: error.message,
                    type: 'NetworkError'
                }
            };
        }
    }
}

module.exports = {
    // Error handling
    handleError,

    // Validation
    validateString,
    validateNumber,
    validateTradingSymbol,
    validateAmount,
    validateNetwork,

    // Formatting
    formatResponse,
    formatBalance,

    // Utilities
    sleep,
    retryWithBackoff,
    sanitizeString,
    isEmpty,
    deepClone,
    truncate,

    // Cryptographic and API helpers
    generateHmacSignature,
    buildQueryString,

    // Wallet helpers
    getWalletPrivateKey,
    getNetworkWalletEnv,
    getNetworkPrivateKey,
    getNetworkRpcUrl,
    generateEIP712Signature,

    // API request helpers
    makeApiRequest
};

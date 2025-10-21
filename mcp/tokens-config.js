/**
 * Supported tokens configuration for multi-network balance checking
 *
 * This file contains contract addresses and metadata for popular tokens
 * across Ethereum, Arbitrum, BNB Chain, and Solana networks.
 */

const TOKENS = {
  // ============================================================================
  // ETHEREUM NETWORK
  // ============================================================================
  ethereum: {
    // Native ETH (no contract address needed)
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      type: 'native'
    },
    // USDT - Tether USD
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      type: 'erc20'
    },
    USD1: {
      symbol: 'USD1',
      name: 'USD1',
      address: '0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d',
      decimals: 18,
      type: 'erc20'
    },
    USDC: {
      symbol: 'USDC',
      name: 'Token USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      type: 'erc20'
    },
    // Wrapped BTC
    BTC: {
      symbol: 'WBTC',
      name: 'Wrapped Bitcoin',
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      decimals: 8,
      type: 'erc20'
    }
  },

  // ============================================================================
  // ARBITRUM NETWORK
  // ============================================================================
  arbitrum: {
    // Native ETH on Arbitrum
    ETH: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      type: 'native'
    },
    // USDT on Arbitrum
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      decimals: 6,
      type: 'erc20'
    },
    // USDT on Arbitrum
    USDC: {
      symbol: 'USDC',
      name: 'Token USD Coin',
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      decimals: 6,
      type: 'erc20'
    },
  },

  // ============================================================================
  // BNB CHAIN NETWORK
  // ============================================================================
  bnb: {
    // Native BNB
    BNB: {
      symbol: 'BNB',
      name: 'BNB',
      decimals: 18,
      type: 'native'
    },
    // USDT on BNB Chain
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0x55d398326f99059fF775485246999027B3197955',
      decimals: 18,
      type: 'erc20'
    },
    // ASTER on BNB Chain (if available)
    ASTER: {
      symbol: 'ASTER',
      name: 'Aster Token',
      address: '0x000Ae314E2A2172a039B26378814C252734f556A',
      decimals: 18,
      type: 'erc20'
    },
    // USD1 on BNB Chain (if available)
    USD1: {
      symbol: 'USD1',
      name: 'USD1',
      address: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
      decimals: 18,
      type: 'erc20'
    },
    APX: {
      symbol: 'APX',
      name: 'Token APX Token',
      address: '0x78F5d389F5CDCcFc41594aBaB4B0Ed02F31398b3',
      decimals: 18,
      type: 'erc20'
    },
    ETH: {
      symbol: 'wBETH',
      name: 'Token Wrapped Binance Beacon ETH',
      address: '0xa2E3356610840701BDf5611a53974510Ae27E2e1',
      decimals: 18,
      type: 'erc20'
    },
    // Wrapped BTC on BNB Chain
    BTC: {
      symbol: 'BTCB',
      name: 'Token Binance-Peg BTCB Token',
      address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
      decimals: 18,
      type: 'erc20'
    }
  },

  // ============================================================================
  // SOLANA NETWORK
  // ============================================================================
  solana: {
    // Native SOL
    SOL: {
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      type: 'native'
    },
    // USDT on Solana (SPL Token)
    USDT: {
      symbol: 'USDT',
      name: 'Tether USD',
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      decimals: 6,
      type: 'spl'
    },
    // USDC on Solana (SPL Token)
    USDC: {
      symbol: 'USDC',
      name: 'USD Coin',
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      decimals: 6,
      type: 'spl'
    },
    // JLP - Jupiter Liquidity Provider Token
    JLP: {
      symbol: 'JLP',
      name: 'Jupiter LP Token',
      address: '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4',
      decimals: 6,
      type: 'spl'
    },
    // USD1 on Solana (if available)
    USD1: {
      symbol: 'USD1',
      name: 'USD1',
      address: 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB',
      decimals: 9,
      type: 'spl'
    },
    // Wrapped BTC on Solana
    BTC: {
      symbol: 'BTC',
      name: 'Wrapped Bitcoin (Sollet)',
      address: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
      decimals: 6,
      type: 'spl'
    }
  }
}

/**
 * Get token configuration by symbol and network
 * @param {string} symbol - Token symbol (e.g., "USDT", "ETH", "ARB")
 * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
 * @returns {Object|null} Token configuration or null if not found
 */
function getTokenConfig (symbol, network) {
  const networkTokens = TOKENS[network.toLowerCase()]

  if (!networkTokens) {
    return null
  }

  const token = networkTokens[symbol.toUpperCase()]

  if (!token) {
    return null
  }

  return {
    ...token,
    network: network.toLowerCase()
  }
}

/**
 * Get all supported tokens for a network
 * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
 * @returns {Array} Array of token configurations
 */
function getNetworkTokens (network) {
  const networkTokens = TOKENS[network.toLowerCase()]

  if (!networkTokens) {
    return []
  }

  return Object.entries(networkTokens).map(([symbol, config]) => ({
    symbol,
    ...config,
    network: network.toLowerCase()
  }))
}

/**
 * Get all supported token symbols across all networks
 * @returns {Object} Object with network as key and array of symbols as value
 */
function getAllSupportedTokens () {
  const result = {}

  for (const [network, tokens] of Object.entries(TOKENS)) {
    result[network] = Object.keys(tokens)
  }

  return result
}

/**
 * Check if a token is supported on a network
 * @param {string} symbol - Token symbol
 * @param {string} network - Network name
 * @returns {boolean} True if token is supported
 */
function isTokenSupported (symbol, network) {
  return getTokenConfig(symbol, network) !== null
}

module.exports = {
  TOKENS,
  getTokenConfig,
  getNetworkTokens,
  getAllSupportedTokens,
  isTokenSupported
}

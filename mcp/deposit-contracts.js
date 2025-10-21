/**
 * AsterDEX Deposit Contract Addresses
 *
 * This file contains smart contract addresses for deposits on each network.
 * These contracts handle token deposits into AsterDEX exchange.
 *
 * TODO: Replace placeholder addresses with real AsterDEX contract addresses
 */

const DEPOSIT_CONTRACTS = {
    // Ethereum Mainnet - AstherusVault Contract
    ethereum: {
        address: '0x604dd02d620633ae427888d41bfd15e38483736e',
        chainId: 1,
        networkName: 'Ethereum',
        explorerUrl: 'https://etherscan.io/tx/'
    },

    // Arbitrum One - AstherusVault Contract
    arbitrum: {
        address: '0x9E36CB86a159d479cEd94Fa05036f235Ac40E1d5',
        chainId: 42161,
        networkName: 'Arbitrum One',
        explorerUrl: 'https://arbiscan.io/tx/'
    },

    // BNB Chain - AstherusVault Contract
    bnb: {
        address: '0x128463a60784c4d3f46c23af3f65ed859ba87974',
        chainId: 56,
        networkName: 'BNB Chain',
        explorerUrl: 'https://bscscan.com/tx/'
    },

    // Solana - Aster Treasury Program
    solana: {
        address: 'EhUtRgu9iEbZXXRpEvDj6n1wnQRjMi2SERDo3c6bmN2c', // Aster: Treasury Program
        treasuryAccount: '5bXxj9Qa4hj15DHvzTgVy7z2VkEGNWFVQojfbUKAiGpE', // Treasury wallet for deposits
        networkName: 'Solana',
        explorerUrl: 'https://solscan.io/tx/'
    }
};

/**
 * Standard ERC20 ABI for approve and transfer functions
 */
const ERC20_ABI = [
    // Read functions
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',

    // Write functions
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',

    // Events
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)'
];

/**
 * AsterDEX Deposit Contract ABI (AstherusVault)
 *
 * Real ABI from deployed contracts on Ethereum and BNB Chain
 * Key functions for deposits:
 * - deposit(address currency, uint256 amount, uint256 broker) - for ERC20 tokens
 * - depositNative(uint256 broker) - for native ETH/BNB
 * - depositV2(address currency, uint256 amount, uint256 broker) - alternative deposit method
 *
 * broker parameter:
 * - 1000 = deposit to SPOT account (default for trading)
 * - 0 = deposit to FUTURES account
 */
const DEPOSIT_CONTRACT_ABI = [
    // Deposit ERC20 tokens (main method)
    'function deposit(address currency, uint256 amount, uint256 broker)',

    // Deposit native token (ETH, BNB) - payable
    'function depositNative(uint256 broker) payable',

    // Alternative deposit method (V2)
    'function depositV2(address currency, uint256 amount, uint256 broker) payable',

    // View functions
    'function balance(address currency) view returns (uint256)',
    'function paused() view returns (bool)',
    'function fees(address) view returns (uint256)',

    // Events
    'event Deposit(address indexed account, address indexed currency, uint256 amount, uint256 broker)',
    'event Deposit(address indexed account, address indexed currency, bool isNative, uint256 amount, uint256 broker)',
    'event DepositFailed(address indexed account, address indexed currency, bool isNative, uint256 amount)'
];

/**
 * Get deposit contract info for a network
 * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
 * @returns {Object} Contract info
 */
function getDepositContract(network) {
    const contract = DEPOSIT_CONTRACTS[network.toLowerCase()];

    if (!contract) {
        throw new Error(`Deposit contract not configured for network: ${network}`);
    }

    // Check if contract address is placeholder
    if (contract.address === '0x0000000000000000000000000000000000000000' ||
        contract.address === '11111111111111111111111111111111') {
        throw new Error(
            `Deposit contract address not configured for ${network}. ` +
            `Please add the real contract address in deposit-contracts.js`
        );
    }

    return contract;
}

/**
 * Check if deposit is available for a network
 * @param {string} network - Network name
 * @returns {boolean} True if deposit contract is configured
 */
function isDepositAvailable(network) {
    try {
        getDepositContract(network);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    DEPOSIT_CONTRACTS,
    ERC20_ABI,
    DEPOSIT_CONTRACT_ABI,
    getDepositContract,
    isDepositAvailable
};

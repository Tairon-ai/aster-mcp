<div align="center">

# Contributing to Aster MCP Server

**Thank you for your interest in contributing to the Aster MCP Server!**

This document provides guidelines and instructions for contributing to this project.

</div>

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We aim to foster an inclusive and welcoming community for all developers interested in building DeFi and multi-chain trading integrations.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue on GitHub with the following information:

- A clear, descriptive title
- A detailed description of the bug
- Steps to reproduce the bug
- Expected behavior
- Actual behavior
- Any relevant logs or screenshots
- Your environment (OS, Node.js version, npm version)
- Network used (Ethereum, Arbitrum, BNB Chain, Solana)
- MCP client used (Claude Desktop, HTTP API, etc.)

### Suggesting Enhancements

If you have an idea for an enhancement, please create an issue on GitHub with the following information:

- A clear, descriptive title
- A detailed description of the enhancement
- Any relevant examples or mockups
- Why this enhancement would be useful for crypto trading
- Potential implementation approach
- Network or blockchain considerations
- AsterDEX API integration details

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature or bugfix (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request. Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) as your PR's title

## Development Setup

1. Clone your fork of the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your AsterDEX API credentials and wallet keys (see README.md)
4. Test the HTTP server: `npm start`
5. Test the MCP server: `npm run mcp`
6. Configure your wallet credentials per network in `.env`

## Coding Standards

- Follow the existing code style (JavaScript/Node.js conventions)
- Write clear, descriptive commit messages using Conventional Commits
- Add JSDoc comments to your code where necessary
- Write tests for new features when applicable
- Update documentation when necessary
- Use meaningful variable and function names
- Keep functions small and focused on a single responsibility
- Handle blockchain errors gracefully with user-friendly messages
- Validate wallet addresses and transaction parameters

## Adding New MCP Tools

If you want to add a new tool to the MCP server, follow these steps:

### 1. Define Tool in `mcp/index.js`

Add your tool to the TOOLS array:

```javascript
// Add to TOOLS array
{
    name: 'your_tool_name',
    description: 'Clear description of what your tool does',
    inputSchema: {
        type: 'object',
        properties: {
            network: {
                type: 'string',
                description: 'Network to use: ethereum, arbitrum, bnb, or solana',
                enum: ['ethereum', 'arbitrum', 'bnb', 'solana'],
            },
            param1: {
                type: 'string',
                description: 'Description of parameter',
            },
        },
        required: ['network', 'param1'],
    },
},

// Add case in switch statement
case 'your_tool_name':
    result = await toolsApi.yourMethod(
        args.network,
        args.param1
    );
    break;
```

### 2. Implement in `mcp/tools.js`

Add your method to the `ToolsAPI` class:

```javascript
/**
 * Your new tool method
 * @param {string} network - Network name (ethereum, arbitrum, bnb, solana)
 * @param {string} param1 - Description
 * @returns {Object} Result object
 */
async yourMethod(network, param1) {
    try {
        // Validate network
        validateNetwork(network);

        // Validate inputs
        if (!param1) {
            throw new Error('param1 is required');
        }

        // Get network-specific configuration
        const rpcUrl = getNetworkRpcUrl(network);

        // Make blockchain call or AsterDEX API call
        const response = await this.makeRequest('POST', '/api/v1/endpoint', {
            network,
            param1
        });

        return {
            success: true,
            network: network,
            data: response.data,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}
```

### 3. Add Helper Functions in `mcp/utils.js`

If your tool needs utility functions:

```javascript
/**
 * Helper function for your tool
 * @param {string} network - Network name
 * @returns {string} Processed output
 */
function yourHelper(network) {
    // Process network-specific logic
    return processed;
}

module.exports = {
    // ... existing exports
    yourHelper
};
```

### 4. Update Documentation

- Add your tool to the README.md tools table in appropriate category
- Include example usage with prompts
- Document parameters and return values
- Add example prompts for AI assistants
- Document network-specific behavior if applicable

## Testing Guidelines

### Running Tests

```bash
# Test MCP server
npm run mcp

# Test HTTP server
npm start

# Test with curl
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "get_price", "arguments": {"symbol": "BTCUSDT"}}, "id": 1}'
```

### Writing Tests

- Test both success and failure cases
- Include edge cases (invalid addresses, missing parameters, network errors)
- Test with various networks (Ethereum, Arbitrum, BNB Chain, Solana)
- Verify error messages are helpful
- Test wallet address validation
- Test with different token types (native, ERC20, SPL)
- Verify transaction signing works correctly

## Environment Variables

When adding new environment variables:

1. Update the `.env.example` file with clear comments
2. Document in README.md environment section
3. Add validation in tools.js constructor
4. Provide sensible defaults where appropriate

Example:
```javascript
// In tools.js constructor
this.apiKey = process.env.ASTER_API_KEY || '';
this.apiSecret = process.env.ASTER_API_SECRET || '';
this.apiBaseUrl = process.env.ASTER_API_BASE_URL || 'https://sapi.asterdex.com';

if (!this.apiKey || !this.apiSecret) {
  console.warn('ASTER_API_KEY or ASTER_API_SECRET not set - trading features will not work');
}

// Check per-network wallet configuration
console.error('Wallet Configuration:');
const networks = ['ETHEREUM', 'ARBITRUM', 'BNB', 'SOLANA'];
networks.forEach(network => {
    const hasPrivateKey = !!process.env[`${network}_WALLET_PRIVATE_KEY`];
    const hasMnemonic = !!process.env[`${network}_WALLET_MNEMONIC`];
    const status = hasPrivateKey ? 'Yes (PrivateKey)' : hasMnemonic ? 'Yes (Mnemonic)' : 'No';
    console.error(`  ${network.padEnd(10)}: ${status}`);
});
```

## Documentation

- Keep README.md up to date with all changes
- Use clear, concise language
- Include code examples for new tools
- Document AsterDEX API endpoints used
- Add comments explaining complex blockchain logic
- Include response examples
- Update prompts section if adding new capabilities
- Document network-specific behavior
- Include transaction hash examples

## Security Considerations

- **Never commit API keys, secrets, or private keys**
- Validate all wallet addresses before transactions
- Sanitize user-provided data
- Implement proper input validation for amounts and addresses
- Follow security best practices for blockchain transactions
- Review npm dependencies for vulnerabilities
- Don't log sensitive information (API keys, private keys, mnemonics)
- Use HTTPS for all API calls
- Implement rate limiting where appropriate
- Validate transaction parameters before signing
- Use EIP-712 signatures for secure withdrawals
- Keep private keys in environment variables only

## Blockchain-Specific Guidelines

### EVM Chains (Ethereum, Arbitrum, BNB Chain)

- Use ethers.js for blockchain interactions
- Validate addresses with `ethers.getAddress()`
- Handle gas estimation and limits properly
- Test with different RPC providers
- Handle ERC20 token approvals correctly
- Use proper decimal conversion (wei, gwei, ether)

### Solana

- Use @solana/web3.js for blockchain interactions
- Private keys must be in base58 format (NO 0x prefix!)
- Handle lamports to SOL conversion properly
- Test with different RPC endpoints
- Handle SPL token accounts correctly
- Validate base58 addresses

## Performance Guidelines

- Optimize RPC calls when possible
- Implement caching for token metadata
- Use pagination for large result sets
- Monitor AsterDEX API rate limits
- Profile code for bottlenecks
- Consider transaction confirmation times
- Cache expensive blockchain queries
- Batch multiple read operations when possible

## Submitting Your Contribution

Before submitting:

1. Ensure all tests pass
2. Update README.md with new tools
3. Check for linting issues (if configured)
4. Verify no API keys, secrets, or private keys are included
5. Write a clear PR description with examples
6. Test with actual blockchain networks
7. Include sample responses in PR
8. Update tool count in README if adding new tools
9. Test with multiple networks if applicable
10. Verify transaction signing works correctly

## Getting Help

If you need help with your contribution:

- Check existing issues and PRs on GitHub
- Ask questions in the issue tracker
- Review MCP Protocol documentation at https://modelcontextprotocol.io
- Check the MCP SDK documentation
- Review AsterDEX API documentation at https://github.com/asterdex/api-docs
- Test with Claude Desktop or other MCP clients
- Check ethers.js or Solana Web3.js documentation for blockchain issues

## Recognition

Contributors will be recognized in:

- The project README contributors section
- GitHub release notes
- Special thanks in major version releases

Thank you for helping improve the Aster MCP Server!

---

<div align="center">

**Built by [Tairon.ai](https://tairon.ai) team with help from Claude**

</div>

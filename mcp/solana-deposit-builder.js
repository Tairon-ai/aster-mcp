/**
 * Solana Deposit Instruction Builder for Aster Treasury
 *
 * This module builds deposit instructions for the Aster Treasury program on Solana.
 * Based on reverse-engineered transaction analysis.
 */

const {
    PublicKey,
    TransactionInstruction,
    SystemProgram,
    LAMPORTS_PER_SOL
} = require('@solana/web3.js');

// Aster Treasury Program
const ASTER_PROGRAM_ID = new PublicKey('EhUtRgu9iEbZXXRpEvDj6n1wnQRjMi2SERDo3c6bmN2c');
const TREASURY_ACCOUNT = new PublicKey('5bXxj9Qa4hj15DHvzTgVy7z2VkEGNWFVQojfbUKAiGpE');

// Broker ID (from transaction analysis)
const BROKER_ID = 56357235818057297n; // As BigInt

// Instruction discriminator for deposit
const DEPOSIT_DISCRIMINATOR = 0x6c;

/**
 * Build instruction data for Aster deposit
 *
 * Format (16 bytes total):
 * - Byte 0: Discriminator (0x6c)
 * - Bytes 1-7: Broker ID (u56, little-endian)
 * - Bytes 8-15: Amount in lamports (u64, little-endian)
 *
 * @param {number} amountLamports - Amount to deposit in lamports
 * @returns {Buffer} Instruction data
 */
function buildDepositInstructionData(amountLamports) {
    const data = Buffer.alloc(16);

    // Byte 0: Discriminator
    data.writeUInt8(DEPOSIT_DISCRIMINATOR, 0);

    // Bytes 1-7: Broker ID (56-bit value)
    // We write it as part of a 64-bit value and handle the discriminator separately
    const brokerWithDiscriminator = (BROKER_ID << 8n) | BigInt(DEPOSIT_DISCRIMINATOR);
    data.writeBigUInt64LE(brokerWithDiscriminator, 0);

    // Bytes 8-15: Amount (u64 little-endian)
    data.writeBigUInt64LE(BigInt(amountLamports), 8);

    return data;
}

/**
 * Derive user PDA (Program Derived Address) for deposits
 *
 * Based on transaction analysis, there's a user-specific account at index [1]
 * This might be derived from the user's wallet pubkey.
 *
 * @param {PublicKey} userWallet - User's wallet public key
 * @returns {Promise<PublicKey>} User's PDA account
 */
async function deriveUserPDA(userWallet) {
    // Try common PDA derivation patterns
    try {
        // Pattern 1: [user_wallet, "deposit"]
        const [pda1] = await PublicKey.findProgramAddress(
            [userWallet.toBuffer(), Buffer.from('deposit')],
            ASTER_PROGRAM_ID
        );
        return pda1;
    } catch (e) {
        // Pattern 2: [user_wallet, "user"]
        const [pda2] = await PublicKey.findProgramAddress(
            [userWallet.toBuffer(), Buffer.from('user')],
            ASTER_PROGRAM_ID
        );
        return pda2;
    }
}

/**
 * Create SOL deposit instruction for Aster Treasury
 *
 * @param {PublicKey} userWallet - User's wallet public key (must be signer)
 * @param {number} amountSOL - Amount to deposit in SOL
 * @returns {Promise<TransactionInstruction>} Deposit instruction
 */
async function createSolDepositInstruction(userWallet, amountSOL) {
    // Convert SOL to lamports
    const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);

    // Build instruction data
    const data = buildDepositInstructionData(amountLamports);

    // Derive user PDA
    const userPDA = await deriveUserPDA(userWallet);

    // Build instruction with accounts
    // Order matters! Based on transaction analysis:
    // [0] User wallet (signer)
    // [1] User PDA (writable) - program-derived account
    // [2] Treasury (writable) - receives SOL
    // [3] System Program - for transfer
    const instruction = new TransactionInstruction({
        keys: [
            { pubkey: userWallet, isSigner: true, isWritable: true },      // [0] User
            { pubkey: userPDA, isSigner: false, isWritable: true },        // [1] User PDA
            { pubkey: TREASURY_ACCOUNT, isSigner: false, isWritable: true }, // [2] Treasury
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // [3] System Program
        ],
        programId: ASTER_PROGRAM_ID,
        data: data,
    });

    return instruction;
}

/**
 * Decode instruction data for debugging
 *
 * @param {Buffer} data - Instruction data
 * @returns {Object} Decoded data
 */
function decodeInstructionData(data) {
    if (data.length !== 16) {
        throw new Error(`Invalid data length: ${data.length}, expected 16`);
    }

    const discriminator = data.readUInt8(0);

    // Read full 64-bit value and extract broker (skip first byte)
    const fullValue = data.readBigUInt64LE(0);
    const broker = fullValue >> 8n;

    const amountLamports = data.readBigUInt64LE(8);
    const amountSOL = Number(amountLamports) / LAMPORTS_PER_SOL;

    return {
        discriminator: `0x${discriminator.toString(16)}`,
        broker: broker.toString(),
        amountLamports: amountLamports.toString(),
        amountSOL: amountSOL,
        raw: data.toString('hex')
    };
}

module.exports = {
    ASTER_PROGRAM_ID,
    TREASURY_ACCOUNT,
    BROKER_ID,
    DEPOSIT_DISCRIMINATOR,
    buildDepositInstructionData,
    deriveUserPDA,
    createSolDepositInstruction,
    decodeInstructionData
};

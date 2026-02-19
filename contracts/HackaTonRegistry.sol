// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * HackaTonRegistry
 * ----------------
 * Minimal on-chain record of:
 *   1. Accepted intros between two wallets (walletA + walletB + timestamp).
 *   2. Encrypted chat messages emitted as events (ciphertexts are safe to
 *      store publicly – only the intended recipient can decrypt).
 *
 * Deployed on Arbitrum One.
 * Set VITE_REGISTRY_CONTRACT_ADDRESS in your .env after deployment.
 */
contract HackaTonRegistry {
    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    /// Emitted when two parties confirm an intro.
    event IntroAccepted(
        address indexed walletA,
        address indexed walletB,
        uint256 timestamp
    );

    /// Emitted when a participant sends an encrypted chat message on-chain.
    /// `introId`   – keccak256 / fixed bytes32 derived from the local intro UUID.
    /// `ciphertext` – NaCl box ciphertext; only the recipient can decrypt.
    event ChatMessage(
        bytes32 indexed introId,
        address indexed sender,
        bytes ciphertext
    );

    // -------------------------------------------------------------------------
    // Write functions
    // -------------------------------------------------------------------------

    /**
     * Record a confirmed intro between walletA and walletB.
     * The caller must be one of the two parties.
     */
    function recordIntro(address walletA, address walletB) external {
        require(
            msg.sender == walletA || msg.sender == walletB,
            "Must be a party to the intro"
        );
        emit IntroAccepted(walletA, walletB, block.timestamp);
    }

    /**
     * Emit an encrypted chat message on-chain.
     * The ciphertext should be the NaCl box encrypted payload (nonce ++ box).
     * Anyone can read it, but only the keyholder can decrypt it.
     */
    function sendChatMessage(bytes32 introId, bytes calldata ciphertext) external {
        emit ChatMessage(introId, msg.sender, ciphertext);
    }
}

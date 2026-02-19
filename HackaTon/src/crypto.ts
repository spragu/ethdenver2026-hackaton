/**
 * End-to-end encryption using NaCl box (X25519-XSalsa20-Poly1305).
 *
 * Key derivation:
 *   1. User signs a fixed deterministic message with their wallet (no tx).
 *   2. The signature bytes are SHA-256 hashed → 32-byte seed.
 *   3. Seed used to generate a NaCl box keypair.
 *
 * Encryption:
 *   - nacl.box() → ECDH shared secret between sender private + recipient public key.
 *   - Messages are stored twice: encrypted for recipient AND for sender
 *     (self-box: ECDH(senderPriv, senderPub) is a valid, decryptable keypair).
 *   - This lets both parties read their history without storing plaintext.
 */

import nacl from "tweetnacl";

export const SIGN_MESSAGE =
  "HackaTon Encryption Key v1\n\n" +
  "Signing this message derives your local encryption keypair.\n" +
  "It does not authorize any transaction or share your private key.";

// ─── Byte helpers ────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function b64Encode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

function b64Decode(b64: string): Uint8Array {
  return new Uint8Array(Array.from(atob(b64), (c) => c.charCodeAt(0)));
}

// ─── Keypair ─────────────────────────────────────────────────────────────────

export interface EncKeypair {
  publicKey: Uint8Array;  // 32 bytes
  secretKey: Uint8Array;  // 32 bytes
  publicKeyB64: string;   // base64 — safe to store on profile / Firebase
}

/**
 * Derive a deterministic NaCl box keypair from a wallet signature.
 * Call once per session; cache the result.
 */
export async function deriveKeypair(hexSignature: string): Promise<EncKeypair> {
  const sigBytes = hexToBytes(hexSignature);
  // Copy to a plain ArrayBuffer to satisfy SubtleCrypto's BufferSource type constraint
  const buf = sigBytes.buffer.slice(sigBytes.byteOffset, sigBytes.byteOffset + sigBytes.byteLength) as ArrayBuffer;
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  const seed = new Uint8Array(hashBuf);
  const kp = nacl.box.keyPair.fromSecretKey(seed);
  return {
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
    publicKeyB64: b64Encode(kp.publicKey),
  };
}

// ─── Encrypt / decrypt ───────────────────────────────────────────────────────

export interface EncryptedPayload {
  ct: string;    // base64 ciphertext
  nonce: string; // base64 nonce
}

/**
 * Encrypt `plaintext` so that `recipientPubKeyB64` can decrypt it.
 * Can also be used to self-encrypt (pass your own public key as recipient).
 */
export function encryptFor(
  plaintext: string,
  recipientPubKeyB64: string,
  senderSecretKey: Uint8Array
): EncryptedPayload {
  const msg = new TextEncoder().encode(plaintext);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const recipientPub = b64Decode(recipientPubKeyB64);
  const ct = nacl.box(msg, nonce, recipientPub, senderSecretKey);
  return { ct: b64Encode(ct), nonce: b64Encode(nonce) };
}

/**
 * Decrypt a payload produced by `encryptFor`.
 * Returns null if decryption fails (wrong key or tampered data).
 */
export function decryptFrom(
  payload: EncryptedPayload,
  senderPubKeyB64: string,
  recipientSecretKey: Uint8Array
): string | null {
  try {
    const ct = b64Decode(payload.ct);
    const nonce = b64Decode(payload.nonce);
    const senderPub = b64Decode(senderPubKeyB64);
    const plain = nacl.box.open(ct, nonce, senderPub, recipientSecretKey);
    if (!plain) return null;
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

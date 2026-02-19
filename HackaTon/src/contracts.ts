import { useWriteContract } from "wagmi";
import { createPublicClient, http, type Chain } from "viem";
import { arbitrum, base, optimism, mainnet, polygon } from "wagmi/chains";

// ---------------------------------------------------------------------------
// Registry contract
// ---------------------------------------------------------------------------

/**
 * Address of the deployed HackaTonRegistry contract on Arbitrum One.
 * Set VITE_REGISTRY_CONTRACT_ADDRESS in your .env after deploying
 * contracts/HackaTonRegistry.sol.
 */
export const REGISTRY_ADDRESS: `0x${string}` =
  (import.meta.env.VITE_REGISTRY_CONTRACT_ADDRESS as `0x${string}` | undefined) ??
  "0x0000000000000000000000000000000000000000";

/** ABI for HackaTonRegistry.sol */
export const REGISTRY_ABI = [
  {
    type: "function",
    name: "recordIntro",
    inputs: [
      { name: "walletA", type: "address" },
      { name: "walletB", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "sendChatMessage",
    inputs: [
      { name: "introId", type: "bytes32" },
      { name: "ciphertext", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "IntroAccepted",
    inputs: [
      { name: "walletA", type: "address", indexed: true },
      { name: "walletB", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ChatMessage",
    inputs: [
      { name: "introId", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "ciphertext", type: "bytes", indexed: false },
    ],
  },
] as const;

/** ABI fragment for ERC-721 ownerOf */
export const ERC721_OWNER_OF_ABI = [
  {
    type: "function",
    name: "ownerOf",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

/** True when a real contract address has been configured. */
export function isRegistryDeployed(): boolean {
  return REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";
}

// ---------------------------------------------------------------------------
// On-chain ownership verification (read-only, no wallet needed)
// ---------------------------------------------------------------------------

const CHAIN_BY_SLUG: Record<string, Chain> = {
  arbitrum: arbitrum,
  "arbitrum-one": arbitrum,
  base: base,
  optimism: optimism,
  ethereum: mainnet,
  polygon: polygon,
};

/**
 * Verify that `expectedOwner` is the actual owner of an ERC-721 token by
 * calling `ownerOf(tokenId)` directly on the contract.
 * Returns `null` if the chain is unsupported or the call fails.
 */
export async function verifyNftOwnershipOnChain(
  chainSlug: string,
  contractAddress: `0x${string}`,
  tokenId: string,
  expectedOwner: string
): Promise<boolean | null> {
  const chain = CHAIN_BY_SLUG[chainSlug.toLowerCase()];
  if (!chain) return null;

  const client = createPublicClient({ chain, transport: http() });
  try {
    const owner = (await client.readContract({
      address: contractAddress,
      abi: ERC721_OWNER_OF_ABI,
      functionName: "ownerOf",
      args: [BigInt(tokenId)],
    })) as string;
    return owner.toLowerCase() === expectedOwner.toLowerCase();
  } catch {
    return null; // token burned, wrong chain, or non-ERC721
  }
}

// ---------------------------------------------------------------------------
// React hooks – write functions
// ---------------------------------------------------------------------------

/**
 * Hook: returns an async function that records a confirmed intro on-chain.
 * Silently skips (returns null) if the registry contract isn't deployed yet.
 */
export function useRecordIntroOnChain() {
  const { writeContractAsync } = useWriteContract();

  return async (
    walletA: string,
    walletB: string
  ): Promise<`0x${string}` | null> => {
    if (!isRegistryDeployed()) return null;
    try {
      const hash = await writeContractAsync({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "recordIntro",
        args: [walletA as `0x${string}`, walletB as `0x${string}`],
      });
      console.log(`[registry] intro recorded on-chain: ${hash}`);
      return hash;
    } catch (err) {
      console.warn("[registry] recordIntro failed:", err);
      return null;
    }
  };
}

/**
 * Hook: returns an async function that emits an encrypted chat message
 * as an on-chain event via HackaTonRegistry.sendChatMessage().
 * The introId string is zero-padded to a bytes32.
 */
export function useSendChatOnChain() {
  const { writeContractAsync } = useWriteContract();

  return async (
    introId: string,
    ciphertextBytes: Uint8Array
  ): Promise<`0x${string}` | null> => {
    if (!isRegistryDeployed()) return null;
    try {
      // Convert introId string → bytes32 (left-aligned, zero-padded)
      const encoded = new TextEncoder().encode(introId);
      const padded = new Uint8Array(32);
      padded.set(encoded.slice(0, 32));
      const introIdBytes32 = (
        "0x" +
        Array.from(padded)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      ) as `0x${string}`;

      // viem requires bytes arguments as 0x-prefixed hex strings
      const ciphertextHex = ("0x" +
        Array.from(ciphertextBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")) as `0x${string}`;

      const hash = await writeContractAsync({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "sendChatMessage",
        args: [introIdBytes32, ciphertextHex],
      });
      console.log(`[registry] chat message on-chain: ${hash}`);
      return hash;
    } catch (err) {
      console.warn("[registry] sendChatMessage failed:", err);
      return null;
    }
  };
}

import type { EncryptedPayload } from "./crypto";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener: (event: string, listener: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export interface BuilderProfile {
  wallet: string;
  name: string;
  handle: string;
  bio: string;
  skills: string[];
  links: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  linkedNfts?: string[];  // OpenSea item URLs e.g. https://opensea.io/item/arbitrum/0x.../186
  /** Base64-encoded NaCl box public key, derived from wallet signature. Used for E2E chat. */
  encryptionPubKey?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TeamListing {
  id: string;
  ownerWallet: string;
  projectName: string;
  description: string;
  desiredSkills: string[];
  maxTeamSize: number;
  createdAt: number;
}

export type IntroStatus = "requested" | "accepted" | "declined" | "expired";

export interface IntroRequest {
  id: string;
  teamId: string;
  teamName: string;
  applicantWallet: string;
  ownerWallet: string;
  status: IntroStatus;
  /** "owner" = team owner reached out; "applicant" = builder applied directly */
  initiatedBy?: "owner" | "applicant";
  message?: string;
  createdAt: number;
  resolvedAt?: number;
}

/** A single encrypted chat message stored per intro. */
export interface ChatMessage {
  id: string;
  introId: string;
  fromWallet: string;
  toWallet: string;
  /** Encrypted copy readable by the recipient (nacl.box to recipientPubKey). */
  forRecipient: EncryptedPayload;
  /** Self-encrypted copy readable by the sender (nacl.box to senderPubKey). */
  forSender: EncryptedPayload;
  timestamp: number;
}

export const COMMON_SKILLS = [
  // Languages
  "TypeScript",
  "JavaScript",
  "Python",
  "Rust",
  "Go",
  "Java",
  "C++",
  "C#",
  "Solidity",
  "Vyper",
  "Move",
  // Frontend frameworks
  "React",
  "Next.js",
  "Vue.js",
  "Svelte",
  "Angular",
  "Tailwind CSS",
  // Backend / infra
  "Node.js",
  "GraphQL",
  "Docker",
  "AWS",
  // Web3
  "EVM",
  "Wagmi / Viem",
  "Hardhat / Foundry",
  "IPFS",
  "ZK",
  // AI / other
  "LLMs",
  "Privacy",
];

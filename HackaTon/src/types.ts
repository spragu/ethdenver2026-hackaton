import type { EncryptedPayload } from "./crypto";

export type Role =
  | "Frontend"
  | "Backend"
  | "Smart Contract"
  | "UI/UX"
  | "AI/ML"
  | "DevOps"
  | "Product"
  | "Other";

export type Availability = "full-time" | "part-time" | "weekends-only";

export interface BuilderProfile {
  wallet: string;
  name: string;
  handle: string;
  bio: string;
  skills: string[];
  roles: Role[];
  availability: Availability;
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
  requiredRoles: Role[];
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

export const ALL_ROLES: Role[] = [
  "Frontend",
  "Backend",
  "Smart Contract",
  "UI/UX",
  "AI/ML",
  "DevOps",
  "Product",
  "Other",
];

export const COMMON_SKILLS = [
  "TypeScript",
  "React",
  "Solidity",
  "Rust",
  "Python",
  "Node.js",
  "GraphQL",
  "IPFS",
  "EVM",
  "ZK Proofs",
  "LLMs",
  "Wagmi / Viem",
  "Hardhat / Foundry",
  "AWS",
  "Docker",
];

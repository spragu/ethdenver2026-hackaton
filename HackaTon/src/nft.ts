import { ipfsToGatewayUrl } from "./ipfs";

const OPENSEA_API_BASE = "https://api.opensea.io/api/v2";

function getApiKey(): string {
  return import.meta.env.VITE_OPENSEA_API_KEY ?? "";
}

export interface ParsedOpenseaUrl {
  chainSlug: string;
  contractAddress: `0x${string}`;
  tokenId: string;   // string identifier for OpenSea API
  raw: string;
}

export interface NftMetadata {
  name?: string;
  description?: string;
  image?: string;
  animationUrl?: string;
  traits?: Array<{ trait_type: string; value: string | number }>;
  externalUrl?: string;
  collection?: string;
}

/**
 * Parse an OpenSea item URL into its components.
 * Supports:
 *   https://opensea.io/item/{chain}/{contract}/{tokenId}
 *   https://opensea.io/assets/{chain}/{contract}/{tokenId}
 */
export function parseOpenseaUrl(url: string): ParsedOpenseaUrl | null {
  try {
    const u = new URL(url.trim());
    if (!u.hostname.includes("opensea.io")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 4 || !["item", "assets"].includes(parts[0])) return null;
    const [, chainSlug, contractAddress, tokenIdStr] = parts;
    if (!contractAddress.startsWith("0x")) return null;
    return {
      chainSlug,
      contractAddress: contractAddress as `0x${string}`,
      tokenId: tokenIdStr,
      raw: url.trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch NFT metadata using the OpenSea API v2.
 * API docs: https://docs.opensea.io/reference/get_nft
 */
export async function fetchNftMetadata(parsed: ParsedOpenseaUrl): Promise<NftMetadata | null> {
  const apiKey = getApiKey();
  const url = `${OPENSEA_API_BASE}/chain/${parsed.chainSlug}/contract/${parsed.contractAddress}/nfts/${parsed.tokenId}`;

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(apiKey ? { "x-api-key": apiKey } : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`OpenSea API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const nft = data.nft;
  if (!nft) return null;

  return {
    name: nft.name,
    description: nft.description,
    image: nft.image_url,
    animationUrl: nft.animation_url,
    traits: nft.traits,
    externalUrl: nft.external_url,
    collection: nft.collection,
  };
}

/**
 * Resolve a media URL to a usable HTTP URL.
 * OpenSea returns CDN URLs directly; this handles any leftover ipfs:// URIs.
 */
export function resolveMediaUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("ipfs://")) return ipfsToGatewayUrl(url);
  if (url.startsWith("http")) return url;
  return null;
}

/**
 * Guess the MIME type for a URL (rough heuristic).
 */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogv|mov)(\?|$)/i.test(url) ||
    url.includes("animation") ||
    url.includes("video");
}

// Gateways tried in order — first success wins
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
];

/**
 * Extract the IPFS CID/path from any IPFS URI form.
 */
function ipfsCidPath(ipfsUri: string): string | null {
  if (ipfsUri.startsWith("ipfs://")) return ipfsUri.slice(7);
  // Raw CID (Qm... or bafy...)
  if (/^(Qm|bafy)[a-zA-Z0-9]/.test(ipfsUri)) return ipfsUri;
  // Already a gateway URL — extract the CID part
  const m = ipfsUri.match(/\/ipfs\/(.+)/);
  if (m) return m[1];
  return null;
}

/**
 * Convert IPFS URI to a gateway URL using the first gateway.
 * For already-resolved HTTP URLs, returns as-is.
 */
export function ipfsToGatewayUrl(ipfsUri: string): string {
  if (ipfsUri.startsWith("https://") || ipfsUri.startsWith("http://")) {
    return ipfsUri;
  }
  const cid = ipfsCidPath(ipfsUri) ?? ipfsUri;
  return `${IPFS_GATEWAYS[0]}${cid}`;
}

/**
 * Fetch a URL with a timeout (ms).
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Fetch JSON from an IPFS URI, trying each gateway in turn.
 */
export async function fetchIpfsJsonMetadata(ipfsUrl: string): Promise<any> {
  // If it's already a plain HTTP URL, try it directly
  if (ipfsUrl.startsWith("http")) {
    try {
      const res = await fetchWithTimeout(ipfsUrl, 8000);
      return await res.json();
    } catch {
      // fall through to gateway fallbacks if it looks like an IPFS gateway URL
      const cid = ipfsCidPath(ipfsUrl);
      if (!cid) return null;
      return tryGateways(cid);
    }
  }

  const cid = ipfsCidPath(ipfsUrl);
  if (!cid) return null;
  return tryGateways(cid);
}

async function tryGateways(cid: string): Promise<any> {
  for (const gateway of IPFS_GATEWAYS) {
    const url = `${gateway}${cid}`;
    try {
      const res = await fetchWithTimeout(url, 8000);
      return await res.json();
    } catch {
      // try next gateway
    }
  }
  console.error("All IPFS gateways failed for:", cid);
  return null;
}

/**
 * Extract image URL from NFT metadata
 * Supports common standards: ERC1155, OpenSea, etc.
 */
export function extractImageFromMetadata(metadata: any): string | null {
  if (!metadata) return null;

  // Try common image fields
  const imageField = metadata.image || metadata.image_url || metadata.imageUrl;
  if (imageField) return imageField;

  return null;
}

/**
 * Check if a value is an IPFS URI
 */
export function isIpfsUri(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return value.startsWith("ipfs://") || /^(Qm|bafy)[a-zA-Z0-9]{44,}/.test(value);
}

/**
 * Check if a value looks like an image URL or IPFS image
 */
export function isImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return isIpfsUri(value as unknown) || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value) || value.startsWith("http");
}

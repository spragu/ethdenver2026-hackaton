import { useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";

/**
 * Resolve a wallet address to its primary ENS name (mainnet).
 *
 * Returns:
 *  - The ENS name if one exists, e.g. "vitalik.eth"
 *  - A shortened hex address as fallback, e.g. "0x1234…abcd"
 *  - Empty string if address is undefined
 */
export function useWalletName(address: string | undefined): string {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: mainnet.id,
    query: { enabled: !!address },
  });

  if (!address) return "";
  if (ensName) return ensName;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Synchronous helper – formats a wallet address for display without ENS
 * (use this outside React components / hooks).
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

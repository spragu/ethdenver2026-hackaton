import { useWalletName } from "../ens";

interface Props {
  /** Raw 0x wallet address to display */
  address: string | undefined;
  className?: string;
}

/**
 * Displays a wallet address as its ENS name (if one exists) or a shortened
 * hex fallback.  Falls back to ENS mainnet resolution via wagmi's useEnsName.
 *
 * Usage:
 *   <WalletName address={intro.ownerWallet} />
 */
export function WalletName({ address, className }: Props) {
  const name = useWalletName(address);
  return (
    <span className={className} title={address}>
      {name}
    </span>
  );
}

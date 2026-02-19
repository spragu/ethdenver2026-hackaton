import { useQuery } from "@tanstack/react-query";
import { parseOpenseaUrl, fetchNftMetadata, resolveMediaUrl } from "../nft";
import { verifyNftOwnershipOnChain } from "../contracts";

interface Props {
  openseaUrl: string;
  compact?: boolean;
  /** When provided, confirms ownership via on-chain ownerOf() call */
  ownerWallet?: string;
}

export function NftCredentialCard({ openseaUrl, compact = false, ownerWallet }: Props) {
  const parsed = parseOpenseaUrl(openseaUrl);

  const { data: metadata, isLoading, isError } = useQuery({
    queryKey: ["nft-metadata", openseaUrl],
    queryFn: () => fetchNftMetadata(parsed!),
    enabled: !!parsed,
    staleTime: 1000 * 60 * 30,
    retry: 2,
  });

  // On-chain ownership verification: call ownerOf(tokenId) on the contract
  const { data: ownershipVerified } = useQuery({
    queryKey: ["nft-ownership", parsed?.contractAddress, parsed?.tokenId, ownerWallet],
    queryFn: () =>
      verifyNftOwnershipOnChain(
        parsed!.chainSlug,
        parsed!.contractAddress,
        parsed!.tokenId,
        ownerWallet!
      ),
    enabled: !!parsed && !!ownerWallet,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // Badge shown next to the NFT name
  function OwnershipBadge() {
    if (!ownerWallet) return null;
    if (ownershipVerified === undefined) return null; // still loading
    if (ownershipVerified === true)
      return (
        <span className="badge bg-success ms-1" title="Verified on-chain: wallet owns this NFT">
          &#10003; verified
        </span>
      );
    if (ownershipVerified === false)
      return (
        <span className="badge bg-danger ms-1" title="On-chain check failed: wallet does not own this NFT">
          &#10007; not owned
        </span>
      );
    return null; // null = call failed (unsupported chain, etc.) — show nothing
  }

  if (!parsed) {
    return <div className="alert alert-danger py-2 small mb-0">Invalid OpenSea URL</div>;
  }

  const animUrl = resolveMediaUrl(metadata?.animationUrl);
  const imageUrl = resolveMediaUrl(metadata?.image);

  const winnerTrait = metadata?.traits?.find(
    (t) => String(t.trait_type).toUpperCase() === "NFT_TYPE"
  );
  const projectTrait = metadata?.traits?.find(
    (t) => String(t.trait_type).toUpperCase() === "PROJECT_NAME"
  );
  const hackathonTrait = metadata?.traits?.find(
    (t) => String(t.trait_type).toUpperCase() === "HACKATHON_NAME"
  );

  const isWin =
    String(winnerTrait?.value ?? "").toUpperCase() === "WINNER" ||
    String(metadata?.name ?? "").toUpperCase().includes("WINNER") ||
    String(metadata?.name ?? "").toUpperCase().includes("WIN");

  /*  Compact mode (used on candidate cards)  */
  if (compact) {
    return (
      <div className="d-flex align-items-center gap-2 bg-white border rounded p-2">
        {(animUrl || imageUrl) && (
          <div
            style={{ width: 48, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}
          >
            {animUrl ? (
              <video
                src={animUrl}
                autoPlay
                muted
                loop
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <img
                src={imageUrl!}
                alt={metadata?.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
        )}
        <div className="flex-grow-1 min-w-0">
          {isLoading ? (
            <span className="text-muted small">Loading NFT</span>
          ) : (
            <>
              <div className="fw-semibold small text-truncate">
                {metadata?.name ?? `Token #${parsed.tokenId}`}
              </div>
              {isWin && (
                <span className="badge bg-warning text-dark"> Winner</span>
              )}
              <OwnershipBadge />
            </>
          )}
        </div>
        <a
          href={openseaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="small text-primary text-nowrap ms-auto"
        >
          OpenSea 
        </a>
      </div>
    );
  }

  /*  Full card mode  */
  return (
    <div className="card overflow-hidden">
      {/* Loading placeholder */}
      {isLoading && (
        <div
          className="ratio ratio-16x9 bg-light d-flex align-items-center justify-content-center"
        >
          <span className="text-muted">Loading NFT</span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="alert alert-warning rounded-0 mb-0 text-center small">
          Could not load NFT metadata
        </div>
      )}

      {/* Video (animation_url)  responsive 16:9 box */}
      {!isLoading && !isError && animUrl && (
        <div className="ratio ratio-16x9 bg-black">
          <video
            src={animUrl}
            autoPlay
            muted
            loop
            playsInline
            controls
            style={{ objectFit: "contain" }}
          />
        </div>
      )}

      {/* Image fallback  responsive 16:9 box */}
      {!isLoading && !isError && !animUrl && imageUrl && (
        <div className="ratio ratio-16x9 bg-light">
          <img
            src={imageUrl}
            alt={metadata?.name}
            style={{ objectFit: "contain" }}
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        </div>
      )}

      {/* Details */}
      {!isLoading && metadata && (
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <h5 className="card-title mb-1">
                {metadata.name ?? `Token #${parsed.tokenId}`}
              </h5>
              {metadata.description && (
                <p className="card-text text-muted small">{metadata.description}</p>
              )}
            </div>
            <a
              href={openseaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="small text-primary text-nowrap"
            >
              View on OpenSea 
            </a>
          </div>

          <div className="d-flex flex-wrap gap-1">
            {isWin && (
              <span className="badge bg-warning text-dark"> Winner</span>
            )}
            <OwnershipBadge />
            {hackathonTrait && (
              <span className="badge bg-primary">{String(hackathonTrait.value)}</span>
            )}
            {projectTrait && (
              <span className="badge bg-success">{String(projectTrait.value)}</span>
            )}
            {metadata.traits
              ?.filter(
                (t) =>
                  !["NFT_TYPE", "HACKATHON_NAME", "PROJECT_NAME"].includes(
                    String(t.trait_type).toUpperCase()
                  )
              )
              .slice(0, 4)
              .map((t) => (
                <span key={t.trait_type} className="badge bg-secondary">
                  {t.trait_type}: {t.value}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

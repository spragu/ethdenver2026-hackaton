import type { IntroRequest, IntroStatus } from "../types";
import { saveIntro } from "../storage";
import { useRecordIntroOnChain, isRegistryDeployed } from "../contracts";
import { WalletName } from "./WalletName";

interface Props {
  intros: IntroRequest[];
  applicantWallet: string;
  onUpdate: () => void;
}

const statusVariant: Record<IntroStatus, string> = {
  requested: "warning",
  accepted: "success",
  declined: "danger",
  expired: "secondary",
};

export function IntroInbox({ intros, applicantWallet, onUpdate }: Props) {
  const myIntros = intros.filter(
    (i) => i.applicantWallet.toLowerCase() === applicantWallet.toLowerCase()
  );
  const pending = myIntros.filter((i) => i.status === "requested");
  const resolved = myIntros.filter((i) => i.status !== "requested");

  const recordIntroOnChain = useRecordIntroOnChain();

  function respond(intro: IntroRequest, status: "accepted" | "declined") {
    saveIntro({ ...intro, status, resolvedAt: Date.now() });
    onUpdate();
    if (status === "accepted") {
      // Fire-and-forget: record the confirmed intro on Arbitrum
      recordIntroOnChain(intro.applicantWallet, intro.ownerWallet);
    }
  }

  if (myIntros.length === 0) {
    return (
      <div>
        <h5>Intro Inbox</h5>
        <p className="text-muted">
          No intro requests yet. Build out your profile to get discovered!
        </p>
      </div>
    );
  }

  return (
    <div>
      <h5>Intro Inbox</h5>

      {pending.length > 0 && (
        <>
          <h6 className="text-muted mb-2">Pending ({pending.length})</h6>
          <div className="d-flex flex-column gap-3 mb-4">
            {pending.map((intro) => (
              <IntroCard key={intro.id} intro={intro} onRespond={respond} />
            ))}
          </div>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <h6 className="text-muted mb-2">Previous ({resolved.length})</h6>
          <div className="d-flex flex-column gap-3">
            {resolved.map((intro) => (
              <IntroCard key={intro.id} intro={intro} onRespond={respond} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function IntroCard({
  intro,
  onRespond,
}: {
  intro: IntroRequest;
  onRespond: (intro: IntroRequest, status: "accepted" | "declined") => void;
}) {
  const date = new Date(intro.createdAt).toLocaleDateString();

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h6 className="mb-0">{intro.teamName}</h6>
            <small className="text-muted">
              From: <WalletName address={intro.ownerWallet} /> &middot; {date}
            </small>
          </div>
          <span className={`badge bg-${statusVariant[intro.status]}`}>
            {intro.status}
          </span>
        </div>

        {intro.message && (
          <p className="small text-muted mb-2">{intro.message}</p>
        )}

        {intro.status === "accepted" && (
          <div className="alert alert-success py-2 small mb-0">
            &#10003; Intro accepted! The team owner can now reach out to coordinate.
            {isRegistryDeployed() && (
              <span className="ms-2 badge bg-dark" title="Recorded on Arbitrum">
                &#9741; on-chain
              </span>
            )}
          </div>
        )}

        {intro.status === "requested" && (
          <div className="d-flex gap-2 mt-2">
            <button
              className="btn btn-primary flex-grow-1"
              onClick={() => onRespond(intro, "accepted")}
            >
              Accept
            </button>
            <button
              className="btn btn-outline-danger flex-grow-1"
              onClick={() => onRespond(intro, "declined")}
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

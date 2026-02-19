import type { BuilderProfile, TeamListing, IntroRequest } from "../types";
import { generateId, saveIntro, loadIntros, loadAllProfiles } from "../storage";
import { useState } from "react";
import { NftCredentialCard } from "./NftCredentialCard";
import { useRecordIntroOnChain } from "../contracts";
import { WalletName } from "./WalletName";

const availabilityVariant: Record<string, string> = {
  "full-time": "success",
  "part-time": "warning",
  "weekends-only": "danger",
};

interface Props {
  team: TeamListing;
  ownerWallet: string;
  onIntroSent: () => void;
}

export function CandidateList({ team, ownerWallet, onIntroSent }: Props) {
  // Show all registered profiles (including same wallet for single-browser demo)
  const allCandidates = loadAllProfiles();

  const rawIntros = loadIntros();
  // Incoming applications: any applicant-initiated intro addressed to this owner
  // (match by ownerWallet across all their teams so team ID changes don't hide entries)
  const incomingApplications = rawIntros.filter(
    (i) =>
      i.initiatedBy === "applicant" &&
      i.ownerWallet.toLowerCase() === ownerWallet.toLowerCase()
  );
  const allIntros = rawIntros.filter((i) => i.teamId === team.id);
  const incomingWallets = new Set(incomingApplications.map((i) => i.applicantWallet.toLowerCase()));

  const recordIntroOnChain = useRecordIntroOnChain();

  const [sentIntros, setSentIntros] = useState<Set<string>>(
    () =>
      new Set(
        allIntros
          .filter((i) => i.initiatedBy !== "applicant")
          .map((i) => i.applicantWallet)
      )
  );
  const [applicationStatuses, setApplicationStatuses] = useState<Record<string, IntroRequest["status"]>>(
    () => Object.fromEntries(incomingApplications.map((i) => [i.applicantWallet.toLowerCase(), i.status]))
  );
  const [messageMap, setMessageMap] = useState<Record<string, string>>({});

  function scoreMatch(candidate: BuilderProfile): number {
    const roleMatch = candidate.roles.filter((r) => team.requiredRoles.includes(r)).length;
    const skillMatch = candidate.skills.filter((s) => team.desiredSkills.includes(s)).length;
    return roleMatch * 3 + skillMatch;
  }

  const ranked = [...allCandidates].sort((a, b) => scoreMatch(b) - scoreMatch(a));

  function sendIntro(candidate: BuilderProfile) {
    const intro: IntroRequest = {
      id: generateId(),
      teamId: team.id,
      teamName: team.projectName,
      applicantWallet: candidate.wallet,
      ownerWallet,
      status: "requested",
      initiatedBy: "owner",
      message: messageMap[candidate.wallet] ?? "",
      createdAt: Date.now(),
    };
    saveIntro(intro);
    setSentIntros((prev) => new Set([...prev, candidate.wallet]));
    onIntroSent();
  }

  function respondToApplication(intro: IntroRequest, status: "accepted" | "declined") {
    saveIntro({ ...intro, status, resolvedAt: Date.now() });
    setApplicationStatuses((prev) => ({ ...prev, [intro.applicantWallet.toLowerCase()]: status }));
    onIntroSent();
    if (status === "accepted") {
      // Fire-and-forget: record the confirmed intro on Arbitrum
      recordIntroOnChain(intro.ownerWallet, intro.applicantWallet);
    }
  }

  // Profiles of applicants who applied directly, for display
  const applicantProfileMap = new Map(
    allCandidates.map((p) => [p.wallet.toLowerCase(), p])
  );

  return (
    <div>
      <h5 className="mb-1">Candidates for "{team.projectName}"</h5>
      <p className="text-muted small mb-3">
        Ranked by match to your required roles and skills.
      </p>

      {/* Incoming applications from builders */}
      {incomingApplications.length > 0 && (
        <div className="mb-4">
          <h6 className="text-muted mb-2">&#128229; Incoming Applications ({incomingApplications.length})</h6>
          <div className="d-flex flex-column gap-3">
            {incomingApplications.map((intro) => {
              const profile = applicantProfileMap.get(intro.applicantWallet.toLowerCase());
              const currentStatus = applicationStatuses[intro.applicantWallet.toLowerCase()] ?? intro.status;
              return (
                <div key={intro.id} className="card border-primary">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <div>
                        <h6 className="mb-0">{profile?.name ?? <WalletName address={intro.applicantWallet} />}</h6>
                        {profile?.handle && <small className="text-muted">{profile.handle}</small>}
                        {intro.teamName !== team.projectName && (
                          <div><small className="text-muted">Applied to: <strong>{intro.teamName}</strong></small></div>
                        )}
                      </div>
                      <span className={`badge bg-${{ requested: "warning", accepted: "success", declined: "danger", expired: "secondary" }[currentStatus]}`}>
                        {currentStatus}
                      </span>
                    </div>
                    {profile?.bio && <p className="small text-muted mb-2">{profile.bio}</p>}
                    {intro.message && (
                      <div className="alert alert-light py-2 small mb-2">&#128172; "{intro.message}"</div>
                    )}
                    {profile && (
                      <div className="d-flex flex-wrap gap-1 mb-2">
                        {profile.roles.map((r) => (
                          <span key={r} className={`badge ${team.requiredRoles.includes(r) ? "bg-primary" : "bg-secondary"}`}>{r}</span>
                        ))}
                        {profile.skills.slice(0, 5).map((s) => (
                          <span key={s} className={`badge ${team.desiredSkills.includes(s) ? "bg-success" : "bg-light text-dark border"}`}>{s}</span>
                        ))}
                      </div>
                    )}
                    {currentStatus === "requested" && (
                      <div className="d-flex gap-2">
                        <button className="btn btn-success btn-sm" onClick={() => respondToApplication(intro, "accepted")}>Accept</button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => respondToApplication(intro, "declined")}>Decline</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <hr className="my-4" />
        </div>
      )}

      {/* All candidates */}
      <div className="d-flex flex-column gap-3">
        {ranked.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p className="mb-1">No builders have signed up yet.</p>
            <p className="small">Share your listing so builders can create profiles and apply.</p>
          </div>
        ) : ranked.map((candidate) => {
          const score = scoreMatch(candidate);
          const alreadySent = sentIntros.has(candidate.wallet);
          const hasApplied = incomingWallets.has(candidate.wallet.toLowerCase());
          const roleMatches = candidate.roles.filter((r) => team.requiredRoles.includes(r));
          const skillMatches = candidate.skills.filter((s) => team.desiredSkills.includes(s));

          return (
            <div key={candidate.wallet} className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="mb-0">{candidate.name}</h6>
                    <small className="text-muted">{candidate.handle}</small>
                  </div>
                  <div className="d-flex gap-2 align-items-center flex-shrink-0">
                    {score > 0 && (
                      <span className="badge bg-primary">&#9733; {score} match</span>
                    )}
                    <span className={`badge bg-${availabilityVariant[candidate.availability] ?? "secondary"}`}>
                      {candidate.availability}
                    </span>
                  </div>
                </div>

                {candidate.bio && (
                  <p className="small text-muted mb-2">{candidate.bio}</p>
                )}

                {candidate.linkedNfts && candidate.linkedNfts.length > 0 && (
                  <div className="d-flex flex-column gap-2 mb-2">
                    {candidate.linkedNfts.map((url) => (
                      <NftCredentialCard key={url} openseaUrl={url} compact ownerWallet={candidate.wallet} />
                    ))}
                  </div>
                )}

                <div className="d-flex flex-wrap gap-1 mb-2">
                  {roleMatches.map((r) => (
                    <span key={r} className="badge bg-primary">{r}</span>
                  ))}
                  {skillMatches.map((s) => (
                    <span key={s} className="badge bg-success">{s}</span>
                  ))}
                  {candidate.roles
                    .filter((r) => !roleMatches.includes(r))
                    .map((r) => (
                      <span key={r} className="badge bg-secondary">{r}</span>
                    ))}
                  {candidate.skills
                    .filter((s) => !skillMatches.includes(s))
                    .slice(0, 4)
                    .map((s) => (
                      <span key={s} className="badge bg-light text-dark border">{s}</span>
                    ))}
                </div>

                {hasApplied ? (
                  <div className="text-primary small">&#128229; This builder applied — see Incoming Applications above</div>
                ) : !alreadySent ? (
                  <div>
                    <textarea
                      className="form-control form-control-sm mb-2"
                      rows={2}
                      placeholder="Optional intro message"
                      value={messageMap[candidate.wallet] ?? ""}
                      onChange={(e) =>
                        setMessageMap((prev) => ({
                          ...prev,
                          [candidate.wallet]: e.target.value,
                        }))
                      }
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => sendIntro(candidate)}
                    >
                      Send Intro Request
                    </button>
                  </div>
                ) : (
                  <div className="text-success small">&#10003; Intro request sent</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

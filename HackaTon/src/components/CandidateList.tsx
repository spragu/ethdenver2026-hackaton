import type { BuilderProfile, TeamListing, IntroRequest } from "../types";
import { generateId, saveIntro, loadIntros, loadAllProfiles, loadAllAIRanks, saveAIRank } from "../storage";
import { useState } from "react";
import { NftCredentialCard } from "./NftCredentialCard";
import { useRecordIntroOnChain } from "../contracts";
import { WalletName } from "./WalletName";
import { rankCandidates } from "../0gai";

interface AIRank { stars: number; reasoning: string; }

function StarRating({ stars, reasoning }: AIRank) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="position-relative d-inline-flex align-items-center gap-1"
      style={{ cursor: "help" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ letterSpacing: 1, fontSize: "1.05rem", lineHeight: 1 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ color: i < stars ? "#f5a623" : "#ced4da" }}>&#9733;</span>
        ))}
      </span>
      <small className="text-muted" style={{ fontSize: "0.7rem" }}>{stars}/5</small>
      {show && (
        <div
          className="card shadow-sm"
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            right: 0,
            width: 260,
            zIndex: 999,
            fontSize: "0.8rem",
            whiteSpace: "normal",
          }}
        >
          <div className="card-body py-2 px-3">
            <p className="mb-1 fw-semibold text-body">Reasoning provided by: 0G.ai</p>
            <p className="mb-0 text-muted">{reasoning}</p>
          </div>
        </div>
      )}
    </span>
  );
}

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
  const [aiRankings, setAiRankings] = useState<Record<string, AIRank>>(() => {
    const cached = loadAllAIRanks(team.id);
    const hydrated: Record<string, AIRank> = {};
    for (const [wallet, rank] of Object.entries(cached)) {
      hydrated[wallet] = { stars: rank.stars, reasoning: rank.reasoning };
    }
    return hydrated;
  });
  const [aiLoadingWallets, setAiLoadingWallets] = useState<Set<string>>(new Set());
  const [aiError, setAiError] = useState("");

  function setWalletLoading(wallet: string, loading: boolean) {
    setAiLoadingWallets((prev) => {
      const next = new Set(prev);
      loading ? next.add(wallet.toLowerCase()) : next.delete(wallet.toLowerCase());
      return next;
    });
  }

  function applyResult(wallet: string, score: number, reasoning: string) {
    const stars = Math.min(5, Math.max(0, Math.round(score / 20)));
    setAiRankings((prev) => ({ ...prev, [wallet.toLowerCase()]: { stars, reasoning } }));
    saveAIRank(team.id, wallet, { stars, reasoning, score, cachedAt: Date.now() });
  }

  async function rankOne(candidate: BuilderProfile) {
    setWalletLoading(candidate.wallet, true);
    setAiError("");
    try {
      const results = await rankCandidates(team, [candidate]);
      if (results[0]) applyResult(candidate.wallet, results[0].score, results[0].reasoning);
      else throw new Error("AI returned no result for this candidate.");
    } catch (e) {
      setAiError(String(e));
    } finally {
      setWalletLoading(candidate.wallet, false);
    }
  }

  async function runAiRanking() {
    if (allCandidates.length === 0) return;
    setAiError("");
    setAiLoadingWallets(new Set(allCandidates.map((c) => c.wallet.toLowerCase())));
    await Promise.all(
      allCandidates.map(async (candidate) => {
        try {
          const results = await rankCandidates(team, [candidate]);
          if (results[0]) applyResult(candidate.wallet, results[0].score, results[0].reasoning);
        } catch (e) {
          setAiError(String(e));
        } finally {
          setWalletLoading(candidate.wallet, false);
        }
      })
    );
  }

  const anyLoading = aiLoadingWallets.size > 0;
  const hasAiRankings = Object.keys(aiRankings).length > 0;

  function scoreMatch(candidate: BuilderProfile): number {
    const skillMatch = candidate.skills.filter((s) => team.desiredSkills.includes(s)).length;
    return skillMatch;
  }

  const ranked = [...allCandidates].sort((a, b) => {
    if (hasAiRankings) {
      const aStars = aiRankings[a.wallet.toLowerCase()]?.stars ?? -1;
      const bStars = aiRankings[b.wallet.toLowerCase()]?.stars ?? -1;
      if (bStars !== aStars) return bStars - aStars;
    }
    return scoreMatch(b) - scoreMatch(a);
  });

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

  // Map from wallet -> intro object for applicants, so we can accept/decline inline
  const incomingIntroMap = new Map(
    incomingApplications.map((i) => [i.applicantWallet.toLowerCase(), i])
  );

  // Unified list: all candidates except those explicitly declined
  const visible = ranked.filter((c) => {
    const status = applicationStatuses[c.wallet.toLowerCase()];
    return status !== "declined";
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-1">
        <h5 className="mb-0">Candidates for "{team.projectName}"</h5>
        <button
          className="btn btn-sm btn-outline-warning d-flex align-items-center gap-1"
          onClick={runAiRanking}
          disabled={anyLoading || allCandidates.length === 0}
          title="Use 0G AI to score each candidate and sort by fit"
        >
          {anyLoading
            ? <><span className="spinner-border spinner-border-sm" /> Ranking…</>
            : <>&#9733; AI Rank</>}
        </button>
      </div>
      <p className="text-muted small mb-3">
        {hasAiRankings ? "Sorted by AI star rating — highest ranked first." : "Ranked by skill overlap. Click \"AI Rank\" for AI-powered scoring."}
      </p>
      {aiError && (
        <div className="alert alert-danger py-2 small mb-3">{aiError}</div>
      )}

      <div className="d-flex flex-column gap-3">
        {visible.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p className="mb-1">No builders have signed up yet.</p>
            <p className="small">Share your listing so builders can create profiles and apply.</p>
          </div>
        ) : visible.map((candidate) => {
          const walletKey = candidate.wallet.toLowerCase();
          const alreadySent = sentIntros.has(candidate.wallet);
          const hasApplied = incomingWallets.has(walletKey);
          const intro = incomingIntroMap.get(walletKey);
          const currentStatus = applicationStatuses[walletKey] ?? intro?.status;
          const skillMatches = candidate.skills.filter((s) => team.desiredSkills.includes(s));

          return (
            <div
              key={candidate.wallet}
              className={`card ${hasApplied && currentStatus === "requested" ? "border-primary" : ""}`}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h6 className="mb-0">{candidate.name || <WalletName address={candidate.wallet} />}</h6>
                    {candidate.handle && <small className="text-muted">{candidate.handle}</small>}
                  </div>
                  <div className="d-flex gap-2 align-items-center flex-shrink-0">
                    {hasApplied && currentStatus && (
                      <span className={`badge bg-${{ requested: "warning", accepted: "success", declined: "danger", expired: "secondary" }[currentStatus]}`}>
                        {currentStatus === "requested" ? "Applied" : currentStatus}
                      </span>
                    )}
                    {(() => {
                      const ai = aiRankings[walletKey];
                      const loading = aiLoadingWallets.has(walletKey);
                      if (loading) {
                        return (
                          <span className="d-inline-flex align-items-center gap-1 text-muted" style={{ fontSize: "0.85rem" }}>
                            <span className="spinner-border spinner-border-sm" />
                            <span style={{ letterSpacing: 1, color: "#ced4da" }}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                          </span>
                        );
                      }
                      if (ai) return <StarRating stars={ai.stars} reasoning={ai.reasoning} />;
                      return (
                        <button
                          className="btn btn-outline-warning btn-sm py-0 px-1"
                          style={{ fontSize: "0.75rem", lineHeight: "1.4" }}
                          title="Evaluate with AI"
                          disabled={anyLoading}
                          onClick={() => rankOne(candidate)}
                        >
                          &#9733; Evaluate
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {intro?.message && (
                  <div className="alert alert-light py-2 small mb-2">&#128172; "{intro.message}"</div>
                )}

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
                  {skillMatches.map((s) => (
                    <span key={s} className="badge bg-primary">{s}</span>
                  ))}
                  {candidate.skills
                    .filter((s) => !skillMatches.includes(s))
                    .slice(0, 4)
                    .map((s) => (
                      <span key={s} className="badge bg-light text-dark border">{s}</span>
                    ))}
                </div>

                {hasApplied && currentStatus === "requested" && intro ? (
                  <div className="d-flex gap-2">
                    <button className="btn btn-success btn-sm" onClick={() => respondToApplication(intro, "accepted")}>Accept</button>
                    <button className="btn btn-outline-danger btn-sm" onClick={() => respondToApplication(intro, "declined")}>Decline</button>
                  </div>
                ) : hasApplied && currentStatus === "accepted" ? (
                  <div className="text-success small">&#10003; Accepted</div>
                ) : alreadySent ? (
                  <div className="text-success small">&#10003; Intro request sent</div>
                ) : (
                  <div>
                    <textarea
                      className="form-control form-control-sm mb-2"
                      rows={2}
                      placeholder="Optional intro message"
                      value={messageMap[candidate.wallet] ?? ""}
                      onChange={(e) =>
                        setMessageMap((prev) => ({ ...prev, [candidate.wallet]: e.target.value }))
                      }
                    />
                    <button className="btn btn-primary btn-sm" onClick={() => sendIntro(candidate)}>
                      Send Intro Request
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

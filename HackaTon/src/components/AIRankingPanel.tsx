import { useState } from "react";
import { rankCandidates, listChatbotServices } from "../0gai";
import { loadAllProfiles } from "../storage";
import type { RankedCandidate, ZGService } from "../0gai";
import type { TeamListing } from "../types";

interface Props {
  team: TeamListing;
}

type Status = "idle" | "discovering" | "ranking" | "done" | "error";

export function AIRankingPanel({ team }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [services, setServices] = useState<ZGService[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [results, setResults] = useState<RankedCandidate[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function discover() {
    setStatus("discovering");
    setErrorMsg("");
    try {
      const found = await listChatbotServices();
      setServices(found);
      if (found.length > 0) setSelectedProvider(found[0].providerAddress);
      setStatus("idle");
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }

  async function rank() {
    const profiles = loadAllProfiles();
    if (profiles.length === 0) {
      setErrorMsg("No builder profiles found in local storage.");
      setStatus("error");
      return;
    }
    setStatus("ranking");
    setErrorMsg("");
    try {
      const ranked = await rankCandidates(team, profiles, selectedProvider || undefined);
      setResults(ranked);
      setStatus("done");
    } catch (e) {
      setErrorMsg(String(e));
      setStatus("error");
    }
  }

  const isLoading = status === "discovering" || status === "ranking";

  return (
    <div>
      <h5 className="mb-1">AI Candidate Ranking</h5>
      <p className="text-muted small mb-3">
        Uses the 0G compute network to rank all registered builders by relevance to your project
        and provides reasoning for each.
      </p>

      {/* Provider selection */}
      <div className="card mb-3">
        <div className="card-body">
          <h6 className="card-title mb-2">1. Select AI Provider</h6>
          {services.length === 0 ? (
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-outline-secondary btn-sm" onClick={discover} disabled={isLoading}>
                {status === "discovering" ? (
                  <><span className="spinner-border spinner-border-sm me-1" />Discovering…</>
                ) : (
                  "Discover Chatbot Services"
                )}
              </button>
              <span className="text-muted small">or rank using the first available provider</span>
            </div>
          ) : (
            <div>
              <select
                className="form-select form-select-sm"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.providerAddress} value={s.providerAddress}>
                    {s.name || s.providerAddress} ({s.providerAddress.slice(0, 8)}…)
                  </option>
                ))}
              </select>
              <small className="text-muted">{services.length} chatbot service(s) found</small>
            </div>
          )}
        </div>
      </div>

      {/* Rank button */}
      <div className="card mb-3">
        <div className="card-body">
          <h6 className="card-title mb-2">2. Rank Candidates</h6>
          <p className="small text-muted mb-2">
            This will send builder profiles to the 0G AI network and return a relevance score
            and reasoning for each. A small fee will be deducted from your 0G account.
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={rank}
            disabled={isLoading}
          >
            {status === "ranking" ? (
              <><span className="spinner-border spinner-border-sm me-1" />Ranking…</>
            ) : (
              "Rank Candidates with AI"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="alert alert-danger small" role="alert">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {/* Results */}
      {status === "done" && results.length === 0 && (
        <p className="text-muted small">No candidates to rank.</p>
      )}

      {results.length > 0 && (
        <div>
          <h6 className="mb-2">Results — {results.length} candidate(s) ranked</h6>
          <div className="d-flex flex-column gap-3">
            {results.map((r, idx) => (
              <div key={r.profile.wallet} className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <div>
                      <span className="fw-semibold me-2">
                        #{idx + 1} {r.profile.name || r.profile.wallet.slice(0, 8) + "…"}
                      </span>
                      {r.profile.handle && (
                        <small className="text-muted">{r.profile.handle}</small>
                      )}
                    </div>
                    <ScoreBadge score={r.score} />
                  </div>

                  {/* Skills */}
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {r.profile.skills.slice(0, 6).map((skill) => (
                      <span key={skill} className="badge border text-secondary">{skill}</span>
                    ))}
                  </div>

                  {/* AI reasoning */}
                  <p className="small text-muted mb-0">
                    <span className="fw-semibold text-body">0G.AI reasoning: </span>
                    {r.reasoning}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "success" : score >= 40 ? "warning" : "danger";
  return (
    <span className={`badge bg-${color} fs-6`} style={{ minWidth: 52 }}>
      {score}/100
    </span>
  );
}

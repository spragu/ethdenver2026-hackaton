import { useState } from "react";
import type { TeamListing, BuilderProfile, IntroRequest } from "../types";
import { generateId, saveIntro, loadIntros } from "../storage";

interface Props {
  teams: TeamListing[];
  applicantProfile: BuilderProfile | null;
  applicantWallet: string;
  onApplied: () => void;
}

export function TeamBrowser({ teams, applicantProfile, applicantWallet, onApplied }: Props) {
  const [messageMap, setMessageMap] = useState<Record<string, string>>({});
  const [sentSet, setSentSet] = useState<Set<string>>(
    () =>
      new Set(
        loadIntros()
          .filter(
            (i) =>
              i.applicantWallet.toLowerCase() === applicantWallet.toLowerCase() &&
              i.initiatedBy === "applicant"
          )
          .map((i) => i.teamId)
      )
  );

  // Don't show teams owned by the applicant themselves
  const browseable = teams
    .filter((t) => t.ownerWallet.toLowerCase() !== applicantWallet.toLowerCase());

  function applyToTeam(team: TeamListing) {
    const intro: IntroRequest = {
      id: generateId(),
      teamId: team.id,
      teamName: team.projectName,
      applicantWallet,
      ownerWallet: team.ownerWallet,
      status: "requested",
      initiatedBy: "applicant",
      message: messageMap[team.id] ?? "",
      createdAt: Date.now(),
    };
    saveIntro(intro);
    setSentSet((prev) => new Set([...prev, team.id]));
    onApplied();
  }

  if (browseable.length === 0) {
    return (
      <p className="text-muted">
        No open team listings found. Check back later — or post your own!
      </p>
    );
  }

  return (
    <div>
      <p className="text-muted small mb-3">
        Browse open teams and apply. Matching skills are highlighted.
      </p>
      <div className="d-flex flex-column gap-3">
        {browseable.map((team) => {
          const applied = sentSet.has(team.id);
          const skillMatches = team.desiredSkills.filter((s) =>
            (applicantProfile?.skills ?? []).includes(s)
          );

          return (
            <div key={team.id} className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <h6 className="mb-0">{team.projectName}</h6>
                </div>

                {team.description && (
                  <p className="small text-muted mb-2">{team.description}</p>
                )}

                <div className="d-flex flex-wrap gap-1 mb-2">
                  {team.desiredSkills.map((s) => (
                    <span
                      key={s}
                      className={`badge ${skillMatches.includes(s) ? "bg-success" : "bg-light text-dark border"}`}
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {applicantProfile && (
                <div className="mb-2">
                  <span className="text-muted small">
                    Team size up to {team.maxTeamSize}
                  </span>
                </div>
                )}

                {applied ? (
                  <div className="text-success small">&#10003; Application sent</div>
                ) : (
                  <div>
                    <textarea
                      className="form-control form-control-sm mb-2"
                      rows={2}
                      placeholder="Optional message to the team owner…"
                      value={messageMap[team.id] ?? ""}
                      onChange={(e) =>
                        setMessageMap((prev) => ({ ...prev, [team.id]: e.target.value }))
                      }
                    />
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => applyToTeam(team)}
                    >
                      Apply to this team
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

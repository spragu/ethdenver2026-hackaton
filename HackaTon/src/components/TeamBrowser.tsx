import { useState } from "react";
import type { TeamListing, BuilderProfile, IntroRequest } from "../types";
import { generateId, saveIntro, loadIntros } from "../storage";

interface Props {
  teams: TeamListing[];
  applicantProfile: BuilderProfile | null;
  applicantWallet: string;
  onApplied: () => void;
}

const availabilityVariant: Record<string, string> = {
  "full-time": "success",
  "part-time": "warning",
  "weekends-only": "danger",
};

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

  // Score how well this team fits the applicant
  function scoreMatch(team: TeamListing): number {
    const roles = applicantProfile?.roles ?? [];
    const skills = applicantProfile?.skills ?? [];
    const roleMatch = roles.filter((r) => team.requiredRoles.includes(r)).length;
    const skillMatch = skills.filter((s) => team.desiredSkills.includes(s)).length;
    return roleMatch * 3 + skillMatch;
  }

  // Don't show teams owned by the applicant themselves
  const browseable = teams
    .filter((t) => t.ownerWallet.toLowerCase() !== applicantWallet.toLowerCase())
    .sort((a, b) => scoreMatch(b) - scoreMatch(a));

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
        Teams ranked by match to your roles and skills. Click "Apply" to send your profile
        directly to the team owner.
      </p>
      <div className="d-flex flex-column gap-3">
        {browseable.map((team) => {
          const score = scoreMatch(team);
          const applied = sentSet.has(team.id);
          const roleMatches = team.requiredRoles.filter((r) =>
            (applicantProfile?.roles ?? []).includes(r)
          );
          const skillMatches = team.desiredSkills.filter((s) =>
            (applicantProfile?.skills ?? []).includes(s)
          );

          return (
            <div key={team.id} className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <h6 className="mb-0">{team.projectName}</h6>
                  <div className="d-flex gap-2 flex-shrink-0">
                    {score > 0 && (
                      <span className="badge bg-primary">&#9733; {score} match</span>
                    )}
                  </div>
                </div>

                {team.description && (
                  <p className="small text-muted mb-2">{team.description}</p>
                )}

                {/* Roles needed */}
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {team.requiredRoles.map((r) => (
                    <span
                      key={r}
                      className={`badge ${roleMatches.includes(r) ? "bg-primary" : "bg-light text-dark border"}`}
                    >
                      {r}
                    </span>
                  ))}
                  {team.desiredSkills.map((s) => (
                    <span
                      key={s}
                      className={`badge ${skillMatches.includes(s) ? "bg-success" : "bg-light text-dark border"}`}
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* Applicant's matching availability */}
                {applicantProfile && (
                <div className="mb-2">
                  <span
                    className={`badge bg-${availabilityVariant[applicantProfile.availability] ?? "secondary"}`}
                  >
                    You: {applicantProfile.availability}
                  </span>
                  <span className="text-muted small ms-2">
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

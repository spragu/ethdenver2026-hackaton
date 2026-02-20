import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import type { TeamListing } from "../types";
import { saveTeam, deleteTeam, loadIntros, loadProfile } from "../storage";
import { TeamListingForm } from "../components/TeamListingForm";
import { CandidateList } from "../components/CandidateList";
import { EncryptedChat } from "../components/EncryptedChat";
import { WalletName } from "../components/WalletName";
import { AIRankingPanel } from "../components/AIRankingPanel";
import { ZGAccountPanel } from "../components/ZGAccountPanel";

type Tab = "listing" | "candidates" | "ai-rank" | "zg-account" | "messages";

interface Props {
  teams: TeamListing[];
  onTeamSaved: () => void;
  adminMode?: boolean;
}

export function TeamOwnerView({ teams, onTeamSaved, adminMode = false }: Props) {
  const { address } = useAccount();
  const [tab, setTab] = useState<Tab>(teams.length > 0 ? "candidates" : "listing");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    teams.length > 0 ? teams[0].id : null
  );
  const [_introRefresh, setIntroRefresh] = useState(0);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const refresh = useCallback(() => setIntroRefresh((n) => n + 1), []);
  const handleIntroSent = refresh;

  // If admin mode is turned off while on an admin-only tab, fall back to candidates/listing
  useEffect(() => {
    if (!adminMode && (tab === "ai-rank" || tab === "zg-account")) {
      setTab(selectedTeamId ? "candidates" : "listing");
    }
  }, [adminMode, tab, selectedTeamId]);

  const acceptedChats = loadIntros().filter(
    (i) => i.ownerWallet.toLowerCase() === address?.toLowerCase() && i.status === "accepted"
  );

  // Auto-poll localStorage every 5 s so new applicants appear without manual reload
  useEffect(() => {
    if (tab !== "candidates") return;
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [tab, refresh]);

  const myTeams = teams.filter(
    (t) => t.ownerWallet.toLowerCase() === address?.toLowerCase()
  );
  const selectedTeam = myTeams.find((t) => t.id === selectedTeamId) ?? myTeams[0] ?? null;

  function handleSave(team: TeamListing) {
    saveTeam(team);
    onTeamSaved();
    setSelectedTeamId(team.id);
    setTab("candidates");
  }

  function handleDelete(teamId: string) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    deleteTeam(teamId);
    onTeamSaved();
    const remaining = myTeams.filter((t) => t.id !== teamId);
    setSelectedTeamId(remaining[0]?.id ?? null);
    setTab(remaining.length > 0 ? "candidates" : "listing");
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Team Owner</h4>
        <div className="d-flex gap-2">
          {tab === "candidates" && (
            <button className="btn btn-outline-primary btn-sm" onClick={refresh}>
              &#8635; Refresh
            </button>
          )}
          <button className="btn btn-outline-secondary btn-sm" onClick={() => setTab("listing")}>
            + New Listing
          </button>
        </div>
      </div>

      {myTeams.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {myTeams.map((t) => (
            <div key={t.id} className="d-flex align-items-center gap-1">
              <button
                className={`btn btn-sm rounded-pill ${
                  selectedTeam?.id === t.id ? "btn-primary" : "btn-outline-secondary"
                }`}
                onClick={() => { setSelectedTeamId(t.id); setTab("candidates"); }}
              >
                {t.projectName}
              </button>
              <button
                className="btn btn-sm btn-outline-danger rounded-pill"
                title="Delete listing"
                onClick={() => handleDelete(t.id)}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "listing" ? "active" : ""}`}
            onClick={() => setTab("listing")}
          >
            {selectedTeam ? "Edit Listing" : "Post Listing"}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "candidates" ? "active" : ""} ${!selectedTeam ? "disabled" : ""}`}
            onClick={() => setTab("candidates")}
            disabled={!selectedTeam}
          >
            Browse Candidates
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "ai-rank" ? "active" : ""} ${!selectedTeam ? "disabled" : ""}`}
            onClick={() => setTab("ai-rank")}
            disabled={!selectedTeam}
            hidden={!adminMode}
          >
            &#x2728; AI Rank
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "zg-account" ? "active" : ""}`}
            onClick={() => setTab("zg-account")}
            hidden={!adminMode}
          >
            &#x1fa99; 0G Account
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "messages" ? "active" : ""}`}
            onClick={() => setTab("messages")}
          >
            Messages{" "}
            {acceptedChats.length > 0 && (
              <span className="badge bg-success ms-1">{acceptedChats.length}</span>
            )}
          </button>
        </li>
      </ul>

      {tab === "listing" && (
        <TeamListingForm ownerWallet={address!} initial={selectedTeam} onSave={handleSave} />
      )}

      {tab === "candidates" && selectedTeam && (
        <CandidateList
          key={selectedTeam.id}
          team={selectedTeam}
          ownerWallet={address!}
          onIntroSent={handleIntroSent}
        />
      )}

      {tab === "candidates" && !selectedTeam && (
        <p className="text-muted">Post a team listing first to browse candidates.</p>
      )}

      {tab === "ai-rank" && selectedTeam && (
        <AIRankingPanel key={selectedTeam.id} team={selectedTeam} />
      )}

      {tab === "ai-rank" && !selectedTeam && (
        <p className="text-muted">Post a team listing first to use AI ranking.</p>
      )}

      {tab === "zg-account" && <ZGAccountPanel />}

      {tab === "messages" && (
        <div>
          {acceptedChats.length === 0 ? (
            <p className="text-muted">No accepted connections yet. Accept an application in Browse Candidates to unlock chat.</p>
          ) : (
            <div className="row g-3">
              <div className="col-12 col-sm-4">
                <div className="list-group">
                  {acceptedChats.map((intro) => {
                    const other = loadProfile(intro.applicantWallet);
                    return (
                      <button
                        key={intro.id}
                        className={`list-group-item list-group-item-action ${selectedChatId === intro.id ? "active" : ""}`}
                        onClick={() => setSelectedChatId(intro.id)}
                      >
                        <div className="fw-semibold">{other?.name ?? <WalletName address={intro.applicantWallet} />}</div>
                        <small className={selectedChatId === intro.id ? "text-white-50" : "text-muted"}>{intro.teamName}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="col-12 col-sm-8">
                {selectedChatId ? (() => {
                  const intro = acceptedChats.find((i) => i.id === selectedChatId)!;
                  return (
                    <EncryptedChat
                      key={selectedChatId}
                      intro={intro}
                      myWallet={address!}
                      myProfile={null}
                      otherProfile={loadProfile(intro.applicantWallet)}
                    />
                  );
                })() : (
                  <p className="text-muted">Select a conversation on the left.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

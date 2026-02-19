import { useState, useCallback } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import type { BuilderProfile, TeamListing } from "./types";
import { loadProfile, loadTeams } from "./storage";
import { ApplicantView } from "./views/ApplicantView";
import { TeamOwnerView } from "./views/TeamOwnerView";
import { useWalletName } from "./ens";

type Mode = "applicant" | "team-owner";

function WalletBar() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const walletName = useWalletName(address);

  if (!isConnected) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-4 text-center">
        <h1 className="fw-bold mb-2">HackaTon</h1>
        <p className="text-muted" style={{ maxWidth: 420 }}>
          Hackathon team formation with verified on-chain credentials and AI-assisted matching.
        </p>
        <button
          className="btn btn-primary btn-lg mt-3"
          onClick={() => connect({ connector: connectors[0] })}
          disabled={isPending}
        >
          {isPending ? "Connecting" : "Connect Wallet"}
        </button>
        {error && <p className="text-danger mt-2 small">{error.message}</p>}
      </div>
    );
  }

  return (
    <nav className="navbar navbar-light bg-white border-bottom px-3">
      <span className="navbar-brand fw-bold mb-0">HackaTon</span>
      <div className="d-flex align-items-center gap-2">
        <span className="text-muted small d-none d-sm-inline">{chain?.name}</span>
        <code className="badge bg-secondary" title={address}>
          {walletName}
        </code>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    </nav>
  );
}

function ModeSelector({ mode, onSelect }: { mode: Mode | null; onSelect: (m: Mode) => void }) {
  const items: { key: Mode; title: string; desc: string }[] = [
    {
      key: "applicant",
      title: "Builder / Applicant",
      desc: "Share your skills, link on-chain credentials, and receive intro requests from teams.",
    },
    {
      key: "team-owner",
      title: "Team Owner",
      desc: "Post a project listing, set a finder fee, and find matched builders.",
    },
  ];

  return (
    <div className="row g-3 mb-4">
      {items.map(({ key, title, desc }) => (
        <div className="col-12 col-sm-6" key={key}>
          <div
            className={`card h-100 ${mode === key ? "border-primary" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(key)}
          >
            <div className="card-body">
              <h5 className={`card-title ${mode === key ? "text-primary" : ""}`}>{title}</h5>
              <p className="card-text text-muted">{desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<Mode | null>(null);
  const [profile, setProfile] = useState<BuilderProfile | null>(
    () => (address ? loadProfile(address) : null)
  );
  const [teams, setTeams] = useState<TeamListing[]>(() => loadTeams());

  const handleProfileSaved = useCallback((p: BuilderProfile) => setProfile(p), []);
  const handleTeamSaved = useCallback(() => setTeams(loadTeams()), []);

  return (
    <div className="min-vh-100 bg-light">
      <WalletBar />
      {isConnected && (
        <div className="container py-4" style={{ maxWidth: 800 }}>
          <ModeSelector mode={mode} onSelect={setMode} />
          {!mode && (
            <p className="text-center text-muted">Select a mode above to get started.</p>
          )}
          {mode === "applicant" && (
            <ApplicantView profile={profile} teams={teams} onProfileSaved={handleProfileSaved} />
          )}
          {mode === "team-owner" && (
            <TeamOwnerView teams={teams} onTeamSaved={handleTeamSaved} />
          )}
        </div>
      )}
    </div>
  );
}

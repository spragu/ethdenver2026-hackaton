import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import type { BuilderProfile, IntroRequest, TeamListing } from "../types";
import { saveProfile, loadIntros, loadProfile, deleteIntro } from "../storage";
import { BuilderProfileForm } from "../components/BuilderProfileForm";
import { IntroInbox } from "../components/IntroInbox";
import { NftCredentialCard } from "../components/NftCredentialCard";
import { TeamBrowser } from "../components/TeamBrowser";
import { EncryptedChat } from "../components/EncryptedChat";
import { WalletName } from "../components/WalletName";

type Tab = "profile" | "credentials" | "browse" | "applications" | "messages" | "inbox";

const STATUS_VARIANT: Record<IntroRequest["status"], string> = {
  requested: "warning",
  accepted: "success",
  declined: "danger",
  expired: "secondary",
};

interface Props {
  profile: BuilderProfile | null;
  teams: TeamListing[];
  onProfileSaved: (p: BuilderProfile) => void;
}

export function ApplicantView({ profile, teams, onProfileSaved }: Props) {
  const { address } = useAccount();
  const [tab, setTab] = useState<Tab>(profile ? "browse" : "profile");
  const [intros, setIntros] = useState<IntroRequest[]>(() => loadIntros());
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const acceptedChats = intros.filter(
    (i) =>
      (i.applicantWallet.toLowerCase() === address?.toLowerCase() ||
        i.ownerWallet.toLowerCase() === address?.toLowerCase()) &&
      i.status === "accepted"
  );

  const ownerInboundCount = intros.filter(
    (i) =>
      i.applicantWallet.toLowerCase() === address?.toLowerCase() &&
      i.initiatedBy !== "applicant" &&
      i.status === "requested"
  ).length;

  const myApplications = intros.filter(
    (i) =>
      i.applicantWallet.toLowerCase() === address?.toLowerCase() &&
      i.initiatedBy === "applicant"
  );

  function handleSave(p: BuilderProfile) {
    saveProfile(p);
    onProfileSaved(p);
    setTab("browse");
  }

  const refreshIntros = useCallback(() => setIntros(loadIntros()), []);

  function revokeApplication(introId: string) {
    if (!confirm("Revoke this application?")) return;
    deleteIntro(introId);
    refreshIntros();
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Builder Dashboard</h4>
        {profile && (
          <span className="text-muted small">
            {profile.name} &middot; {profile.roles.join(", ")}
          </span>
        )}
      </div>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            {profile ? "Edit Profile" : "Create Profile"}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "credentials" ? "active" : ""}`}
            onClick={() => setTab("credentials")}
          >
            Credentials
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "browse" ? "active" : ""}`}
            onClick={() => setTab("browse")}
          >
            Browse Teams
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "applications" ? "active" : ""}`}
            onClick={() => setTab("applications")}
          >
            My Applications{" "}
            {myApplications.length > 0 && (
              <span className="badge bg-secondary ms-1">{myApplications.length}</span>
            )}
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
        <li className="nav-item">
          <button
            className={`nav-link ${tab === "inbox" ? "active" : ""}`}
            onClick={() => setTab("inbox")}
          >
            Team Outreach{" "}
            {ownerInboundCount > 0 && (
              <span className="badge bg-primary ms-1">{ownerInboundCount}</span>
            )}
          </button>
        </li>
      </ul>

      {tab === "profile" && (
        <BuilderProfileForm wallet={address!} initial={profile} onSave={handleSave} />
      )}

      {tab === "credentials" && (
        <div>
          {profile?.linkedNfts && profile.linkedNfts.length > 0 ? (
            <div>
              <h5>NFT Credentials</h5>
              <p className="text-muted small">
                Hackathon wins and participation NFTs linked to your profile.
              </p>
              <div className="d-flex flex-column gap-3">
                {profile.linkedNfts.map((url) => (
                  <NftCredentialCard key={url} openseaUrl={url} ownerWallet={address} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted">
              No NFT credentials linked yet. Add your OpenSea hackathon NFTs in your profile.
            </p>
          )}
        </div>
      )}

      {tab === "browse" && (
        <TeamBrowser
          teams={teams}
          applicantProfile={profile}
          applicantWallet={address!}
          onApplied={refreshIntros}
        />
      )}

      {tab === "applications" && (
        <div>
          <h5 className="mb-3">My Applications</h5>
          {myApplications.length === 0 ? (
            <p className="text-muted">You haven't applied to any teams yet. Browse teams and hit Apply!</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {myApplications.map((intro) => (
                <div key={intro.id} className="card">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-0">{intro.teamName}</h6>
                        <small className="text-muted">
                          Applied {new Date(intro.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge bg-${STATUS_VARIANT[intro.status]}`}>
                          {intro.status}
                        </span>
                        {intro.status === "requested" && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => revokeApplication(intro.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                    {intro.message && (
                      <p className="small text-muted mt-2 mb-0">&#128172; "{intro.message}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "messages" && (
        <div>
          {acceptedChats.length === 0 ? (
            <p className="text-muted">No accepted connections yet. Once a team accepts your application (or you accept their outreach), a chat will appear here.</p>
          ) : (
            <div className="row g-3">
              <div className="col-12 col-sm-4">
                <div className="list-group">
                  {acceptedChats.map((intro) => {
                    const otherWallet = intro.applicantWallet.toLowerCase() === address?.toLowerCase()
                      ? intro.ownerWallet : intro.applicantWallet;
                    const other = loadProfile(otherWallet);
                    return (
                      <button
                        key={intro.id}
                        className={`list-group-item list-group-item-action ${selectedChatId === intro.id ? "active" : ""}`}
                        onClick={() => setSelectedChatId(intro.id)}
                      >
                        <div className="fw-semibold">{other?.name ?? <WalletName address={otherWallet} />}</div>
                        <small className={selectedChatId === intro.id ? "text-white-50" : "text-muted"}>{intro.teamName}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="col-12 col-sm-8">
                {selectedChatId ? (() => {
                  const intro = acceptedChats.find((i) => i.id === selectedChatId)!;
                  const otherWallet = intro.applicantWallet.toLowerCase() === address?.toLowerCase()
                    ? intro.ownerWallet : intro.applicantWallet;
                  return (
                    <EncryptedChat
                      key={selectedChatId}
                      intro={intro}
                      myWallet={address!}
                      myProfile={profile}
                      otherProfile={loadProfile(otherWallet)}
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

      {tab === "inbox" && (
        <div>
          <h5 className="mb-3">Team Outreach</h5>
          <p className="text-muted small mb-3">Intro requests initiated by team owners.</p>
          <IntroInbox
            intros={intros.filter(
              (i) => i.initiatedBy !== "applicant"
            )}
            applicantWallet={address!}
            onUpdate={refreshIntros}
          />
        </div>
      )}
    </div>
  );
}

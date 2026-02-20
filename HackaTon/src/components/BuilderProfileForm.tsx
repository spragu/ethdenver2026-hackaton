import { useState } from "react";
import type { BuilderProfile } from "../types";
import { COMMON_SKILLS } from "../types";
import { parseOpenseaUrl } from "../nft";

interface Props {
  wallet: string;
  initial?: BuilderProfile | null;
  onSave: (profile: BuilderProfile) => void;
}

export function BuilderProfileForm({ wallet, initial, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [handle, setHandle] = useState(initial?.handle ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(initial?.skills ?? []);
  const [github, setGithub] = useState(initial?.links?.github ?? "");
  const [twitter, setTwitter] = useState(initial?.links?.twitter ?? "");
  const [website, setWebsite] = useState(initial?.links?.website ?? "");
  const [linkedNfts, setLinkedNfts] = useState<string[]>(initial?.linkedNfts ?? []);
  const [nftInput, setNftInput] = useState("");
  const [nftInputError, setNftInputError] = useState<string | null>(null);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function addNft() {
    const url = nftInput.trim();
    if (!url) return;
    const parsed = parseOpenseaUrl(url);
    if (!parsed) {
      setNftInputError(
        "Not a valid OpenSea item URL. Expected: https://opensea.io/item/{chain}/{contract}/{tokenId}"
      );
      return;
    }
    if (linkedNfts.includes(url)) {
      setNftInputError("Already added.");
      return;
    }
    setLinkedNfts((prev) => [...prev, url]);
    setNftInput("");
    setNftInputError(null);
  }

  function removeNft(url: string) {
    setLinkedNfts((prev) => prev.filter((u) => u !== url));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const now = Date.now();
    const profile: BuilderProfile = {
      wallet,
      name: name.trim(),
      handle: handle.trim(),
      bio: bio.trim(),
      skills: selectedSkills,
      links: {
        github: github.trim() || undefined,
        twitter: twitter.trim() || undefined,
        website: website.trim() || undefined,
      },
      linkedNfts,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(profile);
  }

  const chipBtn = (active: boolean) =>
    `btn btn-sm rounded-pill me-1 mb-1 ${active ? "btn-primary" : "btn-outline-secondary"}`;

  return (
    <form onSubmit={handleSubmit}>
      <h5 className="mb-4">{initial ? "Edit Profile" : "Create Builder Profile"}</h5>

      <div className="mb-3">
        <label className="form-label fw-semibold">Display Name *</label>
        <input
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex Builder"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Handle</label>
        <input
          className="form-control"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="e.g. @alexbuilder"
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Bio</label>
        <textarea
          className="form-control"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="What do you build? What are you excited about?"
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Skills</label>
        <div className="mb-2">
          {COMMON_SKILLS.map((skill) => (
            <button
              key={skill}
              type="button"
              className={chipBtn(selectedSkills.includes(skill))}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Links</label>
        <input
          className="form-control mb-2"
          value={github}
          onChange={(e) => setGithub(e.target.value)}
          placeholder="GitHub URL"
        />
        <input
          className="form-control mb-2"
          value={twitter}
          onChange={(e) => setTwitter(e.target.value)}
          placeholder="Twitter/X URL"
        />
        <input
          className="form-control"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="Website / Portfolio URL"
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold">NFT Credentials (OpenSea)</label>
        <p className="text-muted small mb-2">
          Link OpenSea NFTs to prove hackathon wins or participation.
        </p>
        {linkedNfts.map((url) => (
          <div
            key={url}
            className="d-flex align-items-center gap-2 bg-light rounded px-3 py-2 mb-2"
          >
            <span className="small text-muted text-truncate flex-grow-1">{url}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger py-0 px-2"
              onClick={() => removeNft(url)}
            >
              
            </button>
          </div>
        ))}
        <div className="input-group">
          <input
            className="form-control"
            value={nftInput}
            onChange={(e) => {
              setNftInput(e.target.value);
              setNftInputError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNft())}
            placeholder="https://opensea.io/item/arbitrum/0x.../186"
          />
          <button type="button" className="btn btn-outline-secondary" onClick={addNft}>
            Add
          </button>
        </div>
        {nftInputError && (
          <div className="text-danger small mt-1">{nftInputError}</div>
        )}
      </div>

      <button type="submit" className="btn btn-primary">
        {initial ? "Save Changes" : "Create Profile"}
      </button>
    </form>
  );
}

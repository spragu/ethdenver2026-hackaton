import { useState } from "react";
import type { TeamListing } from "../types";
import { COMMON_SKILLS } from "../types";
import { generateId } from "../storage";

interface Props {
  ownerWallet: string;
  initial?: TeamListing | null;
  onSave: (team: TeamListing) => void;
}

export function TeamListingForm({ ownerWallet, initial, onSave }: Props) {
  const [projectName, setProjectName] = useState(initial?.projectName ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [desiredSkills, setDesiredSkills] = useState<string[]>(initial?.desiredSkills ?? []);
  const [customSkill, setCustomSkill] = useState("");
  const [maxTeamSize, setMaxTeamSize] = useState(initial?.maxTeamSize ?? 4);

  function toggleSkill(skill: string) {
    setDesiredSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function addCustomSkill() {
    const trimmed = customSkill.trim();
    if (trimmed && !desiredSkills.includes(trimmed)) {
      setDesiredSkills((prev) => [...prev, trimmed]);
    }
    setCustomSkill("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) return;
    const team: TeamListing = {
      id: initial?.id ?? generateId(),
      ownerWallet,
      projectName: projectName.trim(),
      description: description.trim(),
      desiredSkills,
      maxTeamSize,
      createdAt: initial?.createdAt ?? Date.now(),
    };
    onSave(team);
  }

  const chipBtn = (active: boolean) =>
    `btn btn-sm rounded-pill me-1 mb-1 ${active ? "btn-primary" : "btn-outline-secondary"}`;

  return (
    <form onSubmit={handleSubmit}>
      <h5 className="mb-4">{initial ? "Edit Team Listing" : "Post a Team Listing"}</h5>

      <div className="mb-3">
        <label className="form-label fw-semibold">Project Name *</label>
        <input
          className="form-control"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="e.g. ZK Reputation Protocol"
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Project Description</label>
        <textarea
          className="form-control"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you building? What problem does it solve?"
        />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Desired Skills</label>
        <div className="mb-2">
          {COMMON_SKILLS.map((skill) => (
            <button
              key={skill}
              type="button"
              className={chipBtn(desiredSkills.includes(skill))}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </button>
          ))}
          {desiredSkills
            .filter((s) => !COMMON_SKILLS.includes(s))
            .map((skill) => (
              <button
                key={skill}
                type="button"
                className="btn btn-sm rounded-pill me-1 mb-1 btn-primary"
                onClick={() => toggleSkill(skill)}
              >
                {skill} 
              </button>
            ))}
        </div>
        <div className="input-group">
          <input
            className="form-control"
            value={customSkill}
            onChange={(e) => setCustomSkill(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addCustomSkill())
            }
            placeholder="Add custom skill"
          />
          <button type="button" className="btn btn-outline-secondary" onClick={addCustomSkill}>
            Add
          </button>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12">
          <label className="form-label fw-semibold">Max Team Size</label>
          <input
            className="form-control"
            type="number"
            min="2"
            max="10"
            value={maxTeamSize}
            onChange={(e) => setMaxTeamSize(Number(e.target.value))}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-primary">
        {initial ? "Save Changes" : "Post Listing"}
      </button>
    </form>
  );
}

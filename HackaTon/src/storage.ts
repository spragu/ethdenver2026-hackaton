import type { BuilderProfile, TeamListing, IntroRequest, ChatMessage } from "./types";

const STORAGE_NAMESPACE = "hackaton:";
const PROFILE_PREFIX = "hackaton:profile:";
const TEAMS_KEY = "hackaton:teams";
const INTROS_KEY = "hackaton:intros";
const CHAT_PREFIX = "hackaton:chat:";
const ENC_PUBKEY_PREFIX = "hackaton:encpubkey:";
const AIRANK_PREFIX = "hackaton:airank:";

// --- Clear all app data ---

export function clearAllData(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_NAMESPACE)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// --- Profiles ---

export function loadProfile(wallet: string): BuilderProfile | null {
  const raw = localStorage.getItem(PROFILE_PREFIX + wallet.toLowerCase());
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveProfile(profile: BuilderProfile): void {
  localStorage.setItem(
    PROFILE_PREFIX + profile.wallet.toLowerCase(),
    JSON.stringify(profile)
  );
}

export function loadAllProfiles(): BuilderProfile[] {
  const profiles: BuilderProfile[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PROFILE_PREFIX)) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          profiles.push(JSON.parse(raw));
        } catch {
          // skip corrupted entries
        }
      }
    }
  }
  return profiles.sort((a, b) => b.updatedAt - a.updatedAt);
}

// --- Team Listings ---

export function loadTeams(): TeamListing[] {
  const raw = localStorage.getItem(TEAMS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveTeam(team: TeamListing): void {
  const teams = loadTeams();
  const idx = teams.findIndex((t) => t.id === team.id);
  if (idx >= 0) {
    teams[idx] = team;
  } else {
    teams.push(team);
  }
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
}

// --- Intro Requests ---

export function loadIntros(): IntroRequest[] {
  const raw = localStorage.getItem(INTROS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveIntro(intro: IntroRequest): void {
  const intros = loadIntros();
  const idx = intros.findIndex((i) => i.id === intro.id);
  if (idx >= 0) {
    intros[idx] = intro;
  } else {
    intros.push(intro);
  }
  localStorage.setItem(INTROS_KEY, JSON.stringify(intros));
}

export function deleteTeam(teamId: string): void {
  const teams = loadTeams().filter((t) => t.id !== teamId);
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
}

export function deleteIntro(introId: string): void {
  const intros = loadIntros().filter((i) => i.id !== introId);
  localStorage.setItem(INTROS_KEY, JSON.stringify(intros));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- Encrypted Chat ---

export function loadChatMessages(introId: string): ChatMessage[] {
  const raw = localStorage.getItem(CHAT_PREFIX + introId);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveChatMessage(msg: ChatMessage): void {
  const msgs = loadChatMessages(msg.introId);
  msgs.push(msg);
  localStorage.setItem(CHAT_PREFIX + msg.introId, JSON.stringify(msgs));
}

// --- Encryption Public Keys (wallet-agnostic, works for owners without builder profiles) ---

export function saveEncryptionPubKey(wallet: string, pubKeyB64: string): void {
  localStorage.setItem(ENC_PUBKEY_PREFIX + wallet.toLowerCase(), pubKeyB64);
}

export function loadEncryptionPubKey(wallet: string): string | null {
  return localStorage.getItem(ENC_PUBKEY_PREFIX + wallet.toLowerCase());
}

// --- AI Ranking Cache ---

export interface CachedAIRank {
  stars: number;
  reasoning: string;
  score: number;
  cachedAt: number;
}

function aiRankKey(teamId: string, wallet: string): string {
  return AIRANK_PREFIX + teamId + ":" + wallet.toLowerCase();
}

export function loadAIRank(teamId: string, wallet: string): CachedAIRank | null {
  const raw = localStorage.getItem(aiRankKey(teamId, wallet));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAIRank(teamId: string, wallet: string, rank: CachedAIRank): void {
  localStorage.setItem(aiRankKey(teamId, wallet), JSON.stringify(rank));
}

export function loadAllAIRanks(teamId: string): Record<string, CachedAIRank> {
  const ranks: Record<string, CachedAIRank> = {};
  const prefix = AIRANK_PREFIX + teamId + ":";
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      const wallet = key.slice(prefix.length);
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          ranks[wallet] = JSON.parse(raw);
        } catch {
          // skip corrupted entries
        }
      }
    }
  }
  return ranks;
}

export function clearAIRanks(teamId: string): void {
  const prefix = AIRANK_PREFIX + teamId + ":";
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

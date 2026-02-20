import { JsonRpcProvider, Wallet, formatEther } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import type { BuilderProfile, TeamListing } from "./types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ZGService {
  providerAddress: string;
  serviceType: string;
  url: string;
  model: string;
  name: string; // derived from model or url
  inputPrice: bigint;
  outputPrice: bigint;
  verifiability: string;
}

export interface RankedCandidate {
  profile: BuilderProfile;
  /** Relevance score 0–100 */
  score: number;
  reasoning: string;
}

// ─── Broker singleton ────────────────────────────────────────────────────────

let _brokerPromise: ReturnType<typeof createZGComputeNetworkBroker> | null = null;

function createWallet(): Wallet {
  const privateKey = import.meta.env.VITE_ZG_PRIVATE_KEY as string | undefined;
  if (!privateKey) {
    throw new Error(
      "VITE_ZG_PRIVATE_KEY is not set. Add it to your .env.local file."
    );
  }
  const rpcUrl =
    (import.meta.env.VITE_ZG_RPC_URL as string | undefined) ??
    (import.meta.env.PROD
      ? "https://evmrpc.0g.ai"        // Mainnet
      : "https://evmrpc-testnet.0g.ai"); // Testnet
  const provider = new JsonRpcProvider(rpcUrl);
  return new Wallet(privateKey, provider);
}

/** Returns a cached broker instance, creating one if needed. */
export async function getBroker() {
  if (!_brokerPromise) {
    _brokerPromise = createZGComputeNetworkBroker(createWallet());
  }
  return _brokerPromise;
}

/** Reset the broker (e.g. after changing env config). */
export function resetBroker() {
  _brokerPromise = null;
}

// ─── Service discovery ───────────────────────────────────────────────────────

export async function listServices(): Promise<ZGService[]> {
  const broker = await getBroker();
  const raw = await broker.inference.listService();
  return raw.map((s) => ({
    providerAddress: s.provider,
    serviceType: s.serviceType,
    url: s.url,
    model: s.model,
    name: s.model || s.url,
    inputPrice: s.inputPrice,
    outputPrice: s.outputPrice,
    verifiability: s.verifiability,
  }));
}

export async function listChatbotServices(): Promise<ZGService[]> {
  const all = await listServices();
  return all.filter((s) => s.serviceType === "chatbot");
}

// ─── Account management ──────────────────────────────────────────────────────

export interface ZGAccount {
  totalBalance: string;   // formatted 0G
  availableBalance: string;
}

export interface ZGSubAccount {
  balance: string; // formatted 0G
}

export async function getAccount(): Promise<ZGAccount> {
  const broker = await getBroker();
  const raw = await broker.ledger.getLedger();
  return {
    totalBalance: formatEther(raw.totalBalance),
    availableBalance: formatEther(raw.availableBalance),
  };
}

export async function depositFund(amount: number) {
  const broker = await getBroker();
  return broker.ledger.depositFund(amount);
}

/** Transfer 0G from your ledger into a provider sub-account. */
export async function transferFund(
  providerAddress: string,
  serviceType: "inference" | "fine-tuning",
  amountEther: number
) {
  const broker = await getBroker();
  const { parseEther } = await import("ethers");
  return broker.ledger.transferFund(providerAddress, serviceType, parseEther(String(amountEther)));
}

/** Get sub-account balance for a given inference provider. */
export async function getInferenceSubAccount(providerAddress: string): Promise<ZGSubAccount> {
  const broker = await getBroker();
  const [subAccount] = await broker.inference.getAccountWithDetail(providerAddress);
  return { balance: formatEther(subAccount.balance) };
}

/** Request a refund of unused funds from a service type back to your ledger. */
export async function retrieveFund(serviceType: "inference" | "fine-tuning") {
  const broker = await getBroker();
  return broker.ledger.retrieveFund(serviceType);
}

/** Withdraw 0G from your ledger back to your wallet. */
export async function refund(amount: number) {
  const broker = await getBroker();
  return broker.ledger.refund(amount);
}

export async function acknowledgeProvider(providerAddress: string) {
  const broker = await getBroker();
  try {
    await broker.inference.acknowledgeProviderSigner(providerAddress);
  } catch (e: unknown) {
    // Ignore if already acknowledged or if the contract reverts with no data —
    // both mean we can proceed with inference.
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("already") && !msg.includes("missing revert data")) throw e;
  }
}

// ─── Low-level inference ─────────────────────────────────────────────────────

async function chatCompletion(
  providerAddress: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const broker = await getBroker();

  // Verify a 0G ledger account exists before making inference calls
  let ledger;
  try {
    ledger = await broker.ledger.getLedger();
  } catch {
    throw new Error(
      "No 0G account found. Please deposit funds into your 0G ledger account first."
    );
  }
  if (!ledger) {
    throw new Error(
      "No 0G account found. Please deposit funds into your 0G ledger account first."
    );
  }

  let endpoint: string;
  let model: string;
  try {
    ({ endpoint, model } = await broker.inference.getServiceMetadata(providerAddress));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to fetch service metadata: ${msg}`);
  }

  let headers: Awaited<ReturnType<typeof broker.inference.getRequestHeaders>>;
  try {
    headers = await broker.inference.getRequestHeaders(providerAddress);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to generate request headers: ${msg}`);
  }

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(headers as unknown as Record<string, string>) },
    body: JSON.stringify({ messages, model }),
  });

  if (!response.ok) {
    throw new Error(`Inference request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Resolve chatID: prefer ZG-Res-Key header, fall back to response body
  const chatID: string | undefined =
    response.headers.get("ZG-Res-Key") ??
    response.headers.get("zg-res-key") ??
    data.id ??
    data.chatID ??
    undefined;

  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`Unexpected inference response shape: ${JSON.stringify(data).slice(0, 200)}`);
  }

  // Process response: handles fee management (and TEE verification when chatID present).
  // Non-fatal — a failure here just means fees aren't settled yet so we log and continue.
  try {
    await broker.inference.processResponse(
      providerAddress,
      chatID,
      data.usage ? JSON.stringify(data.usage) : undefined
    );
  } catch (e) {
    console.warn("[0gai] processResponse failed (non-fatal):", e);
  }

  return content;
}

// ─── Ranking ─────────────────────────────────────────────────────────────────

/**
 * Rank builder profiles against a hackathon project listing using a 0G AI chatbot service.
 *
 * @param team            The team listing to match against.
 * @param profiles        Builder profiles to evaluate.
 * @param providerAddress Optional specific provider; auto-selects first chatbot if omitted.
 */
export async function rankCandidates(
  team: TeamListing,
  profiles: BuilderProfile[],
  providerAddress?: string
): Promise<RankedCandidate[]> {
  // Discover provider if not supplied
  let provider = providerAddress;
  if (!provider) {
    const services = await listChatbotServices();
    if (services.length === 0) throw new Error("No chatbot services available on the 0G network.");
    provider = services[0].providerAddress;
  }

  // Required before first use of a provider
  await acknowledgeProvider(provider);

  const teamContext = [
    `Project: ${team.projectName}`,
    `Description: ${team.description}`,
    `Required roles: ${team.requiredRoles.join(", ")}`,
    `Desired skills: ${team.desiredSkills.join(", ")}`,
    `Max team size: ${team.maxTeamSize}`,
  ].join("\n");

  const candidatesContext = profiles
    .map(
      (p, i) =>
        `Candidate ${i + 1}\n` +
        `  Name: ${p.name}\n` +
        `  Bio: ${p.bio}\n` +
        `  Roles: ${p.roles.join(", ")}\n` +
        `  Skills: ${p.skills.join(", ")}\n` +
        `  Availability: ${p.availability}`
    )
    .join("\n\n");

  const systemPrompt =
    "You are an expert hackathon team formation assistant. " +
    "Evaluate builder profiles for relevance to the described hackathon project. " +
    "Respond ONLY with valid JSON — no markdown, no extra text.";

  const userPrompt =
    `Given this hackathon project:\n${teamContext}\n\n` +
    `Evaluate the following ${profiles.length} candidate(s) for fit. ` +
    `Return a JSON array with one entry per candidate, IN THE SAME ORDER as listed, using their 1-based index:\n\n` +
    `[\n  { "index": 1, "score": <0-100>, "reasoning": "<1-2 sentences>" },\n  ...\n]\n\n` +
    `Candidates:\n${candidatesContext}`;

  const raw = await chatCompletion(provider, [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  // Strip accidental markdown fences before parsing
  const json = raw.replace(/```(?:json)?\n?/g, "").trim();
  console.log("[0gai] raw AI response:", raw);
  let parsed: { index: number; score: number; reasoning: string }[];
  try {
    const value = JSON.parse(json);
    // Some models wrap the array: {"results":[...]} or {"rankings":[...]}
    const arr: unknown[] = Array.isArray(value)
      ? value
      : Array.isArray(value?.results) ? value.results
      : Array.isArray(value?.rankings) ? value.rankings
      : Array.isArray(value?.candidates) ? value.candidates
      : [value]; // single object — wrap it
    parsed = (arr as Record<string, unknown>[]).map((r) => ({
      index: Number(r.index ?? r.candidate ?? r.id ?? 1),
      score: Number(r.score ?? 0),
      reasoning: String(r.reasoning ?? r.reason ?? ""),
    }));
  } catch {
    throw new Error(`AI returned non-JSON response: ${raw.slice(0, 300)}`);
  }
  console.log("[0gai] parsed rankings:", parsed);

  return parsed
    .map((r) => {
      const profile = profiles[r.index - 1]; // convert 1-based index → array slot
      if (!profile) return null;
      return {
        profile,
        score: Math.min(100, Math.max(0, Math.round(r.score))),
        reasoning: r.reasoning,
      };
    })
    .filter((r): r is RankedCandidate => r !== null);
}

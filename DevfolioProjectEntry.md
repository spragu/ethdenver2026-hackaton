## The problem it solves

At large hackathons like ETHDenver, finding the right teammates is chaotic. Discord channels overflow, people spam "LFT" posts with no structure, and there's no way to verify someone's track record before committing to build together. Teams waste precious hacking hours on mismatched talent instead of shipping.

**HackaTon solves this by combining:**

- **Structured matching** — Team owners post listings with specific role/skill requirements. Builders create profiles with skills, availability, and role preferences. The app scores and ranks matches automatically.
- **Verified on-chain credentials** — Builders link NFT credentials (e.g., Devfolio winner badges, EAS attestations) and the app verifies actual ownership on-chain via `ownerOf()` calls. No more fake résumés — your hackathon wins are provable.
- **End-to-end encrypted intros** — Contact details are never public. When a team wants to reach a builder (or vice versa), they send an intro request. Private information only unlocks after the other party accepts, protecting builders from spam.
- **AI-powered candidate ranking** — Team owners can use decentralized AI (via the 0G compute network) to rank all registered builders by relevance to their project, complete with reasoning for each recommendation.
- **On-chain consent records** — Accepted intros are recorded on the HackaTonRegistry contract on Arbitrum, creating a verifiable, tamper-proof history of matches without exposing private data.

----

## Challenges I ran into

**EAS SDK CSP conflicts** — The Ethereum Attestation Service SDK uses `eval()` internally, which caused Content Security Policy violations in the Vite dev server. After debugging the bundler chain, we removed the EAS SDK and switched to reading attestation data directly from EASScan/on-chain calls, which also reduced bundle size.

**IPFS gateway reliability** — NFT metadata frequently references IPFS URIs, but no single gateway is reliable. We hit timeouts, 502s, and rate-limits. We built a multi-gateway fallback system that tries Pinata → nft.storage → Cloudflare → ipfs.io with 8-second timeouts per gateway, and discovered a double-prefix bug where `ipfs://` URIs were getting the gateway prefix applied twice.

**Deterministic encryption key derivation** — We needed each user to have a stable NaCl encryption keypair tied to their wallet, without storing private keys anywhere. The solution: sign a fixed deterministic message → SHA-256 hash the signature → use the hash as a NaCl box seed. This gives each wallet a reproducible keypair with zero storage and no gas cost, but getting the signing UX right across different wallet providers took iteration.

**0G Serving Broker integration** — The 0G compute network SDK required careful sequencing: create a ledger account, deposit funds, acknowledge the provider's signer, then make inference calls with signed request headers. Error messages from the on-chain contracts were often cryptic (`missing revert data`), so we added defensive error handling and clear UI states for each step of the flow.

**Multi-chain NFT verification** — Verifying NFT ownership across Arbitrum, Base, Optimism, Mainnet, and Polygon from a single app required setting up separate viem public clients per chain and mapping OpenSea's chain slugs to the right chain configs.

----

## Use of AI tools and agents

HackaTon uses a **decentralized AI agent** powered by the **0G compute network** for intelligent candidate-to-team matching:

1. **0G Serving Broker** — The app connects to the 0G decentralized AI marketplace via the `@0glabs/0g-serving-broker` SDK. It discovers available chatbot services on the network, manages a ledger account (deposit/transfer/withdraw 0G tokens), and routes inference requests to providers with cryptographic request signing.

2. **Agentic Ranking** — When a team owner clicks "AI Rank Candidates," the system:
   - Discovers available chatbot services on the 0G network
   - Acknowledges the chosen provider's signer on-chain
   - Constructs a structured prompt containing the team's project description, required skills, and all registered builder profiles
   - Sends the prompt to the 0G AI provider via an OpenAI-compatible chat completions API
   - Parses the JSON response into scored, ranked candidates with per-candidate reasoning
   - Displays results with match scores (0–100) and explanations like "Strong fit — has Solidity and React experience matching both required skills"

3. **How it fits the system** — AI ranking complements the deterministic role/skill matching score already computed locally. The AI layer adds nuance: it can weigh bio descriptions, infer transferable skills, and explain *why* a candidate is a good fit — things a simple tag-intersection score can't do. All inference runs through the decentralized 0G network rather than a centralized API, keeping the system aligned with Web3 principles.

4. **0G Account Management UI** — A dedicated panel lets users manage their 0G ledger: check balances, deposit funds, transfer to inference providers, retrieve unused funds, and withdraw — all from within the app.
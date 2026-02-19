HackaTon (ETHDenver) — Team Formation + Verified Credentials + Escrowed Intros

---

## Running locally

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and replace the placeholder with your [OpenSea API key](https://docs.opensea.io/reference/api-keys):

```
VITE_OPENSEA_API_KEY=your_opensea_api_key_here
```

An API key is required for NFT credential cards to load (used to fetch metadata via the OpenSea REST API).

### 3. Start the dev server

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Connect a wallet

Install [MetaMask](https://metamask.io/) and connect to the **Arbitrum One** network. The app reads NFT credentials on Arbitrum.

---

HackaTon is a hackathon team formation marketplace designed for ETHDenver-style events. It helps team owners recruit the right builders quickly by combining:

Structured team requirements (roles, skills, availability)

Verified on-chain credentials (EAS/Devfolio attestations)

Incentive alignment via escrow (a deposit/finder fee that only pays out when an intro is accepted)

AI-assisted matching (ranked recommendations + explanations)

Core idea

Team owners who are serious about recruiting post a team listing and lock a finder fee (bounty) in a smart contract escrow.

Applicants create a builder profile with skills/roles/availability and optionally link on-chain credentials (e.g., Devfolio/EAS attestations showing past wins).

The app uses “agentic AI matching” to recommend applicants to teams (and teams to applicants).

When a team wants to contact an applicant, they send an intro request.

The applicant can accept or decline. Payment is only collected/released when the applicant accepts.

Contact details are never stored publicly on-chain; they are exchanged off-chain after acceptance.

Why Web3 / On-chain components exist

HackaTon uses on-chain primitives only where trust and portability matter:

Escrow / Payments: ensures teams are serious, prevents spam, and enables fair refunds on decline/expiry.

Credentials / Reputation: verified attestations (EAS/Devfolio) provide portable proof of hackathon wins/participation.

Consent tracking: intro request + accept/decline status is recorded without revealing private data.

Everything personal (resume/contact info) remains off-chain.

Data storage model
On-chain (public, minimal)

Team listings (or listing IDs)

Escrowed bounty / finder fee

Intro request state machine: requested → accepted/declined/expired

Credential attestations are read from EAS (e.g., Arbitrum EASScan)

Off-chain (private + editable)

Applicant profile: name/handle, skills, role preferences, availability, links

Private profile: resume + contact methods (email/discord/telegram) gated behind intro acceptance

Optional: cached/normalized credential display fields for faster UI

Firebase (Firestore + Storage) is suitable for hackathon speed.

MVP user flows (what we’re building)
1) Applicant flow

Connect wallet

Create a builder profile (skills, roles, availability)

App reads EAS attestations for the wallet and displays “Verified Credentials”

Receive intro requests from teams

Accept/decline intro; if accepted, contact exchange unlocks

2) Team owner flow

Connect wallet

Create team listing (project idea + required roles/skills)

Deposit bounty to escrow contract

View AI-ranked candidates (with match reasoning)

Send intro request to a candidate

If candidate accepts: escrow releases payment and private contact exchange unlocks

Privacy requirements

No contact details are posted on-chain.

On-chain stores only wallet addresses + request status + payment movements.

Contact exchange happens off-chain after acceptance (authenticated via wallet signature; optionally encrypted payloads).

Tech stack (current direction)

Frontend: React + Vite + TypeScript

Wallet: wagmi v2 + viem

Credentials: EAS/EASScan (Arbitrum)

Storage: Firebase (Firestore + optional Storage)

Matching: AI ranking/recommendations (agentic) based on structured team requirements + applicant skills + credentials
# HackaTon

**Hackathon team formation marketplace for ETHDenver-style events.**

HackaTon helps team owners find the right builders — and builders find the right teams — by combining structured matching, verified on-chain credentials, E2E encrypted communication, and decentralized AI ranking.

## What it does

- **Structured matching** — Team owners post listings with role/skill requirements. Builders create profiles with skills, availability, and preferences. The app scores and ranks matches automatically.
- **Verified on-chain credentials** — Builders link NFT credentials (e.g. Devfolio winner badges) and the app verifies ownership on-chain via `ownerOf()` across Arbitrum, Base, Optimism, Mainnet, and Polygon.
- **E2E encrypted intros & chat** — Contact details are never public. Intro requests gate private info behind acceptance. Chat is end-to-end encrypted using NaCl box keypairs derived deterministically from wallet signatures.
- **AI-powered candidate ranking** — Team owners rank all registered builders by project relevance using decentralized AI on the [0G compute network](https://0g.ai), with per-candidate match scores and reasoning.
- **On-chain consent records** — Accepted intros are recorded on the HackaTonRegistry contract (Arbitrum), creating verifiable match history without exposing private data.
- **ENS resolution** — Wallet addresses display as ENS names throughout the UI.

## Running locally

### 1. Install dependencies

```bash
cd HackaTon
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in your `.env.local`:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_OPENSEA_API_KEY` | Yes | NFT metadata via OpenSea API v2 |
| `VITE_ZG_PRIVATE_KEY` | For AI ranking | 0G network wallet for inference calls |
| `VITE_ZG_RPC_URL` | Optional | 0G RPC endpoint (defaults to testnet) |
| `VITE_REGISTRY_CONTRACT_ADDRESS` | Optional | Deployed HackaTonRegistry on Arbitrum |

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and connect [MetaMask](https://metamask.io/) on **Arbitrum One**.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Bootstrap 5 |
| Wallet | wagmi v3, viem, MetaMask (injected connector) |
| Chains | Arbitrum One (primary), Ethereum Mainnet (ENS), Base / Optimism / Polygon (NFT reads) |
| Smart contract | Solidity ^0.8.24 — `contracts/HackaTonRegistry.sol` |
| AI | 0G Serving Broker (`@0glabs/0g-serving-broker`) — decentralized inference |
| Encryption | TweetNaCl (X25519-XSalsa20-Poly1305) — wallet-derived keypairs |
| NFTs / IPFS | OpenSea API v2, multi-gateway IPFS fallback (Pinata, nft.storage, Cloudflare, ipfs.io) |
| Storage | localStorage (MVP) + on-chain events |

## Repo structure

```
contracts/
  HackaTonRegistry.sol    # On-chain intro records + encrypted chat events
HackaTon/
  src/
    App.tsx                # Main app — wallet connect, mode selector
    0gai.ts                # 0G compute network broker, AI ranking
    contracts.ts           # Registry ABI, on-chain NFT verification, multi-chain clients
    crypto.ts              # NaCl E2E encryption — key derivation, encrypt/decrypt
    ens.ts                 # ENS name resolution hooks
    nft.ts                 # OpenSea API integration, NFT metadata
    ipfs.ts                # Multi-gateway IPFS resolution
    storage.ts             # localStorage persistence layer
    types.ts               # Shared TypeScript types
    components/
      AIRankingPanel.tsx    # 0G AI candidate ranking UI
      ZGAccountPanel.tsx    # 0G ledger management (deposit/transfer/withdraw)
      EncryptedChat.tsx     # E2E encrypted chat per accepted intro
      BuilderProfileForm.tsx
      TeamListingForm.tsx
      CandidateList.tsx
      IntroInbox.tsx
      NftCredentialCard.tsx
      TeamBrowser.tsx
      WalletName.tsx
    views/
      ApplicantView.tsx     # Builder dashboard
      TeamOwnerView.tsx     # Team owner dashboard
```

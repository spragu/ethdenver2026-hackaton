# HackaTon  TODO

##  Done

### Wallet & Chain
- [x] Wallet connect (wagmi + injected connector, Arbitrum only)
- [x] Mode selector (Applicant vs Team Owner)

### Builder Profiles
- [x] Builder profile form (name, handle, bio, roles, skills, availability, links)
- [x] localStorage persistence for profiles
- [x] Profile card with role/skill badges and availability status
- [x] Builders can browse team listings ranked by role/skill match score
- [x] Builders can apply directly to teams (applicant-initiated intro)
- [x] My Applications tab with status badges and Revoke button
- [x] NFT credential linking via OpenSea URL (renders video/image, winner badge, traits)
- [x] NFT full card in credentials tab; compact card on candidate cards

### Team Listings
- [x] Team listing form (project name, description, roles, skills, max team size)
- [x] Listing is free  no bounty/escrow required (removed)
- [x] Team owner can delete a listing
- [x] Candidate list ranked by role/skill match score
- [x] Browse Candidates auto-polls localStorage every 5 s + manual  Refresh
- [x] Incoming Applications section (builder-initiated intros) with Accept/Decline
- [x] Owner-initiated intro send flow

### Intro Request System
- [x] Intro send / accept / decline / revoke flow
- [x] `initiatedBy` field distinguishes owner-reached-out vs builder-applied
- [x] localStorage persistence for intros
- [x] Team Outreach inbox (owner-initiated only) with accept/decline

### Encrypted Chat
- [x] E2E encrypted chat unlocked per accepted intro (both sides)
- [x] NaCl X25519-XSalsa20-Poly1305 (tweetnacl) keypair derived from wallet signature
- [x] Deterministic key derivation: sign fixed message  SHA-256  NaCl seed (no tx, no gas)
- [x] Each message stored twice: encrypted for recipient + self-encrypted for sender
- [x] Wallet-agnostic encryption pubkey store  works without a builder profile (team owners)
- [x] Chat UI with message bubbles, timestamps, Enter-to-send,  Refresh
- [x] Messages tab in both Builder Dashboard and Team Owner view (gated to accepted intros)
- [x]  E2E encrypted badge; "awaiting their key" state shown while other party hasn't signed

### NFT / IPFS
- [x] OpenSea REST API v2 integration (VITE_OPENSEA_API_KEY)
- [x] Multi-gateway IPFS fallback: pinata  nftstorage  cloudflare  ipfs.io (8 s timeout each)
- [x] Fixed IPFS double-prefix bug (http URLs returned as-is)

### Removed / Cleaned Up
- [x] Removed EAS attestation SDK (caused CSP eval errors)
- [x] Removed escrow/bounty field from team listings and all UI
- [x] Removed mock/seed candidate profiles  candidate list is real localStorage only
- [x] Stripped dark-mode CSS conflicts; migrated all components to Bootstrap 5

---

##  On-Chain / Web3 (New)

### Low Effort, High Impact
- [x] On-chain intro record — when an intro is accepted, write a minimal record to the HackaTonRegistry contract on Arbitrum (walletA + walletB + timestamp). Proves the match happened on-chain
  - `contracts/HackaTonRegistry.sol` deployed on Arbitrum; set `VITE_REGISTRY_CONTRACT_ADDRESS` in `.env`
  - `useRecordIntroOnChain()` hook wired into `IntroInbox` and `CandidateList`; fire-and-forget, UI is non-blocking
- [x] Verify NFT ownership on-chain — instead of trusting OpenSea API, call `ownerOf(tokenId)` on the ERC-721 contract to confirm the connected wallet actually owns the credential NFT
  - `verifyNftOwnershipOnChain()` in `src/contracts.ts` uses viem `readContract`; supports Arbitrum, Base, Optimism, Mainnet, Polygon
  - `NftCredentialCard` now accepts optional `ownerWallet` prop and shows ✓ verified / ✗ not owned badge
- [x] ENS resolution — resolve wallet addresses to ENS names (mainnet) and display them throughout the UI instead of raw hex addresses
  - `src/ens.ts` + `src/components/WalletName.tsx`; mainnet transport added to wagmi config
  - Applied in: navbar, chat list, IntroInbox, CandidateList, ApplicantView, TeamOwnerView

### Medium Effort, High Impact
- [ ] Deploy HackaTonEscrow.sol (a.k.a. HackaTonRegistry) on Arbitrum — contract records intros and emits chat events; makes this a real dApp with verifiable on-chain history
  - Contract is written (`contracts/HackaTonRegistry.sol`). Next: deploy with Hardhat/Foundry; set `VITE_REGISTRY_CONTRACT_ADDRESS`
- [ ] Store encrypted chat on Arbitrum via emitted events — call `sendChatMessage(introId, ciphertext)` on the contract; cheap on L2, fully decentralised, ciphertexts are safe to store publicly
  - `useSendChatOnChain()` hook is in `src/contracts.ts`; wire it into `EncryptedChat.tsx` send flow

---

##  High Priority

### Backend / Persistence
- [ ] Replace localStorage with Firebase Firestore
  - Profiles stored by wallet address
  - Team listings as a collection
  - Intro requests with real-time listeners
  - Encrypted chat messages (ciphertexts are safe to store  no plaintext leakage)
- [ ] Gate private contact info (email/Discord/Telegram) behind intro acceptance

### Auth & Identity
- [ ] Use wallet signature as Firebase auth token (Cloud Function verifies sig  custom token)
- [ ] Prevent duplicate intro requests server-side

---

##  Medium Priority

### AI Matching
- [ ] Replace role/skill score with AI ranking (LLM gets team requirements + candidate profiles)
- [ ] Display match reasoning per candidate card
- [ ] "Why this match?" expandable section

### Candidate Discovery
- [ ] Search / filter candidates by role, skill, availability
- [ ] Pagination or infinite scroll

### Credentials
- [ ] Filter NFTs by known trusted event contracts (ETHGlobal, ETHDenver, Devfolio)
- [ ] "Verified Wins" badge count on builder cards
- [ ] Let builders pin specific NFTs to their public profile

### Profile
- [ ] Avatar / profile picture upload
- [ ] Public profile page at /profile/:wallet (React Router)

---

##  Low Priority / Nice to Have

- [ ] React Router for URL-based navigation
- [ ] Dark mode
- [ ] Email / push notifications for intro requests
- [ ] Move chat to Firebase Realtime Database for live sync across devices
- [ ] Optional on-chain intro record (wallet + status only, no PII)

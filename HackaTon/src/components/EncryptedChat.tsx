import { useState, useEffect, useRef } from "react";
import { useSignMessage } from "wagmi";
import type { BuilderProfile, ChatMessage, IntroRequest } from "../types";
import {
  loadChatMessages,
  saveChatMessage,
  saveEncryptionPubKey,
  loadEncryptionPubKey,
  generateId,
} from "../storage";
import {
  SIGN_MESSAGE,
  deriveKeypair,
  encryptFor,
  decryptFrom,
  type EncKeypair,
} from "../crypto";

interface Props {
  intro: IntroRequest;
  myWallet: string;
  myProfile: BuilderProfile | null;
  otherProfile: BuilderProfile | null;
}

interface DecryptedMessage {
  id: string;
  fromWallet: string;
  text: string;
  timestamp: number;
  mine: boolean;
}

export function EncryptedChat({ intro, myWallet, myProfile: _myProfile, otherProfile }: Props) {
  const [keypair, setKeypair] = useState<EncKeypair | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { signMessageAsync } = useSignMessage();

  const myLower = myWallet.toLowerCase();
  // Read the other party's pubkey from the wallet-agnostic store (works for owners without profiles)
  const otherPubKey =
    loadEncryptionPubKey(
      myLower === intro.applicantWallet.toLowerCase() ? intro.ownerWallet : intro.applicantWallet
    ) ??
    otherProfile?.encryptionPubKey ??
    null;

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function unlockChat() {
    setSigning(true);
    setError(null);
    try {
      const sig = await signMessageAsync({ message: SIGN_MESSAGE });
      const kp = await deriveKeypair(sig);

      // Persist pubkey wallet-agnostically (works for owners without a builder profile)
      saveEncryptionPubKey(myWallet, kp.publicKeyB64);

      setKeypair(kp);
      decryptAll(kp);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Signing failed");
    } finally {
      setSigning(false);
    }
  }

  function decryptAll(kp: EncKeypair) {
    const raw = loadChatMessages(intro.id);
    const decrypted: DecryptedMessage[] = [];
    const otherWallet =
      myLower === intro.applicantWallet.toLowerCase() ? intro.ownerWallet : intro.applicantWallet;
    // Always read fresh from storage so we pick up the other party's key if they just signed
    const freshOtherPubKey =
      loadEncryptionPubKey(otherWallet) ?? otherProfile?.encryptionPubKey ?? null;

    for (const msg of raw) {
      const mine = msg.fromWallet.toLowerCase() === myLower;
      const payload = mine ? msg.forSender : msg.forRecipient;
      const peerPubKey = mine ? kp.publicKeyB64 : freshOtherPubKey;

      if (!peerPubKey) {
        decrypted.push({
          id: msg.id,
          fromWallet: msg.fromWallet,
          text: "[🔒 encrypted — other party needs to unlock chat to share their key]",
          timestamp: msg.timestamp,
          mine,
        });
        continue;
      }

      const text = decryptFrom(payload, peerPubKey, kp.secretKey);
      decrypted.push({
        id: msg.id,
        fromWallet: msg.fromWallet,
        text: text ?? "[⚠️ decryption failed]",
        timestamp: msg.timestamp,
        mine,
      });
    }

    setMessages(decrypted);
  }

  async function sendMessage() {
    if (!draft.trim() || !keypair) return;
    if (!otherPubKey) {
      setError("Other party hasn't unlocked chat yet — their encryption key isn't available.");
      return;
    }

    const toWallet = myLower === intro.applicantWallet.toLowerCase()
      ? intro.ownerWallet
      : intro.applicantWallet;

    const msg: ChatMessage = {
      id: generateId(),
      introId: intro.id,
      fromWallet: myWallet,
      toWallet,
      // Encrypt for recipient so they can read it
      forRecipient: encryptFor(draft.trim(), otherPubKey, keypair.secretKey),
      // Self-encrypt so we can read our own sent messages
      forSender: encryptFor(draft.trim(), keypair.publicKeyB64, keypair.secretKey),
      timestamp: Date.now(),
    };

    saveChatMessage(msg);
    setDraft("");

    // Add to displayed messages immediately (already know plaintext)
    setMessages((prev) => [
      ...prev,
      { id: msg.id, fromWallet: myWallet, text: draft.trim(), timestamp: msg.timestamp, mine: true },
    ]);
  }

  function reload() {
    if (keypair) decryptAll(keypair);
  }

  // ─── Not unlocked yet ────────────────────────────────────────────────────────
  if (!keypair) {
    return (
      <div className="text-center py-4">
        <p className="mb-1 fw-semibold">🔐 Encrypted Chat</p>
        <p className="text-muted small mb-3" style={{ maxWidth: 380, margin: "0 auto 1rem" }}>
          Sign a message with your wallet to derive your local encryption key.
          Your private key never leaves your browser.
        </p>
        <button className="btn btn-primary" onClick={unlockChat} disabled={signing}>
          {signing ? "Signing…" : "Sign to Unlock Chat"}
        </button>
        {error && <p className="text-danger small mt-2">{error}</p>}
      </div>
    );
  }

  // ─── Chat UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="d-flex flex-column" style={{ height: 420 }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
        <div>
          <span className="fw-semibold">{otherProfile?.name ?? otherProfile?.wallet?.slice(0, 10) ?? "Other party"}</span>
          {!otherPubKey && (
            <span className="badge bg-warning text-dark ms-2 small">awaiting their key</span>
          )}
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className="badge bg-success">🔐 E2E encrypted</span>
          <button className="btn btn-outline-secondary btn-sm" onClick={reload} title="Reload messages">↺</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow-1 overflow-auto p-2 bg-light rounded mb-2" style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          <p className="text-muted text-center small mt-3">No messages yet. Say hi! 👋</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`d-flex mb-2 ${m.mine ? "justify-content-end" : "justify-content-start"}`}
            >
              <div
                className={`px-3 py-2 rounded-3 ${m.mine ? "bg-primary text-white" : "bg-white border"}`}
                style={{ maxWidth: "75%", wordBreak: "break-word" }}
              >
                <div style={{ fontSize: 14 }}>{m.text}</div>
                <div
                  className={`mt-1 ${m.mine ? "text-white-50" : "text-muted"}`}
                  style={{ fontSize: 10 }}
                >
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!otherPubKey ? (
        <p className="text-muted small text-center">
          Waiting for {otherProfile?.name ?? "the other party"} to unlock their chat…
        </p>
      ) : (
        <div className="d-flex gap-2">
          <input
            className="form-control"
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={!draft.trim()}>
            Send
          </button>
        </div>
      )}
      {error && <p className="text-danger small mt-1">{error}</p>}
    </div>
  );
}

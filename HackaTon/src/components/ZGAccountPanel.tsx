import { useState, useCallback } from "react";
import {
  getAccount,
  depositFund,
  transferFund,
  getInferenceSubAccount,
  retrieveFund,
  refund,
  type ZGAccount,
  type ZGSubAccount,
} from "../0gai";

type Busy = "" | "loading" | "deposit" | "transfer" | "sub-account" | "retrieve-inference" | "retrieve-ft" | "refund";

export function ZGAccountPanel() {
  const [account, setAccount] = useState<ZGAccount | null>(null);
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // deposit
  const [depositAmt, setDepositAmt] = useState("10");

  // transfer
  const [transferProvider, setTransferProvider] = useState("");
  const [transferAmt, setTransferAmt] = useState("5");
  const [transferType, setTransferType] = useState<"inference" | "fine-tuning">("inference");

  // sub-account check
  const [subProvider, setSubProvider] = useState("");
  const [subAccount, setSubAccount] = useState<ZGSubAccount | null>(null);

  // refund/withdraw
  const [withdrawAmt, setWithdrawAmt] = useState("5");

  function clearFeedback() { setError(""); setSuccess(""); }

  const refreshAccount = useCallback(async () => {
    setBusy("loading");
    clearFeedback();
    try {
      setAccount(await getAccount());
    } catch (e) {
      const msg = String(e);
      if (msg.includes("Account does not exist") || msg.includes("add-account")) {
        // No account yet — this is expected before the first deposit
        setAccount(null);
        setSuccess("No 0G account found yet. Make a deposit below to create one automatically.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy("");
    }
  }, []);

  async function run(key: Busy, fn: () => Promise<unknown>, successMsg: string) {
    setBusy(key);
    clearFeedback();
    try {
      await fn();
      setSuccess(successMsg);
      // Refresh balance after mutating operations
      try {
        setAccount(await getAccount());
      } catch {
        // Account may not be queryable immediately after creation — ignore
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <h5 className="mb-1">0G Account Management</h5>
      <p className="text-muted small mb-3">
        Manage your 0G ledger balance used to pay for AI inference.
      </p>

      {/* Feedback */}
      {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
      {success && <div className="alert alert-success py-2 small mb-3">{success}</div>}

      {/* ── Balance ───────────────────────────────────── */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="card-title mb-0">Ledger Balance</h6>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={refreshAccount}
              disabled={busy === "loading"}
            >
              {busy === "loading"
                ? <><span className="spinner-border spinner-border-sm me-1" />Loading…</>
                : "↻ Refresh"}
            </button>
          </div>
          {account ? (
            <div className="d-flex gap-4">
              <div>
                <div className="text-muted small">Total</div>
                <div className="fw-semibold">{Number(account.totalBalance).toFixed(4)} 0G</div>
              </div>
              <div>
                <div className="text-muted small">Available</div>
                <div className="fw-semibold">{Number(account.availableBalance).toFixed(4)} 0G</div>
              </div>
            </div>
          ) : (
            <p className="text-muted small mb-0">
              Click <strong>↻ Refresh</strong> to load your balance. If you haven't deposited yet,
              make a deposit below — it will create your account automatically.
            </p>
          )}
        </div>
      </div>

      {/* ── Deposit ───────────────────────────────────── */}
      <div className="card mb-3">
        <div className="card-body">
          <h6 className="card-title mb-2">Deposit Funds</h6>
          <div className="input-group input-group-sm" style={{ maxWidth: 280 }}>
            <input
              type="number"
              min="0.001"
              step="0.001"
              className="form-control"
              value={depositAmt}
              onChange={(e) => setDepositAmt(e.target.value)}
              placeholder="Amount (0G)"
            />
            <span className="input-group-text">0G</span>
            <button
              className="btn btn-primary"
              disabled={busy === "deposit"}
              onClick={() =>
                run("deposit", () => depositFund(Number(depositAmt)), `Deposited ${depositAmt} 0G`)
              }
            >
              {busy === "deposit"
                ? <span className="spinner-border spinner-border-sm" />
                : "Deposit"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Transfer to Provider ──────────────────────── */}
      <div className="card mb-3">
        <div className="card-body">
          <h6 className="card-title mb-2">Transfer to Provider Sub-Account</h6>
          <div className="d-flex flex-column gap-2" style={{ maxWidth: 400 }}>
            <input
              type="text"
              className="form-control form-control-sm font-monospace"
              placeholder="Provider address (0x…)"
              value={transferProvider}
              onChange={(e) => setTransferProvider(e.target.value)}
            />
            <div className="input-group input-group-sm">
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="form-control"
                placeholder="Amount"
                value={transferAmt}
                onChange={(e) => setTransferAmt(e.target.value)}
              />
              <span className="input-group-text">0G</span>
              <select
                className="form-select"
                style={{ maxWidth: 140 }}
                value={transferType}
                onChange={(e) => setTransferType(e.target.value as "inference" | "fine-tuning")}
              >
                <option value="inference">Inference</option>
                <option value="fine-tuning">Fine-tuning</option>
              </select>
              <button
                className="btn btn-outline-primary"
                disabled={busy === "transfer" || !transferProvider}
                onClick={() =>
                  run(
                    "transfer",
                    () => transferFund(transferProvider, transferType, Number(transferAmt)),
                    `Transferred ${transferAmt} 0G to ${transferProvider.slice(0, 8)}…`
                  )
                }
              >
                {busy === "transfer"
                  ? <span className="spinner-border spinner-border-sm" />
                  : "Transfer"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-Account Details ───────────────────────── */}
      <div className="card mb-3">
        <div className="card-body">
          <h6 className="card-title mb-2">Check Inference Sub-Account</h6>
          <div className="d-flex gap-2 align-items-end flex-wrap" style={{ maxWidth: 420 }}>
            <input
              type="text"
              className="form-control form-control-sm font-monospace"
              placeholder="Provider address (0x…)"
              value={subProvider}
              onChange={(e) => { setSubProvider(e.target.value); setSubAccount(null); }}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-sm btn-outline-secondary"
              disabled={busy === "sub-account" || !subProvider}
              onClick={async () => {
                setBusy("sub-account");
                clearFeedback();
                try {
                  setSubAccount(await getInferenceSubAccount(subProvider));
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy("");
                }
              }}
            >
              {busy === "sub-account"
                ? <span className="spinner-border spinner-border-sm" />
                : "Check"}
            </button>
          </div>
          {subAccount && (
            <div className="mt-2 small">
              Sub-account balance:{" "}
              <span className="fw-semibold">{Number(subAccount.balance).toFixed(4)} 0G</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Retrieve / Refund ─────────────────────────── */}
      <div className="card mb-3">
        <div className="card-body">
          <h6 className="card-title mb-2">Request Refund (sub-account → ledger)</h6>
          <div className="d-flex gap-2 flex-wrap">
            <button
              className="btn btn-sm btn-outline-warning"
              disabled={!!busy}
              onClick={() =>
                run("retrieve-inference", () => retrieveFund("inference"), "Refund requested for inference funds.")
              }
            >
              {busy === "retrieve-inference"
                ? <span className="spinner-border spinner-border-sm" />
                : "Retrieve Inference Funds"}
            </button>
            <button
              className="btn btn-sm btn-outline-warning"
              disabled={!!busy}
              onClick={() =>
                run("retrieve-ft", () => retrieveFund("fine-tuning"), "Refund requested for fine-tuning funds.")
              }
            >
              {busy === "retrieve-ft"
                ? <span className="spinner-border spinner-border-sm" />
                : "Retrieve Fine-tuning Funds"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Withdraw ──────────────────────────────────── */}
      <div className="card mb-3">
        <div className="card-body">
          <h6 className="card-title mb-2">Withdraw to Wallet (ledger → wallet)</h6>
          <div className="input-group input-group-sm" style={{ maxWidth: 280 }}>
            <input
              type="number"
              min="0.001"
              step="0.001"
              className="form-control"
              value={withdrawAmt}
              onChange={(e) => setWithdrawAmt(e.target.value)}
              placeholder="Amount (0G)"
            />
            <span className="input-group-text">0G</span>
            <button
              className="btn btn-outline-danger"
              disabled={busy === "refund"}
              onClick={() =>
                run("refund", () => refund(Number(withdrawAmt)), `Withdrew ${withdrawAmt} 0G to wallet.`)
              }
            >
              {busy === "refund"
                ? <span className="spinner-border spinner-border-sm" />
                : "Withdraw"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

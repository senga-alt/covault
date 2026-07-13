import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import type { TxState } from "../lib/tx";
import { explorerTxUrl } from "../lib/contract";

/** Inline transaction status - lives under the form that launched it.
    `successHint` closes the journey: one quiet line pointing at the natural
    next step once the chain confirms. */
export function TxStatus({
  state,
  onDismiss,
  successHint,
}: {
  state: TxState;
  onDismiss: () => void;
  successHint?: React.ReactNode;
}) {
  const link = (txid: string) => (
    <a
      href={explorerTxUrl(txid)}
      target="_blank"
      rel="noreferrer"
      className="tnum underline decoration-rule underline-offset-4 hover:text-paper"
    >
      view on explorer
    </a>
  );

  // The live region stays mounted even when idle: screen readers routinely skip
  // announcements from aria-live nodes inserted together with their first message.
  return (
    <div aria-live="polite" className={state.phase === "idle" ? undefined : "mt-4 border-t border-rule pt-4 text-sm"}>
      {state.phase === "signing" && (
        <p className="flex items-center gap-2 text-paper-dim">
          <Loader2 size={15} className="animate-spin" aria-hidden />
          Confirm the transaction in your wallet...
        </p>
      )}
      {state.phase === "pending" && (
        <p className="flex items-center gap-2 text-paper-dim">
          <Loader2 size={15} className="animate-spin" aria-hidden />
          Broadcast. Waiting for confirmation - {link(state.txid)}
        </p>
      )}
      {state.phase === "success" && (
        <>
          <div className="flex items-start justify-between gap-4">
            <p className="flex items-center gap-2 text-gain">
              <CheckCircle2 size={15} aria-hidden />
              Confirmed on-chain - {link(state.txid)}
            </p>
            <button onClick={onDismiss} className="cursor-pointer text-xs text-paper-dim underline hover:text-paper">
              dismiss
            </button>
          </div>
          {successHint && <p className="mt-1.5 text-xs text-paper-dim">{successHint}</p>}
        </>
      )}
      {state.phase === "error" && (
        <div className="flex items-start justify-between gap-4" role="alert">
          <p className="flex items-start gap-2 text-loss">
            <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              {state.message} {state.txid && <>({link(state.txid)})</>}
            </span>
          </p>
          <button onClick={onDismiss} className="cursor-pointer text-xs text-paper-dim underline hover:text-paper">
            dismiss
          </button>
        </div>
      )}
    </div>
  );
}

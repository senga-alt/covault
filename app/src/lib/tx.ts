import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "@stacks/connect";
import type { ClarityValue, PostCondition } from "@stacks/transactions";
import { API_BASE, CONTRACT_ID, NETWORK } from "./contract";

/**
 * Contract error codes -> plain language. Kept in one place so every surface
 * explains failures the same way (design principle: error states teach).
 */
const CONTRACT_ERRORS: Record<number, string> = {
  1: "Insufficient balance in the collateral asset.",
  2: "Sender and recipient are the same account - you cannot fill your own offer.",
  100: "Only the contract owner can do this.",
  101: "Only the settlement oracle can do this.",
  102: "That series does not exist.",
  103: "Invalid parameters for this series.",
  104: "This series has expired - writing is closed.",
  105: "Not expired yet - settlement opens at the expiry block.",
  106: "This series is already settled.",
  107: "Not settled yet - wait for the settlement price.",
  108: "You do not hold enough option (long) positions.",
  109: "You do not hold enough written (short) positions.",
  110: "Wrong collateral token for this series.",
  111: "Amount must be greater than zero.",
  112: "That offer does not exist.",
  113: "The offer does not have that many contracts left.",
  114: "Only the offer maker can cancel it.",
  115: "New writes are paused. Exits (exercise, reclaim, close) stay open.",
  116: "Series creation is limited to the operator in v1.",
  117: "Fee exceeds the 5% cap.",
  200: "Only the settler's owner can do that.",
  201: "The settler has no price source configured yet.",
  202: "That is not the settler's pinned price source.",
  203: "That series does not exist.",
  204: "This series' pair label cannot settle from DIA.",
  205: "The price feed returned a zero value - settlement refused.",
  206: "The DIA price is older than the freshness window. Try again after the next feed update.",
};

export function explainTxFailure(status: string, resultRepr?: string): string {
  if (status === "abort_by_post_condition") {
    return "Aborted by a safety post-condition: the transaction would have moved a different amount than promised, so your wallet cancelled it. No funds moved.";
  }
  const m = resultRepr?.match(/\(err u(\d+)\)/);
  if (m) {
    const code = Number(m[1]);
    return CONTRACT_ERRORS[code] ?? `Contract rejected the call (error u${code}).`;
  }
  if (status.startsWith("dropped")) return "The transaction was dropped from the mempool. Try again.";
  return "The transaction failed on-chain.";
}

export type TxState =
  | { phase: "idle" }
  | { phase: "signing" }
  | { phase: "pending"; txid: string }
  | { phase: "success"; txid: string; resultRepr?: string }
  | { phase: "error"; message: string; txid?: string };

/**
 * Poll until confirmed or failed. Tolerates transient network errors (keeps
 * retrying) instead of misreporting a broadcast transaction as failed.
 */
async function pollTx(txid: string, signal: AbortSignal): Promise<{ ok: boolean; status: string; repr?: string }> {
  let consecutiveFailures = 0;
  for (let i = 0; i < 90; i++) {
    if (signal.aborted) throw new Error("aborted");
    try {
      const r = await fetch(`${API_BASE}/extended/v1/tx/0x${txid.replace(/^0x/, "")}`);
      if (r.ok) {
        consecutiveFailures = 0;
        const j = await r.json();
        if (j.tx_status === "success") return { ok: true, status: j.tx_status, repr: j.tx_result?.repr };
        if (j.tx_status !== "pending") return { ok: false, status: j.tx_status, repr: j.tx_result?.repr };
      }
    } catch {
      if (++consecutiveFailures >= 8) return { ok: false, status: "network" };
    }
    await new Promise((res) => setTimeout(res, 4000));
  }
  return { ok: false, status: "timeout" };
}

/**
 * One in-flight contract call per hook instance: sign -> broadcast -> poll.
 * Polling is cancelled on unmount; broadcast and poll failures are reported
 * distinctly, so a confirmed-later transaction is never called "not sent".
 */
export function useTx(onSuccess?: () => void) {
  const [state, setState] = useState<TxState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // never poll or set state after unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = useCallback(
    async (
      functionName: string,
      functionArgs: ClarityValue[],
      postConditions: PostCondition[],
      contractId: string = CONTRACT_ID
    ) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setState({ phase: "signing" });

      let txid: string | undefined;
      try {
        const res = await request("stx_callContract", {
          contract: contractId as `${string}.${string}`,
          functionName,
          functionArgs,
          postConditions,
          postConditionMode: "deny",
          network: NETWORK,
        });
        txid = res.txid;
        if (!txid) throw new Error("Wallet did not return a transaction id.");
      } catch (e) {
        if (ac.signal.aborted) return;
        const msg = (e as Error)?.message ?? "";
        setState({
          phase: "error",
          message: /reject|cancel|denied|closed/i.test(msg)
            ? "Signature request cancelled in the wallet. Nothing was sent."
            : msg || "Could not send the transaction.",
        });
        return;
      }

      if (ac.signal.aborted) return;
      setState({ phase: "pending", txid });

      try {
        const out = await pollTx(txid, ac.signal);
        if (ac.signal.aborted) return;
        if (out.ok) {
          setState({ phase: "success", txid, resultRepr: out.repr });
          onSuccess?.();
        } else if (out.status === "timeout" || out.status === "network") {
          setState({
            phase: "error",
            txid,
            message:
              out.status === "network"
                ? "Lost connection while waiting. The transaction was broadcast - check its status on the explorer."
                : "Still unconfirmed after several minutes. The transaction was broadcast - check the explorer link.",
          });
        } else {
          setState({ phase: "error", txid, message: explainTxFailure(out.status, out.repr) });
        }
      } catch (e) {
        if ((e as Error).message === "aborted" || ac.signal.aborted) return;
        setState({
          phase: "error",
          txid,
          message: "Could not track the transaction, but it was broadcast - check the explorer link.",
        });
      }
    },
    [onSuccess]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ phase: "idle" });
  }, []);

  return { state, run, reset };
}

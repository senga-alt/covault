import { useCallback, useRef, useState } from "react";
import { request } from "@stacks/connect";
import type { ClarityValue, PostCondition } from "@stacks/transactions";
import { API_BASE, CONTRACT_ID, NETWORK } from "./contract";

/**
 * Contract error codes -> plain language. Kept in one place so every surface
 * explains failures the same way (design principle: error states teach).
 */
const CONTRACT_ERRORS: Record<number, string> = {
  1: "Insufficient balance in the collateral asset.",
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

async function pollTx(txid: string, signal: AbortSignal): Promise<{ ok: boolean; status: string; repr?: string }> {
  for (let i = 0; i < 90; i++) {
    if (signal.aborted) throw new Error("aborted");
    const r = await fetch(`${API_BASE}/extended/v1/tx/0x${txid.replace(/^0x/, "")}`);
    if (r.ok) {
      const j = await r.json();
      if (j.tx_status === "success") return { ok: true, status: j.tx_status, repr: j.tx_result?.repr };
      if (j.tx_status !== "pending") return { ok: false, status: j.tx_status, repr: j.tx_result?.repr };
    }
    await new Promise((res) => setTimeout(res, 4000));
  }
  return { ok: false, status: "timeout" };
}

/**
 * One in-flight contract call per hook instance: sign -> broadcast -> poll.
 * `onSuccess` is where callers refresh their chain reads.
 */
export function useTx(onSuccess?: () => void) {
  const [state, setState] = useState<TxState>({ phase: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (functionName: string, functionArgs: ClarityValue[], postConditions: PostCondition[]) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setState({ phase: "signing" });
      try {
        const res = await request("stx_callContract", {
          contract: CONTRACT_ID as `${string}.${string}`,
          functionName,
          functionArgs,
          postConditions,
          postConditionMode: "deny",
          network: NETWORK,
        });
        const txid = res.txid;
        if (!txid) throw new Error("Wallet did not return a transaction id.");
        setState({ phase: "pending", txid });
        const out = await pollTx(txid, ac.signal);
        if (out.ok) {
          setState({ phase: "success", txid, resultRepr: out.repr });
          onSuccess?.();
        } else if (out.status === "timeout") {
          setState({ phase: "error", txid, message: "Still unconfirmed after several minutes. Check the explorer link." });
        } else {
          setState({ phase: "error", txid, message: explainTxFailure(out.status, out.repr) });
        }
      } catch (e) {
        if ((e as Error).message === "aborted") return;
        const msg = (e as Error)?.message ?? "";
        setState({
          phase: "error",
          message: /reject|cancel|denied|closed/i.test(msg)
            ? "Signature request cancelled in the wallet. Nothing was sent."
            : msg || "Could not send the transaction.",
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

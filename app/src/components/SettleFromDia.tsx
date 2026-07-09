import { Cl } from "@stacks/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { DIA_CONTRACT, SETTLER_ID, hasSettler } from "../lib/contract";
import { useWallet } from "../lib/wallet";
import { useTx } from "../lib/tx";
import { TxStatus } from "./TxStatus";

/**
 * Permissionless settlement trigger. Visible only when a settler is configured
 * and a wallet is connected. Anyone can record the on-chain price - no operator,
 * no manual entry. Renders nothing (safe no-op) when unconfigured.
 */
export function SettleFromDia({ id }: { id: number }) {
  const { address } = useWallet();
  const qc = useQueryClient();
  const { state, run, reset } = useTx(() => {
    qc.invalidateQueries({ queryKey: ["series", id] });
    qc.invalidateQueries({ queryKey: ["series"] });
  });

  if (!hasSettler || !address) return null;
  const busy = state.phase === "signing" || state.phase === "pending";

  return (
    <div className="mt-4 border-t border-rule pt-4">
      <button
        onClick={() => run("settle-from-dia", [Cl.uint(id), Cl.principal(DIA_CONTRACT)], [], SETTLER_ID)}
        disabled={busy}
        className="cursor-pointer rounded-[2px] bg-seal px-4 py-2.5 text-sm font-bold text-on-seal transition-colors duration-200 hover:bg-seal-hi disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Waiting..." : "Settle now from DIA"}
      </button>
      <p className="mt-2 text-xs text-paper-dim">
        Permissionless - anyone can record the on-chain settlement price from DIA. No manual entry.
      </p>
      <TxStatus state={state} onDismiss={reset} />
    </div>
  );
}

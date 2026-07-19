import { Cl } from "@stacks/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DIA_CONTRACT, SETTLER_ID, hasSettler, getDiaSettlePreview } from "../lib/contract";
import { formatAmount } from "../lib/format";
import { useWallet } from "../lib/wallet";
import { useTx } from "../lib/tx";
import { TxStatus } from "./TxStatus";

const fmtAge = (s: number) =>
  s < 90 ? `${s}s` : s < 5400 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`;

const fmtPrice = (price: bigint, underlying: string) =>
  underlying === "STX-SBTC"
    ? `${price.toLocaleString()} sats per STX`
    : `${formatAmount(price, "stx")} per sBTC`;

/**
 * Permissionless settlement trigger. Visible only when a settler is configured
 * and a wallet is connected. Previews the exact price the settler would record
 * (via its own read-only derive-price, so preview and chain cannot disagree)
 * and fails closed in the UI when the DIA quotes are stale.
 */
export function SettleFromDia({ id, underlying }: { id: number; underlying: string }) {
  const { address } = useWallet();
  const qc = useQueryClient();
  const { state, run, reset } = useTx(() => {
    qc.invalidateQueries({ queryKey: ["series", id] });
    qc.invalidateQueries({ queryKey: ["series"] });
  });

  const preview = useQuery({
    queryKey: ["dia-preview", underlying],
    queryFn: () => getDiaSettlePreview(underlying),
    enabled: hasSettler,
    refetchInterval: 30_000,
    retry: 1,
  });

  if (!hasSettler || !address) return null;
  const busy = state.phase === "signing" || state.phase === "pending";
  const blocked = preview.isError || (preview.data ? !preview.data.fresh : false);

  return (
    <div className="mt-4 border-t border-rule pt-4">
      {preview.isLoading && (
        <p className="tnum mb-3 text-xs text-paper-dim">Reading DIA feeds...</p>
      )}
      {preview.data && preview.data.fresh && (
        <p className="tnum mb-3 text-xs text-paper-dim">
          Would record <span className="font-medium text-paper">{fmtPrice(preview.data.price, underlying)}</span>{" "}
          from feeds {fmtAge(preview.data.ageSeconds)} old.
        </p>
      )}
      {preview.data && !preview.data.fresh && (
        <p role="alert" className="mb-3 text-xs text-loss">
          The DIA quotes are {fmtAge(preview.data.ageSeconds)} old - older than the settler's
          freshness window ({fmtAge(preview.data.maxAge)}). Settlement would be rejected;
          it opens again after the next DIA update.
        </p>
      )}
      {preview.isError && (
        <p role="alert" className="mb-3 text-xs text-loss">
          {(preview.error as Error)?.message ?? "Could not read the DIA feeds."}
        </p>
      )}
      <button
        onClick={() => run("settle-from-dia", [Cl.uint(id), Cl.principal(DIA_CONTRACT)], [], SETTLER_ID)}
        disabled={busy || blocked}
        className="cursor-pointer rounded-[2px] bg-seal px-4 py-2.5 text-sm font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

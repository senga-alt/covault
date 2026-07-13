import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Cl } from "@stacks/transactions";
import { CONTRACT_ID, payoffPerContract, type Series } from "../lib/contract";
import { formatAmount } from "../lib/format";
import { useWallet } from "../lib/wallet";
import { useTx } from "../lib/tx";
import { TxStatus } from "./TxStatus";
import { ConservedSumBar } from "./ConservedSumBar";
import { sendExactPc, tokenArgFor } from "./WritePanel";

function useInvalidate(seriesId: number) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["position", seriesId] });
    qc.invalidateQueries({ queryKey: ["holdings"] });
  };
}

function ClaimForm({
  series,
  kind,
  held,
}: {
  series: Series;
  kind: "exercise" | "reclaim";
  held: bigint;
}) {
  const { address } = useWallet();
  const [qtyStr, setQtyStr] = useState(held.toString());
  const { state, run, reset } = useTx(useInvalidate(series.id));

  const perContract = payoffPerContract(series);
  const per = kind === "exercise" ? perContract : series.maxPayoff - perContract;

  const qty = useMemo(() => {
    try {
      const n = BigInt(qtyStr);
      return n > 0n && n <= held ? n : null;
    } catch {
      return null;
    }
  }, [qtyStr, held]);

  const amount = qty !== null ? qty * per : null;
  const busy = state.phase === "signing" || state.phase === "pending";
  const label = kind === "exercise" ? "Exercise" : "Reclaim";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || qty === null || amount === null) return;
    // The contract pays out of its own escrow; the post-condition binds it to the
    // exact amount. A zero payout makes no transfer, so no post-condition applies.
    const pcs = amount > 0n ? [sendExactPc(CONTRACT_ID, series, amount)] : [];
    run(kind, [Cl.uint(series.id), Cl.uint(qty), tokenArgFor(series)], pcs);
  };

  return (
    <form onSubmit={submit} className="border-t border-rule pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display font-bold">{label}</h3>
        <span className="text-xs text-paper-dim">
          {kind === "exercise" ? "you hold" : "you wrote"} <span className="tnum">{held.toString()}</span>
        </span>
      </div>
      <p className="mt-1 text-sm text-paper-dim">
        {kind === "exercise"
          ? `Claims the settled payoff of ${formatAmount(perContract, series.asset)} per contract.`
          : `Returns the leftover collateral of ${formatAmount(series.maxPayoff - perContract, series.asset)} per contract.`}
      </p>
      <div className="mt-3 flex items-end gap-3">
        <div>
          <label htmlFor={`${kind}-qty`} className="block text-xs text-paper-dim">
            Contracts
          </label>
          <input
            id={`${kind}-qty`}
            inputMode="numeric"
            pattern="[0-9]*"
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            disabled={busy}
            className="tnum mt-1 w-28 rounded-[2px] border border-rule bg-ink-3 px-3 py-2 text-paper focus:border-seal disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={busy || qty === null}
          className="cursor-pointer rounded-[2px] bg-seal px-4 py-2.5 text-sm font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Waiting..." : amount !== null ? `${label} for ${formatAmount(amount, series.asset)}` : label}
        </button>
      </div>
      {qtyStr !== "" && qty === null && (
        <p role="alert" className="mt-1.5 text-xs text-loss">
          Enter a whole number between 1 and {held.toString()}.
        </p>
      )}
      <TxStatus
        state={state}
        onDismiss={reset}
        successHint={
          <>
            {kind === "exercise" ? "Payoff claimed." : "Collateral returned."}{" "}
            <Link to="/app/portfolio" className="underline decoration-rule underline-offset-4 hover:text-paper">
              See your portfolio
            </Link>{" "}
            for what remains.
          </>
        }
      />
    </form>
  );
}

/** Post-settlement claims: exercise (longs) and reclaim (shorts). */
export function ClaimPanel({ series, long, short }: { series: Series; long: bigint; short: bigint }) {
  const { address } = useWallet();
  if (!address) return null;

  return (
    <section aria-labelledby="claims" className="space-y-4 border border-rule bg-ink-2 p-5">
      <div>
        <h2 id="claims" className="flex items-center gap-2.5 font-display text-lg font-bold">
          <span className="inline-block h-2.5 w-2.5 shrink-0 bg-seal" aria-hidden />
          Settlement claims
        </h2>
        <p className="mt-1 text-sm text-paper-dim">
          Settled at <span className="tnum">{formatAmount(series.settlementPrice, series.asset)}</span>. Claims stay
          open forever - there is no deadline.
        </p>
        {/* the invariant, per contract: exercise draws the payoff side, reclaim the leftover */}
        <ConservedSumBar
          payoff={payoffPerContract(series)}
          total={series.maxPayoff}
          asset={series.asset}
          className="mt-3"
        />
      </div>
      {long > 0n && <ClaimForm series={series} kind="exercise" held={long} />}
      {short > 0n && <ClaimForm series={series} kind="reclaim" held={short} />}
      {long === 0n && short === 0n && (
        <p className="border-t border-rule pt-4 text-sm text-paper-dim">
          No positions to claim in this series from the connected wallet.
        </p>
      )}
    </section>
  );
}

/** Early netting: burn a matched long+short pair before expiry, collateral back. */
export function ClosePanel({ series, long, short }: { series: Series; long: bigint; short: bigint }) {
  const { address } = useWallet();
  const [qtyStr, setQtyStr] = useState("1");
  const { state, run, reset } = useTx(useInvalidate(series.id));

  const max = long < short ? long : short;
  const qty = useMemo(() => {
    try {
      const n = BigInt(qtyStr);
      return n > 0n && n <= max ? n : null;
    } catch {
      return null;
    }
  }, [qtyStr, max]);

  if (!address || max === 0n) return null;
  const refund = qty !== null ? qty * series.maxPayoff : null;
  const busy = state.phase === "signing" || state.phase === "pending";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty === null || refund === null) return;
    run("close-pair", [Cl.uint(series.id), Cl.uint(qty), tokenArgFor(series)], [
      sendExactPc(CONTRACT_ID, series, refund),
    ]);
  };

  return (
    <section aria-labelledby="close" className="border border-rule bg-ink-2 p-5">
      <h2 id="close" className="font-display text-lg font-bold">Close a matched pair</h2>
      <p className="mt-1 text-sm text-paper-dim">
        You hold both sides of <span className="tnum">{max.toString()}</span> contract{max === 1n ? "" : "s"}. Net
        them out now and take the collateral back before expiry.
      </p>
      <form onSubmit={submit} className="mt-3 flex items-end gap-3">
        <div>
          <label htmlFor="close-qty" className="block text-xs text-paper-dim">
            Pairs
          </label>
          <input
            id="close-qty"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            disabled={busy}
            className="tnum mt-1 w-28 rounded-[2px] border border-rule bg-ink-3 px-3 py-2 text-paper focus:border-seal disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={busy || qty === null}
          className="cursor-pointer rounded-[2px] border border-rule px-4 py-2.5 text-sm font-bold text-paper transition duration-200 hover:bg-ink-3 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Waiting..." : refund !== null ? `Close for ${formatAmount(refund, series.asset)}` : "Close"}
        </button>
      </form>
      <TxStatus state={state} onDismiss={reset} />
    </section>
  );
}

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Cl, Pc } from "@stacks/transactions";
import { SBTC_CONTRACT, type Series } from "../lib/contract";
import { formatAmount } from "../lib/format";
import { useWallet } from "../lib/wallet";
import { useTx } from "../lib/tx";
import { TxStatus } from "./TxStatus";

/** The (optional trait) token argument matching a series' collateral asset. */
export function tokenArgFor(series: Series) {
  if (series.asset === "stx") return Cl.none();
  const [addr, name] = SBTC_CONTRACT.split(".");
  return Cl.some(Cl.contractPrincipal(addr, name));
}

/** Exact-amount post-condition for the sender, in the series' asset. */
export function sendExactPc(sender: string, series: Series, amount: bigint) {
  return series.asset === "stx"
    ? Pc.principal(sender).willSendEq(amount).ustx()
    : Pc.principal(sender).willSendEq(amount).ft(SBTC_CONTRACT as `${string}.${string}`, "sbtc-token");
}

function Row({ k, v, strong = false }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-rule py-2.5">
      <dt className="text-sm text-paper-dim">{k}</dt>
      <dd className={`tnum text-right text-sm ${strong ? "text-base font-medium" : ""}`}>{v}</dd>
    </div>
  );
}

/**
 * Write options: lock collateral, receive matched long + short positions.
 * Risk is shown in full before the signature (design principle: risk before action).
 */
export function WritePanel({ series }: { series: Series }) {
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [qtyStr, setQtyStr] = useState("1");

  const { state, run, reset } = useTx(() => {
    queryClient.invalidateQueries({ queryKey: ["position", series.id] });
    queryClient.invalidateQueries({ queryKey: ["series"] });
    queryClient.invalidateQueries({ queryKey: ["holdings"] });
  });

  const qty = useMemo(() => {
    const n = Number(qtyStr);
    return Number.isInteger(n) && n > 0 ? BigInt(n) : null;
  }, [qtyStr]);

  const collateral = qty !== null ? qty * series.maxPayoff : null;
  const busy = state.phase === "signing" || state.phase === "pending";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || qty === null || collateral === null) return;
    run(
      "write-options",
      [Cl.uint(series.id), Cl.uint(qty), tokenArgFor(series)],
      [sendExactPc(address, series, collateral)]
    );
  };

  if (!address) {
    return (
      <section aria-labelledby="write" className="border border-rule bg-ink-2 p-5">
        <h2 id="write" className="font-display text-lg font-bold">Write options</h2>
        <p className="mt-2 text-sm text-paper-dim">
          Connect your wallet (top right) to write options in this series.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="write" className="border border-rule bg-ink-2 p-5">
      <h2 id="write" className="font-display text-lg font-bold">Write options</h2>
      <p className="mt-1.5 text-sm text-paper-dim">
        Lock collateral, receive {qty !== null ? qty.toString() : "N"} option{qty === 1n ? "" : "s"} (long) and the
        matching obligation{qty === 1n ? "" : "s"} (short). Sell the longs for premium; your risk never exceeds the
        collateral you lock here.
      </p>

      <form onSubmit={submit} className="mt-5">
        <label htmlFor="write-qty" className="block text-sm font-medium">
          Contracts to write
        </label>
        <input
          id="write-qty"
          inputMode="numeric"
          pattern="[0-9]*"
          value={qtyStr}
          onChange={(e) => setQtyStr(e.target.value)}
          disabled={busy}
          aria-describedby="write-qty-help"
          className="tnum mt-2 w-40 rounded-[2px] border border-rule bg-ink-3 px-3 py-2.5 text-paper focus:border-seal disabled:opacity-50"
        />
        <p id="write-qty-help" className="mt-1.5 text-xs text-paper-dim">
          Whole contracts. 1 contract = exposure to 1 unit of the reference.
        </p>
        {qtyStr !== "" && qty === null && (
          <p role="alert" className="mt-1.5 text-xs text-loss">
            Enter a whole number greater than zero.
          </p>
        )}

        <dl className="mt-6">
          <Row k="You lock now (collateral)" strong v={collateral !== null ? formatAmount(collateral, series.asset) : "-"} />
          <Row k="You receive" v={qty !== null ? `${qty} long + ${qty} short` : "-"} />
          <Row k="Maximum the holder can be paid" v={collateral !== null ? formatAmount(collateral, series.asset) : "-"} />
          <Row k="Your maximum loss" v={collateral !== null ? `${formatAmount(collateral, series.asset)} minus premium earned` : "-"} />
          <Row k="Collateral returns" v="at settlement (leftover) or by closing the pair early" />
        </dl>

        <button
          type="submit"
          disabled={busy || qty === null}
          className="mt-6 w-full cursor-pointer rounded-[2px] bg-seal px-5 py-3 font-bold text-on-seal transition-colors duration-200 hover:bg-seal-hi disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Waiting..." : collateral !== null ? `Lock ${formatAmount(collateral, series.asset)} and write` : "Write"}
        </button>
        <p className="mt-2 text-center text-xs text-paper-dim">
          Protected by a post-condition: the transaction can move exactly this amount, nothing else.
        </p>
      </form>

      <TxStatus state={state} onDismiss={reset} />
    </section>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cl } from "@stacks/transactions";
import { getConfig, getOpenOffers, type Offer, type Series } from "../lib/contract";
import { formatAmount, shortAddress } from "../lib/format";
import { useWallet } from "../lib/wallet";
import { useTx } from "../lib/tx";
import { TxStatus } from "./TxStatus";
import { sendExactPc, tokenArgFor } from "./WritePanel";

function useInvalidateBook(seriesId: number) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["offers", seriesId] });
    qc.invalidateQueries({ queryKey: ["position", seriesId] });
    qc.invalidateQueries({ queryKey: ["holdings"] });
  };
}

/* ------------------------------------------------------------------ */
/* fill                                                                */
/* ------------------------------------------------------------------ */

function FillRow({ offer, series, feeBps }: { offer: Offer; series: Series; feeBps: number }) {
  const { address } = useWallet();
  const [qtyStr, setQtyStr] = useState("1");
  const { state, run, reset } = useTx(useInvalidateBook(series.id));

  const qty = useMemo(() => {
    try {
      const n = BigInt(qtyStr);
      return n > 0n && n <= offer.qty ? n : null;
    } catch {
      return null;
    }
  }, [qtyStr, offer.qty]);

  const cost = qty !== null ? qty * offer.price : null;
  const fee = cost !== null ? (cost * BigInt(feeBps)) / 10000n : null;
  const total = cost !== null && fee !== null ? cost + fee : null;
  const busy = state.phase === "signing" || state.phase === "pending";
  const isMine = address === offer.maker;

  const cancel = () => run("cancel-offer", [Cl.uint(offer.id)], []);
  const fill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || qty === null || total === null) return;
    // One aggregate post-condition covers premium to the maker plus any protocol fee.
    run("fill-offer", [Cl.uint(offer.id), Cl.uint(qty), tokenArgFor(series)], [
      sendExactPc(address, series, total),
    ]);
  };

  return (
    <li className="border-t border-rule px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <span className="tnum">{offer.qty.toString()}</span>
          <span className="text-paper-dim"> @ </span>
          <span className="tnum">{formatAmount(offer.price, series.asset)}</span>
          <span className="text-paper-dim"> per contract</span>
          <span className="tnum ml-3 text-xs text-paper-dim">
            {isMine ? "your offer" : shortAddress(offer.maker)}
          </span>
        </div>

        {isMine ? (
          <button
            onClick={cancel}
            disabled={busy}
            className="cursor-pointer rounded-[2px] border border-loss/50 px-3 py-1.5 text-xs font-bold text-loss transition-colors duration-200 hover:bg-loss/10 disabled:opacity-50"
          >
            {busy ? "Waiting..." : "Cancel offer"}
          </button>
        ) : address ? (
          <form onSubmit={fill} className="flex items-center gap-2">
            <label htmlFor={`fill-${offer.id}`} className="sr-only">
              Contracts to buy from offer {offer.id}
            </label>
            <input
              id={`fill-${offer.id}`}
              inputMode="numeric"
              pattern="[0-9]*"
              value={qtyStr}
              onChange={(e) => setQtyStr(e.target.value)}
              disabled={busy}
              className="tnum w-20 rounded-[2px] border border-rule bg-ink-3 px-2 py-1.5 text-sm text-paper focus:border-seal disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={busy || qty === null}
              className="cursor-pointer rounded-[2px] bg-seal px-3 py-1.5 text-xs font-bold text-on-seal transition-colors duration-200 hover:bg-seal-hi disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Waiting..." : total !== null ? `Buy for ${formatAmount(total, series.asset)}` : "Buy"}
            </button>
          </form>
        ) : (
          <span className="text-xs text-paper-dim">connect wallet to buy</span>
        )}
      </div>
      {qtyStr !== "" && qty === null && !isMine && address && (
        <p role="alert" className="mt-1.5 text-xs text-loss">
          Enter a whole number between 1 and {offer.qty.toString()}.
        </p>
      )}
      <TxStatus state={state} onDismiss={reset} />
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* list                                                                */
/* ------------------------------------------------------------------ */

function ListForm({ series, long }: { series: Series; long: bigint }) {
  const [qtyStr, setQtyStr] = useState("1");
  const [priceStr, setPriceStr] = useState("");
  const { state, run, reset } = useTx(useInvalidateBook(series.id));

  const qty = useMemo(() => {
    try {
      const n = BigInt(qtyStr);
      return n > 0n && n <= long ? n : null;
    } catch {
      return null;
    }
  }, [qtyStr, long]);
  const price = useMemo(() => {
    try {
      const n = BigInt(priceStr);
      return n > 0n ? n : null;
    } catch {
      return null;
    }
  }, [priceStr]);

  const busy = state.phase === "signing" || state.phase === "pending";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty === null || price === null) return;
    // Listing escrows positions inside the contract; no tokens move, so no
    // post-conditions apply. Deny mode still blocks any unexpected transfer.
    run("list-offer", [Cl.uint(series.id), Cl.uint(qty), Cl.uint(price)], []);
  };

  return (
    <form onSubmit={submit} className="border-t border-rule px-4 py-4">
      <p className="text-sm font-medium">Sell your options</p>
      <p className="mt-1 text-xs text-paper-dim">
        You hold <span className="tnum">{long.toString()}</span>. Listed options are escrowed until
        bought or cancelled; the premium is paid straight to you on each fill.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="list-qty" className="block text-xs text-paper-dim">
            Contracts
          </label>
          <input
            id="list-qty"
            inputMode="numeric"
            pattern="[0-9]*"
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
            disabled={busy}
            className="tnum mt-1 w-24 rounded-[2px] border border-rule bg-ink-3 px-2.5 py-2 text-sm text-paper focus:border-seal disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="list-price" className="block text-xs text-paper-dim">
            Price per contract ({series.asset === "sbtc" ? "sats" : "uSTX"})
          </label>
          <input
            id="list-price"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="premium"
            value={priceStr}
            onChange={(e) => setPriceStr(e.target.value)}
            disabled={busy}
            className="tnum mt-1 w-36 rounded-[2px] border border-rule bg-ink-3 px-2.5 py-2 text-sm text-paper placeholder:text-paper-dim focus:border-seal disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={busy || qty === null || price === null}
          className="cursor-pointer rounded-[2px] border border-rule px-4 py-2 text-sm font-bold text-paper transition-colors duration-200 hover:bg-ink-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Waiting..." : qty !== null && price !== null ? `List for ${formatAmount(qty * price, series.asset)}` : "List"}
        </button>
      </div>
      <TxStatus state={state} onDismiss={reset} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* section                                                             */
/* ------------------------------------------------------------------ */

export function OrderBook({ series, long }: { series: Series; long: bigint }) {
  const offersQ = useQuery({
    queryKey: ["offers", series.id],
    queryFn: () => getOpenOffers(series.id),
    refetchInterval: 30_000,
  });
  const configQ = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const feeBps = configQ.data?.feeBps ?? 0;

  return (
    <section aria-labelledby="order-book" className="border border-rule bg-ink-2">
      <div className="flex items-baseline justify-between gap-4 px-4 py-4">
        <h2 id="order-book" className="font-display text-lg font-bold">
          Order book
        </h2>
        <span className="text-xs text-paper-dim">
          {feeBps > 0 ? `taker fee ${feeBps / 100}%` : "no protocol fee"}
        </span>
      </div>

      {offersQ.isLoading && (
        <div className="border-t border-rule px-4 py-4">
          <div className="h-8 animate-pulse rounded-[2px] bg-ink-3" />
        </div>
      )}

      {offersQ.isError && (
        <p role="alert" className="border-t border-rule px-4 py-4 text-sm text-loss">
          Could not load offers.{" "}
          <button onClick={() => offersQ.refetch()} className="cursor-pointer font-medium underline">
            Retry
          </button>
        </p>
      )}

      {offersQ.data && offersQ.data.length === 0 && (
        <p className="border-t border-rule px-4 py-5 text-sm text-paper-dim">
          No open offers. {long > 0n ? "List yours below." : "Write options to have something to sell."}
        </p>
      )}

      {offersQ.data && offersQ.data.length > 0 && (
        <ul aria-label="Open offers">
          {[...offersQ.data]
            .sort((a, b) => (a.price < b.price ? -1 : a.price > b.price ? 1 : 0))
            .map((o) => (
              <FillRow key={o.id} offer={o} series={series} feeBps={feeBps} />
            ))}
        </ul>
      )}

      {long > 0n && <ListForm series={series} long={long} />}
    </section>
  );
}

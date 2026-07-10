import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ChevronRight, RefreshCw } from "lucide-react";
import {
  getAllOpenOffers,
  getAllSeries,
  getBurnHeight,
  seriesStatus,
  type Series,
  type SeriesStatus,
} from "../lib/contract";
import { formatAmount, estimateExpiry } from "../lib/format";
import { StatusChip } from "../components/StatusChip";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { CornerOrnaments } from "../components/Guilloche";

function TypeBadge({ isCall }: { isCall: boolean }) {
  return isCall ? (
    <span className="inline-flex items-center gap-1 text-gain">
      <ArrowUpRight size={14} aria-hidden /> Capped call
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-loss">
      <ArrowDownRight size={14} aria-hidden /> Put
    </span>
  );
}

/* The instrument's shape at a glance: a tiny engraved payoff glyph. */
function PayoffGlyph({ isCall }: { isCall: boolean }) {
  const d = isCall ? "M2,13 L20,13 L34,4 L42,4" : "M2,4 L10,4 L24,13 L42,13";
  const kink = isCall ? 20 : 24;
  return (
    <svg viewBox="0 0 44 16" className="h-4 w-11 shrink-0" aria-hidden="true">
      <line x1={kink} y1="2" x2={kink} y2="14" stroke="var(--color-gilt)" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.5" />
      <path d={d} fill="none" stroke="var(--color-data)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface Quote {
  best: bigint;
  depth: bigint;
}

function Row({ s, burnHeight, quote }: { s: Series; burnHeight: number; quote?: Quote }) {
  const status = seriesStatus(s, burnHeight);
  return (
    <tr className="group border-t border-rule transition-colors duration-150 hover:bg-ink-3/60">
      <td className="px-4 py-3">
        <Link
          to={`/app/series/${s.id}`}
          className="inline-flex items-center gap-1 font-medium text-paper transition-colors duration-150 hover:text-seal-hi"
        >
          #{s.id} {s.underlying}
          <ChevronRight
            size={14}
            aria-hidden
            className="-translate-x-1 text-seal-hi opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
          />
        </Link>
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="flex items-center gap-2.5">
          <TypeBadge isCall={s.isCall} />
          <PayoffGlyph isCall={s.isCall} />
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-[2px] border border-rule px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-paper-dim">
          {s.asset === "sbtc" ? "sBTC" : "STX"}
        </span>
      </td>
      <td className="tnum px-4 py-3 text-right text-sm">{formatAmount(s.strike, s.asset)}</td>
      <td className="tnum px-4 py-3 text-right text-sm">
        {quote ? (
          <>
            {formatAmount(quote.best, s.asset)}
            <span className="ml-1.5 text-xs text-paper-dim">x{quote.depth.toString()}</span>
          </>
        ) : (
          <span className="text-paper-dim">-</span>
        )}
      </td>
      <td className="tnum px-4 py-3 text-right text-sm text-paper-dim">
        #{s.expiry.toLocaleString()}
        <span className="ml-2 text-xs">({estimateExpiry(s.expiry, burnHeight)})</span>
      </td>
      <td className="px-4 py-3 text-right"><StatusChip status={status} /></td>
    </tr>
  );
}

const chip = (on: boolean) =>
  `cursor-pointer rounded-[2px] border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
    on ? "border-seal bg-seal/10 text-paper" : "border-rule text-paper-dim hover:text-paper"
  }`;

type StatusFilter = "all" | SeriesStatus;
type AssetFilter = "all" | "stx" | "sbtc";


export function Markets() {
  const seriesQ = useQuery({ queryKey: ["series"], queryFn: getAllSeries, refetchInterval: 30_000 });
  const burnQ = useQuery({ queryKey: ["burn-height"], queryFn: getBurnHeight, refetchInterval: 30_000 });
  const offersQ = useQuery({ queryKey: ["all-offers"], queryFn: getAllOpenOffers, refetchInterval: 30_000 });

  const [status, setStatus] = useState<StatusFilter>("all");
  const [asset, setAsset] = useState<AssetFilter>("all");

  // best (lowest) open offer + depth per series
  const quotes = useMemo(() => {
    const m = new Map<number, Quote>();
    for (const o of offersQ.data ?? []) {
      const q = m.get(o.seriesId);
      if (!q) m.set(o.seriesId, { best: o.price, depth: o.qty });
      else m.set(o.seriesId, { best: o.price < q.best ? o.price : q.best, depth: q.depth + o.qty });
    }
    return m;
  }, [offersQ.data]);

  const burn = burnQ.data ?? 0;
  const filtered = (seriesQ.data ?? []).filter(
    (s) =>
      (status === "all" || seriesStatus(s, burn) === status) &&
      (asset === "all" || s.asset === asset)
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Markets"
        description="Every payoff is capped at its locked collateral. Read the risk off the row."
        meta={
          <button
            onClick={() => { seriesQ.refetch(); burnQ.refetch(); offersQ.refetch(); }}
            aria-label="Refresh markets"
            className="cursor-pointer rounded-[2px] border border-rule p-2 text-paper-dim transition-colors duration-200 hover:bg-ink-3 hover:text-paper"
          >
            <RefreshCw size={16} className={seriesQ.isFetching ? "animate-spin" : ""} aria-hidden />
          </button>
        }
      />

      {seriesQ.isLoading && (
        <div className="space-y-2" aria-label="Loading markets">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-[2px] bg-ink-3" />
          ))}
        </div>
      )}

      {seriesQ.isError && (
        <div role="alert" className="rounded-[2px] border border-loss/40 bg-loss/10 px-4 py-3 text-sm">
          Could not load markets from the chain.{" "}
          <button onClick={() => seriesQ.refetch()} className="cursor-pointer font-medium underline">
            Retry
          </button>
        </div>
      )}

      {seriesQ.data && seriesQ.data.length === 0 && (
        <EmptyState title="No option series yet">
          Series are curated by the operator in v1. The first markets - covered calls and
          cash-secured puts on sBTC and STX - will appear here.
        </EmptyState>
      )}

      {seriesQ.data && seriesQ.data.length > 0 && (
        <>
          <dl className="flex flex-col divide-y divide-rule border border-rule bg-ink-2 sm:flex-row sm:divide-x sm:divide-y-0">
            {(() => {
              const counts = { active: 0, expired: 0, settled: 0 };
              for (const s of seriesQ.data) counts[seriesStatus(s, burn)]++;
              const openInterest = (offersQ.data ?? []).reduce((a, o) => a + o.qty, 0n);
              return [
                ["Active", counts.active.toString()],
                ["Awaiting settlement", counts.expired.toString()],
                ["Settled", counts.settled.toString()],
                ["Contracts on offer", openInterest.toString()],
              ].map(([label, value]) => (
                <div key={label} className="flex-1 px-4 py-3.5">
                  <dt className="text-[11px] uppercase tracking-widest text-paper-dim">{label}</dt>
                  <dd className="tnum mt-1.5 text-lg font-medium">{value}</dd>
                </div>
              ));
            })()}
          </dl>

          {/* one filter row governs the registry */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1.5" role="group" aria-label="Filter by status">
              {(["all", "active", "expired", "settled"] as StatusFilter[]).map((v) => (
                <button key={v} type="button" aria-pressed={status === v} onClick={() => setStatus(v)} className={chip(status === v)}>
                  {v === "expired" ? "awaiting" : v}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Filter by collateral asset">
              {(["all", "sbtc", "stx"] as AssetFilter[]).map((v) => (
                <button key={v} type="button" aria-pressed={asset === v} onClick={() => setAsset(v)} className={chip(asset === v)}>
                  {v === "all" ? "both assets" : v === "sbtc" ? "sBTC" : "STX"}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              compact={false}
              title="No series match these filters"
              action={
                <button
                  onClick={() => { setStatus("all"); setAsset("all"); }}
                  className="cursor-pointer rounded-[2px] border border-rule px-4 py-2 text-sm font-medium text-paper transition duration-200 hover:bg-ink-3 active:scale-[0.98]"
                >
                  Clear filters
                </button>
              }
            >
              Try a different status or asset combination.
            </EmptyState>
          ) : (
            <figure className="m-0">
              <div className="relative border border-rule bg-ink-2">
                <CornerOrnaments />
                <div className="scroll-x overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left">
                    <caption className="sr-only">Option series listed on Covault</caption>
                    <thead>
                      <tr className="text-xs uppercase tracking-widest text-paper-dim">
                        <th scope="col" className="px-4 py-3 font-medium">Series</th>
                        <th scope="col" className="px-4 py-3 font-medium">Type</th>
                        <th scope="col" className="px-4 py-3 font-medium">Collateral</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">Strike</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">Best offer</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">Expiry (burn block)</th>
                        <th scope="col" className="px-4 py-3 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="border-t-2 border-rule">
                      {filtered.map((s) => (
                        <Row key={s.id} s={s} burnHeight={burn} quote={quotes.get(s.id)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-widest text-paper-dim">
                Series registry - read live from covault-core
              </figcaption>
            </figure>
          )}

        </>
      )}
    </div>
  );
}

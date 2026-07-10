import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ChevronRight, RefreshCw } from "lucide-react";
import { getAllSeries, getBurnHeight, seriesStatus, type Series } from "../lib/contract";
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

function Row({ s, burnHeight }: { s: Series; burnHeight: number }) {
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
      <td className="px-4 py-3 text-sm"><TypeBadge isCall={s.isCall} /></td>
      <td className="px-4 py-3">
        <span className="rounded-[2px] border border-rule px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-paper-dim">
          {s.asset === "sbtc" ? "sBTC" : "STX"}
        </span>
      </td>
      <td className="tnum px-4 py-3 text-right text-sm">{formatAmount(s.strike, s.asset)}</td>
      <td className="tnum px-4 py-3 text-right text-sm">{formatAmount(s.maxPayoff, s.asset)}</td>
      <td className="tnum px-4 py-3 text-right text-sm text-paper-dim">
        #{s.expiry.toLocaleString()}
        <span className="ml-2 text-xs">({estimateExpiry(s.expiry, burnHeight)})</span>
      </td>
      <td className="px-4 py-3 text-right"><StatusChip status={status} /></td>
    </tr>
  );
}

export function Markets() {
  const seriesQ = useQuery({ queryKey: ["series"], queryFn: getAllSeries, refetchInterval: 30_000 });
  const burnQ = useQuery({ queryKey: ["burn-height"], queryFn: getBurnHeight, refetchInterval: 30_000 });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Markets"
        description="Every payoff is capped at its locked collateral. Read the risk off the row."
        meta={
          <button
            onClick={() => { seriesQ.refetch(); burnQ.refetch(); }}
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
        <dl className="flex flex-col divide-y divide-rule border border-rule bg-ink-2 sm:flex-row sm:divide-x sm:divide-y-0">
          {(() => {
            const burn = burnQ.data ?? 0;
            const counts = { active: 0, expired: 0, settled: 0 };
            for (const s of seriesQ.data) counts[seriesStatus(s, burn)]++;
            return [
              ["Active", counts.active],
              ["Awaiting settlement", counts.expired],
              ["Settled", counts.settled],
              ["Collateral assets", "sBTC + STX"],
            ].map(([label, value]) => (
              <div key={label} className="flex-1 px-4 py-3.5">
                <dt className="text-[11px] uppercase tracking-widest text-paper-dim">{label}</dt>
                <dd className="tnum mt-1.5 text-lg font-medium">{value}</dd>
              </div>
            ));
          })()}
        </dl>
      )}

      {seriesQ.data && seriesQ.data.length > 0 && (
        <figure className="m-0">
          <div className="relative border border-rule bg-ink-2">
            <CornerOrnaments />
            <div className="scroll-x overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
            <caption className="sr-only">Option series listed on Covault</caption>
            <thead>
              <tr className="text-xs uppercase tracking-widest text-paper-dim">
                <th scope="col" className="px-4 py-3 font-medium">Series</th>
                <th scope="col" className="px-4 py-3 font-medium">Type</th>
                <th scope="col" className="px-4 py-3 font-medium">Collateral</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Strike</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Max payoff</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Expiry (burn block)</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="border-t-2 border-rule">
              {seriesQ.data.map((s) => (
                <Row key={s.id} s={s} burnHeight={burnQ.data ?? 0} />
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
    </div>
  );
}

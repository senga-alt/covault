import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, RefreshCw } from "lucide-react";
import { getAllSeries, getBurnHeight, seriesStatus, type Series } from "../lib/contract";
import { formatAmount, estimateExpiry } from "../lib/format";
import { StatusChip } from "../components/StatusChip";

function TypeBadge({ isCall }: { isCall: boolean }) {
  return isCall ? (
    <span className="inline-flex items-center gap-1 text-success">
      <ArrowUpRight size={14} aria-hidden /> Capped call
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-destructive">
      <ArrowDownRight size={14} aria-hidden /> Put
    </span>
  );
}

function Row({ s, burnHeight }: { s: Series; burnHeight: number }) {
  const status = seriesStatus(s, burnHeight);
  return (
    <tr className="border-b border-border transition-colors duration-150 hover:bg-muted/50">
      <td className="px-4 py-3">
        <Link to={`/series/${s.id}`} className="font-medium text-foreground hover:text-primary">
          #{s.id} {s.underlying}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm"><TypeBadge isCall={s.isCall} /></td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{s.asset === "sbtc" ? "sBTC" : "STX"}</td>
      <td className="tnum px-4 py-3 text-right text-sm">{formatAmount(s.strike, s.asset)}</td>
      <td className="tnum px-4 py-3 text-right text-sm">{formatAmount(s.maxPayoff, s.asset)}</td>
      <td className="tnum px-4 py-3 text-right text-sm text-muted-foreground">
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
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Markets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fully-collateralized option series. Every payoff is capped at its locked collateral.
          </p>
        </div>
        <button
          onClick={() => { seriesQ.refetch(); burnQ.refetch(); }}
          aria-label="Refresh markets"
          className="cursor-pointer rounded-md border border-border p-2 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
        >
          <RefreshCw size={16} className={seriesQ.isFetching ? "animate-spin" : ""} aria-hidden />
        </button>
      </div>

      {seriesQ.isLoading && (
        <div className="space-y-2" aria-label="Loading markets">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {seriesQ.isError && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          Could not load markets from the chain.{" "}
          <button onClick={() => seriesQ.refetch()} className="cursor-pointer font-medium underline">
            Retry
          </button>
        </div>
      )}

      {seriesQ.data && seriesQ.data.length === 0 && (
        <div className="rounded-md border border-border bg-card px-6 py-12 text-center">
          <p className="font-medium">No option series yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Series are curated by the operator in v1. The first markets will appear here.
          </p>
        </div>
      )}

      {seriesQ.data && seriesQ.data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[720px] text-left">
            <caption className="sr-only">Option series listed on Covault</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Series</th>
                <th scope="col" className="px-4 py-3 font-medium">Type</th>
                <th scope="col" className="px-4 py-3 font-medium">Collateral</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Strike</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Max payoff</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Expiry (burn block)</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {seriesQ.data.map((s) => (
                <Row key={s.id} s={s} burnHeight={burnQ.data ?? 0} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

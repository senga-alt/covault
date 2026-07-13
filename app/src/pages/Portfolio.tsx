import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight, RefreshCw } from "lucide-react";
import {
  getAllSeries,
  getBurnHeight,
  getPosition,
  payoffPerContract,
  seriesStatus,
  type Series,
} from "../lib/contract";
import { useWallet } from "../lib/wallet";
import { formatAmount } from "../lib/format";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { StatusChip } from "../components/StatusChip";
import { CornerOrnaments } from "../components/Guilloche";

interface Holding { series: Series; long: bigint; short: bigint }

async function loadHoldings(address: string): Promise<Holding[]> {
  const series = await getAllSeries();
  const positions = await Promise.all(series.map((s) => getPosition(s.id, address)));
  return series
    .map((s, i) => ({ series: s, ...positions[i] }))
    .filter((h) => h.long > 0n || h.short > 0n);
}

interface AssetTotals { stx: bigint; sbtc: bigint }
const zero = (): AssetTotals => ({ stx: 0n, sbtc: 0n });

/** What this holding pays out today if the holder claims (exercise long, reclaim short). */
function claimableNow(h: Holding): bigint {
  if (!h.series.settled) return 0n;
  const payoff = payoffPerContract(h.series);
  const leftover = h.series.maxPayoff - payoff;
  return h.long * payoff + h.short * leftover;
}

/** Collateral still escrowed behind unsettled shorts (comes back as leftover at settlement). */
function engagedCollateral(h: Holding): bigint {
  if (h.series.settled) return 0n;
  return h.short * h.series.maxPayoff;
}

function TotalsCell({ totals }: { totals: AssetTotals }) {
  const parts: [bigint, "sbtc" | "stx"][] = [];
  if (totals.sbtc > 0n) parts.push([totals.sbtc, "sbtc"]);
  if (totals.stx > 0n) parts.push([totals.stx, "stx"]);
  if (parts.length === 0) return <>0</>;
  return (
    <span className="flex flex-col gap-0.5">
      {parts.map(([v, a]) => (
        <span key={a}>{formatAmount(v, a)}</span>
      ))}
    </span>
  );
}

function claimHint(h: Holding): string | null {
  if (!h.series.settled) return null;
  const payoff = payoffPerContract(h.series);
  const canExercise = h.long > 0n && payoff > 0n;
  const canReclaim = h.short > 0n && h.series.maxPayoff - payoff > 0n;
  if (canExercise && canReclaim) return "exercise + reclaim";
  if (canExercise) return "via exercise";
  if (canReclaim) return "via reclaim";
  return null;
}

export function Portfolio() {
  const { address } = useWallet();
  const q = useQuery({
    queryKey: ["holdings", address],
    queryFn: () => loadHoldings(address!),
    enabled: !!address,
    refetchInterval: 30_000,
  });
  const burnQ = useQuery({ queryKey: ["burn-height"], queryFn: getBurnHeight, refetchInterval: 30_000 });
  const burn = burnQ.data ?? 0;

  const totals = useMemo(() => {
    const claimable = zero();
    const engaged = zero();
    for (const h of q.data ?? []) {
      claimable[h.series.asset] += claimableNow(h);
      engaged[h.series.asset] += engagedCollateral(h);
    }
    return { claimable, engaged };
  }, [q.data]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Portfolio"
        description="Your long and short positions across all series, and what they pay today."
        meta={
          address ? (
            <button
              onClick={() => { q.refetch(); burnQ.refetch(); }}
              aria-label="Refresh portfolio"
              className="cursor-pointer rounded-[2px] border border-rule p-2 text-paper-dim transition-colors duration-200 hover:bg-ink-3 hover:text-paper"
            >
              <RefreshCw size={16} className={q.isFetching ? "animate-spin" : ""} aria-hidden />
            </button>
          ) : undefined
        }
      />

      {!address && (
        <EmptyState title="Wallet not connected">
          Connect your wallet (top right) to see the options you hold and the ones you have written.
        </EmptyState>
      )}

      {address && q.isLoading && (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-[2px] bg-ink-3" />)}
        </div>
      )}

      {address && q.isError && (
        <div role="alert" className="rounded-[2px] border border-loss/40 bg-loss/10 px-4 py-3 text-sm">
          Could not load your positions from the chain.{" "}
          <button onClick={() => q.refetch()} className="cursor-pointer font-medium underline">
            Retry
          </button>
        </div>
      )}

      {address && q.data && q.data.length === 0 && (
        <EmptyState
          title="No positions yet"
          action={
            <Link
              to="/app"
              className="rounded-[2px] bg-seal px-4 py-2 text-sm font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98]"
            >
              Browse markets
            </Link>
          }
        >
          Write an option to earn premium, or buy one to hedge - your longs and shorts will show up here.
        </EmptyState>
      )}

      {address && q.data && q.data.length > 0 && (
        <dl className="flex flex-col divide-y divide-rule border border-rule bg-ink-2 sm:flex-row sm:divide-x sm:divide-y-0">
          {(
            [
              ["Series with positions", <>{q.data.length}</>],
              ["Options held (long)", <>{q.data.reduce((a, h) => a + h.long, 0n).toString()}</>],
              ["Written (short)", <>{q.data.reduce((a, h) => a + h.short, 0n).toString()}</>],
              ["Claimable now", <TotalsCell totals={totals.claimable} />],
              ["Collateral engaged", <TotalsCell totals={totals.engaged} />],
            ] as [string, React.ReactNode][]
          ).map(([label, value]) => (
            <div key={label} className="flex-1 px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-widest text-paper-dim">{label}</dt>
              <dd className="tnum mt-1.5 text-lg font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {address && q.data && q.data.length > 0 && (
        <figure className="m-0">
          <div className="relative border border-rule bg-ink-2">
            <CornerOrnaments />
            <div className="scroll-x overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <caption className="sr-only">Your positions</caption>
                <thead>
                  <tr className="text-xs uppercase tracking-widest text-paper-dim">
                    <th scope="col" className="px-4 py-3 font-medium">Series</th>
                    <th scope="col" className="px-4 py-3 font-medium">Collateral</th>
                    <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Long</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Short</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Claimable now</th>
                  </tr>
                </thead>
                <tbody className="border-t-2 border-rule">
                  {q.data.map((h) => {
                    const { series: s, long, short } = h;
                    const claim = claimableNow(h);
                    const hint = claimHint(h);
                    return (
                      <tr key={s.id} className="group border-t border-rule transition-colors duration-150 hover:bg-ink-3/60">
                        <td className="px-4 py-3">
                          <Link
                            to={`/app/series/${s.id}`}
                            className="inline-flex items-center gap-1 font-medium transition-colors duration-150 hover:text-seal-hi"
                          >
                            #{s.id} {s.underlying}
                            <ChevronRight
                              size={14}
                              aria-hidden
                              className="-translate-x-1 text-seal-hi opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                            />
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-[2px] border border-rule px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-paper-dim">
                            {s.asset === "sbtc" ? "sBTC" : "STX"}
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusChip status={seriesStatus(s, burn)} /></td>
                        <td className="tnum px-4 py-3 text-right">{long.toString()}</td>
                        <td className="tnum px-4 py-3 text-right">{short.toString()}</td>
                        <td className="tnum px-4 py-3 text-right">
                          {s.settled ? (
                            <span className="flex flex-col items-end">
                              <span className={claim > 0n ? "text-gain" : "text-paper-dim"}>
                                {formatAmount(claim, s.asset)}
                              </span>
                              {hint && <span className="text-[10px] text-paper-dim">{hint}</span>}
                            </span>
                          ) : (
                            <span className="text-paper-dim" title="Settles at expiry">
                              -<span className="sr-only"> (settles at expiry)</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-widest text-paper-dim">
            Your ledger - longs are claims, shorts are obligations
          </figcaption>
        </figure>
      )}
    </div>
  );
}

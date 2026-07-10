import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAllSeries, getPosition, type Series } from "../lib/contract";
import { useWallet } from "../lib/wallet";
import { formatAmount } from "../lib/format";
import { EmptyState } from "../components/EmptyState";

interface Holding { series: Series; long: bigint; short: bigint }

async function loadHoldings(address: string): Promise<Holding[]> {
  const series = await getAllSeries();
  const positions = await Promise.all(series.map((s) => getPosition(s.id, address)));
  return series
    .map((s, i) => ({ series: s, ...positions[i] }))
    .filter((h) => h.long > 0n || h.short > 0n);
}

export function Portfolio() {
  const { address } = useWallet();
  const q = useQuery({
    queryKey: ["holdings", address],
    queryFn: () => loadHoldings(address!),
    enabled: !!address,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Portfolio</h1>
        <p className="mt-2 text-[15px] text-paper-dim">Your long and short positions across all series.</p>
      </div>

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
        <div className="overflow-x-auto border border-rule bg-ink-2">
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Your positions</caption>
            <thead>
              <tr className="text-xs uppercase tracking-widest text-paper-dim">
                <th scope="col" className="px-4 py-3 font-medium">Series</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Long</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Short</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Collateral / contract</th>
              </tr>
            </thead>
            <tbody className="border-t-2 border-rule">
              {q.data.map(({ series: s, long, short }) => (
                <tr key={s.id} className="border-t border-rule transition-colors duration-150 hover:bg-ink-3/60">
                  <td className="px-4 py-3">
                    <Link to={`/app/series/${s.id}`} className="font-medium hover:text-seal-hi">
                      #{s.id} {s.underlying}
                    </Link>
                  </td>
                  <td className="tnum px-4 py-3 text-right">{long.toString()}</td>
                  <td className="tnum px-4 py-3 text-right">{short.toString()}</td>
                  <td className="tnum px-4 py-3 text-right">{formatAmount(s.maxPayoff, s.asset)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

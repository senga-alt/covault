import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAllSeries, getPosition, type Series } from "../lib/contract";
import { useWallet } from "../lib/wallet";
import { formatAmount } from "../lib/format";

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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Portfolio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your long and short positions across all series.</p>
      </div>

      {!address && (
        <div className="rounded-md border border-border bg-card px-6 py-12 text-center">
          <p className="font-medium">Wallet not connected</p>
          <p className="mt-1 text-sm text-muted-foreground">Connect your wallet to see your positions.</p>
        </div>
      )}

      {address && q.isLoading && (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />)}
        </div>
      )}

      {address && q.data && q.data.length === 0 && (
        <div className="rounded-md border border-border bg-card px-6 py-12 text-center">
          <p className="font-medium">No positions yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the <Link to="/" className="text-primary underline">markets</Link> to write or buy your first option.
          </p>
        </div>
      )}

      {address && q.data && q.data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[560px] text-left">
            <caption className="sr-only">Your positions</caption>
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Series</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Long</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Short</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Collateral / contract</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map(({ series: s, long, short }) => (
                <tr key={s.id} className="border-b border-border transition-colors duration-150 hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link to={`/series/${s.id}`} className="font-medium hover:text-primary">
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

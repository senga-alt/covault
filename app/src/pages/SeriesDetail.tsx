import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getBurnHeight, getPosition, getSeries, seriesStatus } from "../lib/contract";
import { formatAmount, estimateExpiry } from "../lib/format";
import { StatusChip } from "../components/StatusChip";
import { useWallet } from "../lib/wallet";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="tnum mt-1 text-lg font-medium">{children}</dd>
    </div>
  );
}

export function SeriesDetail() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const { address } = useWallet();

  const seriesQ = useQuery({ queryKey: ["series", id], queryFn: () => getSeries(id), enabled: Number.isFinite(id) });
  const burnQ = useQuery({ queryKey: ["burn-height"], queryFn: getBurnHeight, refetchInterval: 30_000 });
  const posQ = useQuery({
    queryKey: ["position", id, address],
    queryFn: () => getPosition(id, address!),
    enabled: Number.isFinite(id) && !!address,
  });

  if (seriesQ.isLoading) return <div className="h-48 animate-pulse rounded-lg bg-muted" aria-label="Loading series" />;
  if (seriesQ.isError || seriesQ.data === null) {
    return (
      <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
        Series #{idParam} was not found on this network.
      </div>
    );
  }
  const s = seriesQ.data;
  if (!s) return null;
  const burn = burnQ.data ?? 0;
  const status = seriesStatus(s, burn);

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} aria-hidden /> Markets
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          #{s.id} {s.underlying}
        </h1>
        <StatusChip status={status} />
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">
        {s.isCall ? "Capped call" : "Cash-secured put"} settled in {s.asset === "sbtc" ? "sBTC" : "native STX"}.
        Writers lock {formatAmount(s.maxPayoff, s.asset)} per contract; the holder&apos;s payoff can never
        exceed that amount.
      </p>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Strike">{formatAmount(s.strike, s.asset)}</Stat>
        <Stat label="Collateral / contract">{formatAmount(s.maxPayoff, s.asset)}</Stat>
        <Stat label="Expiry">
          #{s.expiry.toLocaleString()}
          <span className="ml-2 text-xs text-muted-foreground">({estimateExpiry(s.expiry, burn)})</span>
        </Stat>
        <Stat label={s.settled ? "Settlement price" : "Status"}>
          {s.settled ? formatAmount(s.settlementPrice, s.asset) : status === "expired" ? "Awaiting price" : "Trading"}
        </Stat>
      </dl>

      <section aria-labelledby="your-position" className="rounded-lg border border-border bg-card p-4">
        <h2 id="your-position" className="font-display text-lg font-semibold">Your position</h2>
        {!address && <p className="mt-2 text-sm text-muted-foreground">Connect your wallet to see your position in this series.</p>}
        {address && posQ.isLoading && <div className="mt-3 h-8 animate-pulse rounded bg-muted" />}
        {address && posQ.data && (
          <div className="mt-3 flex gap-8">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Long (options held)</div>
              <div className="tnum text-xl font-medium">{posQ.data.long.toString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Short (written)</div>
              <div className="tnum text-xl font-medium">{posQ.data.short.toString()}</div>
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Write, trade, exercise, and reclaim actions land here in the next iteration.
        </p>
      </section>
    </div>
  );
}

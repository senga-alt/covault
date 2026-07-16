import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getBurnHeight, getPosition, getSeries, seriesStatus } from "../lib/contract";
import { formatAmount, estimateExpiryDate } from "../lib/format";
import { StatusChip } from "../components/StatusChip";
import { WritePanel } from "../components/WritePanel";
import { ClaimPanel, ClosePanel } from "../components/ClaimPanel";
import { OrderBook } from "../components/OrderBook";
import { PayoffChart } from "../components/PayoffChart";
import { SettleFromDia } from "../components/SettleFromDia";
import { Term } from "../components/Term";
import { useWallet } from "../lib/wallet";

// One cell of the facts strip - borderless; the strip provides the hairlines.
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 px-4 py-3.5">
      <dt className="text-[11px] uppercase tracking-widest text-paper-dim">{label}</dt>
      <dd className="tnum mt-1.5 text-lg font-medium">{children}</dd>
    </div>
  );
}

export function SeriesDetail() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const validId = Number.isInteger(id) && id >= 0;
  const { address } = useWallet();

  const seriesQ = useQuery({ queryKey: ["series", id], queryFn: () => getSeries(id), enabled: validId });
  const burnQ = useQuery({ queryKey: ["burn-height"], queryFn: getBurnHeight, refetchInterval: 30_000 });
  const posQ = useQuery({
    queryKey: ["position", id, address],
    queryFn: () => getPosition(id, address!),
    enabled: validId && !!address,
  });

  // A bad URL (/app/series/abc) or an out-of-range id should read as not-found,
  // never a blank page.
  if (!validId || seriesQ.data === null) {
    return (
      <div className="space-y-4">
        <Link to="/app" className="inline-flex items-center gap-1 text-sm text-paper-dim hover:text-paper">
          <ArrowLeft size={14} aria-hidden /> Markets
        </Link>
        <div role="alert" className="rounded-[2px] border border-loss/40 bg-loss/10 px-4 py-3 text-sm">
          {validId
            ? `Series #${idParam} does not exist on this network.`
            : `"${idParam}" is not a valid series id.`}
        </div>
      </div>
    );
  }
  if (seriesQ.isLoading) return <div className="h-48 animate-pulse rounded-[2px] bg-ink-3" aria-label="Loading series" />;
  if (seriesQ.isError) {
    return (
      <div role="alert" className="rounded-[2px] border border-loss/40 bg-loss/10 px-4 py-3 text-sm">
        Could not load series #{idParam} from the chain.{" "}
        <button onClick={() => seriesQ.refetch()} className="cursor-pointer font-medium underline">
          Retry
        </button>
      </div>
    );
  }
  const s = seriesQ.data;
  if (!s) return null;
  const burn = burnQ.data ?? 0;
  const status = seriesStatus(s, burn);

  return (
    <div className="space-y-8">
      <Link to="/app" className="inline-flex items-center gap-1 text-sm text-paper-dim hover:text-paper">
        <ArrowLeft size={14} aria-hidden /> Markets
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold">
            #{s.id} {s.underlying}
          </h1>
          <StatusChip status={status} />
        </div>
        <p className="mt-3 max-w-[60ch] text-[15px] text-paper-dim">
          {s.isCall ? (
            <Term term="capped-call">Capped call</Term>
          ) : (
            <Term term="cash-secured-put">Cash-secured put</Term>
          )}{" "}
          settled in {s.asset === "sbtc" ? "sBTC" : "native STX"}. Writers lock{" "}
          {formatAmount(s.maxPayoff, s.asset)} per contract; the holder&apos;s payoff can never exceed that amount.
        </p>
      </div>

      <dl className="flex flex-col divide-y divide-rule border border-rule bg-ink-2 sm:flex-row sm:divide-x sm:divide-y-0">
        <Stat label="Strike">{formatAmount(s.strike, s.asset)}</Stat>
        <Stat label="Collateral / contract">{formatAmount(s.maxPayoff, s.asset)}</Stat>
        <Stat label="Expiry">
          {status === "active" && estimateExpiryDate(s.expiry, burn) ? (
            <>
              &asymp; {estimateExpiryDate(s.expiry, burn)}
              <span className="ml-2 text-xs text-paper-dim">block #{s.expiry.toLocaleString()}</span>
            </>
          ) : (
            <>#{s.expiry.toLocaleString()}</>
          )}
        </Stat>
        <Stat label={s.settled ? "Settlement price" : "Status"}>
          {s.settled ? formatAmount(s.settlementPrice, s.asset) : status === "expired" ? "Awaiting price" : "Trading"}
        </Stat>
      </dl>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          {status === "active" && <WritePanel series={s} />}
          {status === "active" && posQ.data && (
            <ClosePanel series={s} long={posQ.data.long} short={posQ.data.short} />
          )}
          {status === "expired" && (
            <section className="border border-rule bg-ink-2 p-5">
              <h2 className="font-display text-lg font-bold">Awaiting settlement</h2>
              <p className="mt-2 text-sm text-paper-dim">
                This series passed its expiry block. Once the settlement price is recorded,
                exercise and reclaim open here - with no deadline.
              </p>
              <SettleFromDia id={s.id} />
            </section>
          )}
          {status === "settled" && posQ.data && (
            <ClaimPanel series={s} long={posQ.data.long} short={posQ.data.short} />
          )}
          {status === "settled" && !address && (
            <section className="border border-rule bg-ink-2 p-5">
              <h2 className="font-display text-lg font-bold">Settlement claims</h2>
              <p className="mt-2 text-sm text-paper-dim">
                Connect your wallet to exercise options or reclaim collateral in this series.
              </p>
            </section>
          )}
          <OrderBook series={s} long={posQ.data?.long ?? 0n} status={status} />
        </div>

        <div className="space-y-6">
        <PayoffChart series={s} />
        <section aria-labelledby="your-position" className="h-fit rounded-[2px] bg-ink-2/60 p-5">
          <h2 id="your-position" className="text-sm font-semibold text-paper">Your position</h2>
          {!address && <p className="mt-2 text-sm text-paper-dim">Connect your wallet to see your position in this series.</p>}
          {address && posQ.isLoading && <div className="mt-3 h-8 animate-pulse rounded-[2px] bg-ink-3" />}
          {address && posQ.data && (
            <div className="mt-4 flex gap-10">
              <div>
                <div className="text-xs uppercase tracking-widest text-paper-dim">Long (options held)</div>
                <div className="tnum mt-1 text-xl font-medium">{posQ.data.long.toString()}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-paper-dim">Short (written)</div>
                <div className="tnum mt-1 text-xl font-medium">{posQ.data.short.toString()}</div>
              </div>
            </div>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}

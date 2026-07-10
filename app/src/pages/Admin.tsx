import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cl } from "@stacks/transactions";
import {
  CONTRACT_ID,
  DIA_CONTRACT,
  NETWORK,
  SETTLER_ID,
  explorerTxUrl,
  getAllSeries,
  getBalances,
  getBurnHeight,
  getConfig,
  getContractActivityDays,
  hasSettler,
  isValidPrincipal,
  seriesStatus,
  type ActivityItem,
  type Asset,
  type Series,
} from "../lib/contract";
import { formatAmount, shortAddress } from "../lib/format";
import { useWallet } from "../lib/wallet";
import { useTx } from "../lib/tx";
import { TxStatus } from "../components/TxStatus";
import { tokenArgFor } from "../components/WritePanel";
import { PageHeader } from "../components/PageHeader";
import { ActivityChart, type DayCount } from "../components/ActivityChart";
import { CornerOrnaments } from "../components/Guilloche";

/* ------------------------------------------------------------------ */
/* shared bits                                                         */
/* ------------------------------------------------------------------ */

function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["config"] });
    qc.invalidateQueries({ queryKey: ["series"] });
  };
}

const bigintOrNull = (s: string): bigint | null => {
  try {
    const n = BigInt(s);
    return n > 0n ? n : null;
  } catch {
    return null;
  }
};

function Panel({ title, children, sub, stamp = false }: { title: string; sub?: string; children: React.ReactNode; stamp?: boolean }) {
  return (
    <section aria-label={title} className="border border-rule bg-ink-2 p-5">
      <h2 className="flex items-center gap-2.5 font-display text-lg font-bold">
        {stamp && <span className="inline-block h-2.5 w-2.5 shrink-0 bg-seal" aria-hidden />}
        {title}
      </h2>
      {sub && <p className="mt-1 text-sm text-paper-dim">{sub}</p>}
      {children}
    </section>
  );
}

const inputCls =
  "tnum mt-1 w-full rounded-[2px] border border-rule bg-ink-3 px-3 py-2 text-sm text-paper placeholder:text-paper-dim focus:border-seal disabled:opacity-50";
const labelCls = "block text-xs text-paper-dim";
const sealBtn =
  "cursor-pointer rounded-[2px] bg-seal px-4 py-2.5 text-sm font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const ruleBtn =
  "cursor-pointer rounded-[2px] border border-rule px-4 py-2.5 text-sm font-bold text-paper transition duration-200 hover:bg-ink-3 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

/* ------------------------------------------------------------------ */
/* create series                                                       */
/* ------------------------------------------------------------------ */

function CreateSeries({ burnHeight }: { burnHeight: number }) {
  const [asset, setAsset] = useState<Asset>("stx");
  const [underlying, setUnderlying] = useState("");
  const [isCall, setIsCall] = useState(false);
  const [strikeStr, setStrikeStr] = useState("");
  const [capStr, setCapStr] = useState("");
  const [aheadStr, setAheadStr] = useState("2016"); // ~2 weeks of burn blocks
  const { state, run, reset } = useTx(useInvalidateAdmin());

  const strike = bigintOrNull(strikeStr);
  const maxPayoff = isCall ? bigintOrNull(capStr) : strike;
  const ahead = useMemo(() => {
    const n = Number(aheadStr);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [aheadStr]);
  const expiry = ahead !== null ? burnHeight + ahead : null;
  const eta =
    ahead === null
      ? null
      : ahead * 10 < 60
        ? `~${ahead * 10} min`
        : ahead * 10 < 60 * 24
          ? `~${Math.round((ahead * 10) / 60)} h`
          : `~${Math.round((ahead * 10) / 60 / 24)} days`;

  const valid =
    underlying.trim().length > 0 &&
    underlying.trim().length <= 16 &&
    /^[\x20-\x7E]+$/.test(underlying.trim()) &&
    strike !== null &&
    maxPayoff !== null &&
    ahead !== null;

  const busy = state.phase === "signing" || state.phase === "pending";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || strike === null || maxPayoff === null || expiry === null) return;
    const fakeSeries = { asset } as Series; // tokenArgFor only reads .asset
    run(
      "create-series",
      [
        tokenArgFor(fakeSeries),
        Cl.stringAscii(underlying.trim()),
        Cl.bool(isCall),
        Cl.uint(strike),
        Cl.uint(maxPayoff),
        Cl.uint(expiry),
      ],
      [] // no assets move on creation
    );
  };

  return (
    <Panel
      stamp
      title="Create series"
      sub="Curated in v1: only references with a reliable settlement price should be listed."
    >
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className={labelCls}>Collateral asset</legend>
            <div className="mt-1 flex gap-2">
              {(["stx", "sbtc"] as Asset[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAsset(a)}
                  aria-pressed={asset === a}
                  className={`cursor-pointer rounded-[2px] border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                    asset === a ? "border-seal bg-seal/10 text-paper" : "border-rule text-paper-dim hover:text-paper"
                  }`}
                >
                  {a === "stx" ? "Native STX" : "sBTC"}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className={labelCls}>Type</legend>
            <div className="mt-1 flex gap-2">
              {[
                { v: false, label: "Cash-secured put" },
                { v: true, label: "Capped call" },
              ].map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setIsCall(t.v)}
                  aria-pressed={isCall === t.v}
                  className={`cursor-pointer rounded-[2px] border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                    isCall === t.v ? "border-seal bg-seal/10 text-paper" : "border-rule text-paper-dim hover:text-paper"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cs-underlying" className={labelCls}>
              Underlying label (max 16 chars, e.g. STX-SBTC)
            </label>
            <input
              id="cs-underlying"
              value={underlying}
              onChange={(e) => setUnderlying(e.target.value)}
              maxLength={16}
              disabled={busy}
              className={inputCls}
              placeholder="STX-SBTC"
            />
            {underlying !== "" && !/^[\x20-\x7E]+$/.test(underlying.trim()) && (
              <p role="alert" className="mt-1 text-xs text-loss">
                Plain characters only (letters, digits, dashes) - this is stored on-chain as ASCII.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="cs-strike" className={labelCls}>
              Strike ({asset === "sbtc" ? "sats" : "uSTX"})
            </label>
            <input
              id="cs-strike"
              inputMode="numeric"
              value={strikeStr}
              onChange={(e) => setStrikeStr(e.target.value)}
              disabled={busy}
              className={inputCls}
              placeholder="1000000"
            />
            {strike !== null && <p className="mt-1 text-xs text-paper-dim">= {formatAmount(strike, asset)}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {isCall ? (
            <div>
              <label htmlFor="cs-cap" className={labelCls}>
                Max payoff above strike ({asset === "sbtc" ? "sats" : "uSTX"})
              </label>
              <input
                id="cs-cap"
                inputMode="numeric"
                value={capStr}
                onChange={(e) => setCapStr(e.target.value)}
                disabled={busy}
                className={inputCls}
                placeholder="500000"
              />
              {maxPayoff !== null && (
                <p className="mt-1 text-xs text-paper-dim">
                  writers lock {formatAmount(maxPayoff, asset)} per contract
                </p>
              )}
            </div>
          ) : (
            <div>
              <span className={labelCls}>Collateral per contract</span>
              <p className="tnum mt-2 text-sm">
                {strike !== null ? formatAmount(strike, asset) : "-"}{" "}
                <span className="text-xs text-paper-dim">(puts lock the strike, by rule)</span>
              </p>
            </div>
          )}
          <div>
            <label htmlFor="cs-ahead" className={labelCls}>
              Expiry (burn blocks from now)
            </label>
            <input
              id="cs-ahead"
              inputMode="numeric"
              value={aheadStr}
              onChange={(e) => setAheadStr(e.target.value)}
              disabled={busy}
              className={inputCls}
            />
            {expiry !== null && (
              <p className="mt-1 text-xs text-paper-dim">
                block #{expiry.toLocaleString()} ({eta})
              </p>
            )}
          </div>
        </div>

        <button type="submit" disabled={busy || !valid} className={sealBtn}>
          {busy ? "Waiting..." : "Create series"}
        </button>
      </form>
      <TxStatus state={state} onDismiss={reset} />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* settle                                                              */
/* ------------------------------------------------------------------ */

function Settle({ series, burnHeight, isOracle }: { series: Series[]; burnHeight: number; isOracle: boolean }) {
  const eligible = series.filter((s) => seriesStatus(s, burnHeight) === "expired");
  const [id, setId] = useState<number | null>(null);
  const [priceStr, setPriceStr] = useState("");
  const { state, run, reset } = useTx(useInvalidateAdmin());

  const chosen = eligible.find((s) => s.id === (id ?? eligible[0]?.id));
  const price = bigintOrNull(priceStr);
  const busy = state.phase === "signing" || state.phase === "pending";

  const submitDia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen) return;
    // permissionless: settler reads DIA and records the derived price on core
    run("settle-from-dia", [Cl.uint(chosen.id), Cl.principal(DIA_CONTRACT)], [], SETTLER_ID);
  };
  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen || price === null) return;
    run("settle", [Cl.uint(chosen.id), Cl.uint(price)], []);
  };

  const seriesSelect = (
    <div>
      <label htmlFor="settle-id" className={labelCls}>Series</label>
      <select
        id="settle-id"
        value={(id ?? eligible[0]?.id)?.toString()}
        onChange={(e) => setId(Number(e.target.value))}
        disabled={busy}
        className={inputCls + " w-52"}
      >
        {eligible.map((s) => (
          <option key={s.id} value={s.id}>
            #{s.id} {s.underlying}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <Panel
      title="Settle a series"
      sub={
        hasSettler
          ? "Permissionless: the settler reads DIA on-chain and records the derived price. No manual entry."
          : isOracle
            ? "Records the settlement price for an expired series. One price, once."
            : "The connected wallet is not the oracle - settlement calls will be rejected."
      }
    >
      {eligible.length === 0 ? (
        <p className="mt-3 border-t border-rule pt-3 text-sm text-paper-dim">No series awaiting settlement.</p>
      ) : hasSettler ? (
        <form onSubmit={submitDia} className="mt-4">
          <div className="flex flex-wrap items-end gap-3">
            {seriesSelect}
            <button type="submit" disabled={busy || !chosen} className={sealBtn}>
              {busy ? "Waiting..." : "Settle from DIA"}
            </button>
          </div>
          <p className="mt-2 text-xs text-paper-dim">
            Reads STX/USD and sBTC/USD from DIA and records the derived collateral-unit price on-chain.
          </p>
        </form>
      ) : (
        <form onSubmit={submitManual} className="mt-4 flex flex-wrap items-end gap-3">
          {seriesSelect}
          <div>
            <label htmlFor="settle-price" className={labelCls}>
              Settlement price ({chosen?.asset === "sbtc" ? "sats" : "uSTX"})
            </label>
            <input
              id="settle-price"
              inputMode="numeric"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              disabled={busy}
              className={inputCls + " w-44"}
            />
          </div>
          <button type="submit" disabled={busy || price === null || !chosen} className={sealBtn}>
            {busy ? "Waiting..." : "Settle"}
          </button>
        </form>
      )}
      <TxStatus state={state} onDismiss={reset} />
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* protocol controls                                                   */
/* ------------------------------------------------------------------ */

function Controls({ paused, openCreation, feeBps, feeRecipient, oracle }: { paused: boolean; openCreation: boolean; feeBps: number; feeRecipient: string; oracle: string }) {
  const pauseTx = useTx(useInvalidateAdmin());
  const openTx = useTx(useInvalidateAdmin());
  const feeTx = useTx(useInvalidateAdmin());
  const oracleTx = useTx(useInvalidateAdmin());
  const [bpsStr, setBpsStr] = useState(feeBps.toString());
  const [recipient, setRecipient] = useState(feeRecipient);
  // prefill with the configured settler when known - the go-live wiring target
  const [oracleStr, setOracleStr] = useState(hasSettler ? SETTLER_ID : oracle);

  const bps = useMemo(() => {
    const n = Number(bpsStr);
    return Number.isInteger(n) && n >= 0 && n <= 500 ? n : null;
  }, [bpsStr]);
  const recipientValid = isValidPrincipal(recipient);
  const oracleValid = isValidPrincipal(oracleStr);
  const oracleIsSettler = hasSettler && oracle === SETTLER_ID;

  const anyBusy = (s: { phase: string }) => s.phase === "signing" || s.phase === "pending";

  return (
    <Panel title="Protocol controls" sub="Owner-only switches. A pause never blocks exits.">
      <div className="mt-4 space-y-5">
        {/* settlement oracle: point core at the settler to enable permissionless DIA settlement */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!oracleValid) return;
            oracleTx.run("set-oracle", [Cl.principal(oracleStr.trim())], []);
          }}
          className="border-t border-rule pt-4"
        >
          <p className="text-sm font-medium">
            Settlement oracle {oracleIsSettler && <span className="text-gain">(settler wired)</span>}
          </p>
          <p className="text-xs text-paper-dim">
            Current: <span className="tnum">{shortAddress(oracle)}</span>. Point this at the settler to make
            settlement permissionless via DIA. Afterwards the operator can no longer settle manually - by design.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="grow">
              <label htmlFor="oracle-principal" className={labelCls}>
                Oracle contract
              </label>
              <input id="oracle-principal" value={oracleStr} onChange={(e) => setOracleStr(e.target.value)} className={inputCls} placeholder="ST3XC6....covault-settler" />
            </div>
            <button type="submit" disabled={anyBusy(oracleTx.state) || !oracleValid || oracleStr.trim() === oracle} className={ruleBtn}>
              {anyBusy(oracleTx.state) ? "Waiting..." : "Set oracle"}
            </button>
          </div>
          {oracleStr !== "" && !oracleValid && (
            <p role="alert" className="mt-1.5 text-xs text-loss">
              Not a valid Stacks contract principal (expected ST/SP....contract-name).
            </p>
          )}
          {hasSettler && !oracleIsSettler && oracleStr.trim() !== SETTLER_ID && (
            <button
              type="button"
              onClick={() => setOracleStr(SETTLER_ID)}
              className="mt-2 cursor-pointer text-xs text-seal-hi underline"
            >
              use the configured settler ({shortAddress(SETTLER_ID)})
            </button>
          )}
          <TxStatus state={oracleTx.state} onDismiss={oracleTx.reset} />
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          <div>
            <p className="text-sm font-medium">New writes: {paused ? "paused" : "open"}</p>
            <p className="text-xs text-paper-dim">Pausing blocks create-series and write-options only.</p>
          </div>
          <button
            onClick={() => pauseTx.run("set-paused", [Cl.bool(!paused)], [])}
            disabled={anyBusy(pauseTx.state)}
            className={paused ? sealBtn : ruleBtn}
          >
            {anyBusy(pauseTx.state) ? "Waiting..." : paused ? "Resume writes" : "Pause new writes"}
          </button>
        </div>
        <TxStatus state={pauseTx.state} onDismiss={pauseTx.reset} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
          <div>
            <p className="text-sm font-medium">Series creation: {openCreation ? "permissionless" : "curated (owner only)"}</p>
            <p className="text-xs text-paper-dim">Open it once settlement is trust-minimized.</p>
          </div>
          <button
            onClick={() => openTx.run("set-open-creation", [Cl.bool(!openCreation)], [])}
            disabled={anyBusy(openTx.state)}
            className={ruleBtn}
          >
            {anyBusy(openTx.state) ? "Waiting..." : openCreation ? "Restrict to owner" : "Open to everyone"}
          </button>
        </div>
        <TxStatus state={openTx.state} onDismiss={openTx.reset} />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (bps === null || !recipientValid) return;
            feeTx.run("set-fee", [Cl.uint(bps), Cl.principal(recipient.trim())], []);
          }}
          className="border-t border-rule pt-4"
        >
          <p className="text-sm font-medium">Taker fee</p>
          <p className="text-xs text-paper-dim">Basis points on order-book fills, capped at 500 (5%). Currently {feeBps} bps.</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="fee-bps" className={labelCls}>
                Fee (bps)
              </label>
              <input id="fee-bps" inputMode="numeric" value={bpsStr} onChange={(e) => setBpsStr(e.target.value)} className={inputCls + " w-28"} />
            </div>
            <div className="grow">
              <label htmlFor="fee-rcpt" className={labelCls}>
                Fee recipient
              </label>
              <input id="fee-rcpt" value={recipient} onChange={(e) => setRecipient(e.target.value)} className={inputCls} />
            </div>
            <button type="submit" disabled={anyBusy(feeTx.state) || bps === null || !recipientValid} className={ruleBtn}>
              {anyBusy(feeTx.state) ? "Waiting..." : "Update fee"}
            </button>
          </div>
          {bpsStr !== "" && bps === null && (
            <p role="alert" className="mt-1.5 text-xs text-loss">
              Fee must be a whole number of basis points between 0 and 500 (5%).
            </p>
          )}
          {recipient !== "" && !recipientValid && (
            <p role="alert" className="mt-1.5 text-xs text-loss">
              Not a valid Stacks address (expected ST... or SP..., optionally .contract-name).
            </p>
          )}
          <TxStatus state={feeTx.state} onDismiss={feeTx.reset} />
        </form>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* analytics - custody, activity over time, composition, and the feed  */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;
const RANGES = [14, 30, 90] as const;
type Range = (typeof RANGES)[number];

function bucketByDay(items: ActivityItem[], daysBack: number): DayCount[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = today.getTime() - (daysBack - 1) * DAY_MS;
  const out: DayCount[] = Array.from({ length: daysBack }, (_, i) => {
    const d = new Date(start + i * DAY_MS);
    return { label: `${d.getUTCDate()} ${d.toLocaleString("en", { month: "short", timeZone: "UTC" })}`, count: 0 };
  });
  for (const it of items) {
    const idx = Math.floor((it.time - start) / DAY_MS);
    if (idx >= 0 && idx < daysBack) out[idx].count++;
  }
  return out;
}

const timeFmt = new Intl.DateTimeFormat("en", {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});

/* 100%-composition bar in the conserved-sum motif: segments in validated
   categorical order (gold -> green -> seal -> neutral "Other"), 2px surface
   gaps, legend carries identity + values in text tokens - never color alone. */
interface Segment { label: string; value: number; color: string; note?: string }

function SplitBar({ title, segments, unit }: { title: string; segments: Segment[]; unit: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {total === 0 ? (
        <p className="mt-2 text-sm text-paper-dim">Nothing in this period.</p>
      ) : (
        <>
          <div className="mt-2 flex h-7 w-full gap-[2px] overflow-hidden rounded-[2px]" aria-hidden="true">
            {segments.filter((s) => s.value > 0).map((s) => (
              <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
            ))}
          </div>
          <ul className="mt-2.5 space-y-1.5">
            {segments.map((s) => (
              <li key={s.label} className="flex items-baseline justify-between gap-4 text-xs">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: s.color }} aria-hidden />
                  <span className="text-paper-dim">{s.label}</span>
                </span>
                <span className="tnum">
                  {s.value} {s.value === 1 ? unit.replace(/s$/, "") : unit}
                  {s.note && <span className="ml-1.5 text-paper-dim">({s.note})</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="sr-only">
            {title}: {segments.map((s) => `${s.label} ${s.value} ${unit}`).join(", ")}.
          </p>
        </>
      )}
    </div>
  );
}

const rangeChip = (on: boolean) =>
  `cursor-pointer rounded-[2px] border px-2.5 py-1 font-mono text-[11px] tracking-wider transition-colors duration-150 ${
    on ? "border-seal bg-seal/10 text-paper" : "border-rule text-paper-dim hover:text-paper"
  }`;

const TRADE_FNS = new Set(["list-offer", "fill-offer", "cancel-offer"]);
const SETTLE_FNS = new Set(["settle", "settle-from-dia", "exercise", "reclaim"]);

function Analytics() {
  const [range, setRange] = useState<Range>(14);
  const escrowQ = useQuery({ queryKey: ["escrow"], queryFn: () => getBalances(CONTRACT_ID), refetchInterval: 60_000 });
  const actQ = useQuery({
    queryKey: ["activity", range],
    queryFn: () => getContractActivityDays(range),
    refetchInterval: 60_000,
  });
  const seriesQ = useQuery({ queryKey: ["series"], queryFn: getAllSeries });

  const items = actQ.data;
  const participants = items ? new Set(items.map((a) => a.sender)).size : null;
  const days = items ? bucketByDay(items, range) : null;

  // contracts written per asset (counts are commensurable; native amounts in the legend)
  const byAsset = (() => {
    if (!items || !seriesQ.data) return null;
    const acc = {
      sbtc: { contracts: 0, collateral: 0n },
      stx: { contracts: 0, collateral: 0n },
    };
    for (const it of items) {
      if (it.fn !== "write-options" || it.status !== "success") continue;
      const id = Number((it.args[0] ?? "u").slice(1));
      const qty = Number((it.args[1] ?? "u").slice(1));
      const s = seriesQ.data.find((x) => x.id === id);
      if (!s || !Number.isFinite(qty)) continue;
      acc[s.asset].contracts += qty;
      acc[s.asset].collateral += BigInt(qty) * s.maxPayoff;
    }
    return acc;
  })();

  // call mix in validated order: gold (trades) -> green (writes) -> seal (settlements & claims) -> neutral
  const mix = (() => {
    if (!items) return null;
    const c = { trades: 0, writes: 0, settle: 0, other: 0 };
    for (const it of items) {
      if (TRADE_FNS.has(it.fn)) c.trades++;
      else if (it.fn === "write-options") c.writes++;
      else if (SETTLE_FNS.has(it.fn)) c.settle++;
      else c.other++;
    }
    return c;
  })();

  return (
    <Panel title="Analytics" sub="Custody and on-chain activity, read live. Nothing here is off-chain bookkeeping.">
      {/* custody + participation tiles */}
      <dl className="mt-4 flex flex-col divide-y divide-rule border border-rule bg-ink sm:flex-row sm:divide-x sm:divide-y-0">
        {[
          ["Escrow held (STX)", escrowQ.data ? formatAmount(escrowQ.data.stx, "stx") : "-"],
          ["Escrow held (sBTC)", escrowQ.data ? formatAmount(escrowQ.data.sbtc, "sbtc") : "-"],
          [`Transactions (${range}d)`, items ? items.length.toString() : "-"],
          [`Participants (${range}d)`, participants !== null ? participants.toString() : "-"],
        ].map(([label, value]) => (
          <div key={label} className="flex-1 px-4 py-3.5">
            <dt className="text-[11px] uppercase tracking-widest text-paper-dim">{label}</dt>
            <dd className="tnum mt-1.5 text-lg font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {/* one filter row governs everything below (chart, composition, feed) */}
      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Transactions per day</h3>
        <div className="flex gap-1.5" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} className={rangeChip(range === r)}>
              {r}d
            </button>
          ))}
        </div>
      </div>
      {actQ.isLoading && <div className="mt-3 h-40 animate-pulse rounded-[2px] bg-ink-3" />}
      {actQ.isError && (
        <p role="alert" className="mt-3 text-sm text-loss">
          Could not load activity.{" "}
          <button onClick={() => actQ.refetch()} className="cursor-pointer font-medium underline">Retry</button>
        </p>
      )}
      {days && <div className="mt-2"><ActivityChart days={days} /></div>}

      {/* composition - segmented bars in the conserved-sum motif */}
      {items && mix && (
        <div className="mt-6 grid gap-8 border-t border-rule pt-5 md:grid-cols-2">
          <SplitBar
            title={`Contracts written by asset (${range}d)`}
            unit="contracts"
            segments={[
              {
                label: "sBTC series",
                value: byAsset?.sbtc.contracts ?? 0,
                color: "var(--color-data-gold)",
                note: byAsset ? `${formatAmount(byAsset.sbtc.collateral, "sbtc")} locked` : undefined,
              },
              {
                label: "STX series",
                value: byAsset?.stx.contracts ?? 0,
                color: "var(--color-data)",
                note: byAsset ? `${formatAmount(byAsset.stx.collateral, "stx")} locked` : undefined,
              },
            ]}
          />
          <SplitBar
            title={`Call mix (${range}d)`}
            unit="calls"
            segments={[
              { label: "Trades (list / fill / cancel)", value: mix.trades, color: "var(--color-data-gold)" },
              { label: "Writes", value: mix.writes, color: "var(--color-data)" },
              { label: "Settlements & claims", value: mix.settle, color: "var(--color-seal)" },
              { label: "Other (series, admin)", value: mix.other, color: "var(--color-data-neutral)" },
            ]}
          />
        </div>
      )}

      {/* the feed - also the charts' table alternative */}
      {items && items.length > 0 && (
        <div className="mt-6 border-t border-rule pt-5">
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <div className="scroll-x mt-2 overflow-x-auto border-t-2 border-rule">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="sr-only">Recent contract transactions</caption>
              <thead>
                <tr className="text-[11px] uppercase tracking-widest text-paper-dim">
                  <th scope="col" className="py-2 pr-4 font-medium">Time</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Function</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Sender</th>
                  <th scope="col" className="py-2 text-right font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map((a) => (
                  <tr key={a.txid} className="border-t border-rule">
                    <td className="tnum py-2.5 pr-4 text-paper-dim">{timeFmt.format(a.time)}</td>
                    <td className="py-2.5 pr-4 font-mono text-[13px]">{a.fn}</td>
                    <td className="tnum py-2.5 pr-4 text-paper-dim">{shortAddress(a.sender)}</td>
                    <td className="py-2.5 text-right">
                      <a
                        href={explorerTxUrl(a.txid)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-seal-hi underline decoration-rule underline-offset-4 transition-colors duration-150 hover:text-seal"
                      >
                        view
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export function Admin() {
  const { address } = useWallet();
  const configQ = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const seriesQ = useQuery({ queryKey: ["series"], queryFn: getAllSeries });
  const burnQ = useQuery({ queryKey: ["burn-height"], queryFn: getBurnHeight, refetchInterval: 30_000 });

  const cfg = configQ.data;
  const isOwner = !!address && !!cfg && address === cfg.owner;

  if (configQ.isLoading) return <div className="h-40 animate-pulse rounded-[2px] bg-ink-3" aria-label="Loading" />;

  // A network failure must not masquerade as an authorization failure.
  if (configQ.isError) {
    return (
      <div role="alert" className="rounded-[2px] border border-loss/40 bg-loss/10 px-4 py-3 text-sm">
        Could not load the protocol configuration from the chain.{" "}
        <button onClick={() => configQ.refetch()} className="cursor-pointer font-medium underline">
          Retry
        </button>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-xl border border-rule bg-ink-2 px-6 py-14 text-center">
        <h1 className="font-display text-xl font-bold">Operator panel</h1>
        <p className="mt-3 text-sm text-paper-dim">
          {address
            ? `The connected wallet (${shortAddress(address)}) is not the contract owner.`
            : "Connect the contract owner's wallet to manage series, settlement, and protocol switches."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operator panel"
        description="Curate series, record settlements, and run the protocol switches."
        meta={
          <div className="flex flex-col items-end gap-1 font-mono text-[11px] text-paper-dim">
            <span>owner <span className="tnum text-paper">{shortAddress(cfg.owner)}</span></span>
            <span>oracle <span className="tnum text-paper">{shortAddress(cfg.oracle)}</span></span>
          </div>
        }
      />

      {/* protocol telemetry - operator data, deliberately not on the landing page */}
      <div className="relative">
        <CornerOrnaments />
        <dl className="flex flex-col divide-y divide-rule border border-rule bg-ink-2 sm:flex-row sm:divide-x sm:divide-y-0">
        {[
          ["Option series", cfg.seriesCount.toString()],
          ["Settled", (seriesQ.data ? seriesQ.data.filter((s) => s.settled).length : "-").toString()],
          ["Open offers", cfg.offerCount.toString()],
          ["Burn height", burnQ.data ? `#${burnQ.data.toLocaleString()}` : "-"],
        ].map(([label, value]) => (
          <div key={label} className="flex-1 px-4 py-3.5">
            <dt className="text-[11px] uppercase tracking-widest text-paper-dim">{label}</dt>
            <dd className="tnum mt-1.5 text-lg font-medium">{value}</dd>
          </div>
        ))}
        <div className="flex-1 px-4 py-3.5">
          <dt className="text-[11px] uppercase tracking-widest text-paper-dim">Contract</dt>
          <dd className="mt-1.5 text-lg">
            <a
              href={`https://explorer.hiro.so/txid/${CONTRACT_ID}?chain=${NETWORK}`}
              target="_blank"
              rel="noreferrer"
              className="tnum text-seal-hi underline decoration-rule underline-offset-4 transition-colors duration-150 hover:text-seal"
            >
              explorer
            </a>
          </dd>
        </div>
      </dl>
      </div>

      <Analytics />
      <CreateSeries burnHeight={burnQ.data ?? 0} />
      <Settle series={seriesQ.data ?? []} burnHeight={burnQ.data ?? 0} isOracle={address === cfg.oracle} />
      <Controls paused={cfg.paused} openCreation={cfg.openCreation} feeBps={cfg.feeBps} feeRecipient={cfg.feeRecipient} oracle={cfg.oracle} />
    </div>
  );
}

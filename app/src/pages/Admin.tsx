import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cl } from "@stacks/transactions";
import {
  getAllSeries,
  getBurnHeight,
  getConfig,
  isValidPrincipal,
  seriesStatus,
  type Asset,
  type Series,
} from "../lib/contract";
import { formatAmount, shortAddress } from "../lib/format";
import { useWallet } from "../lib/wallet";
import { useTx } from "../lib/tx";
import { TxStatus } from "../components/TxStatus";
import { tokenArgFor } from "../components/WritePanel";

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

function Panel({ title, children, sub }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="border border-rule bg-ink-2 p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-paper-dim">{sub}</p>}
      {children}
    </section>
  );
}

const inputCls =
  "tnum mt-1 w-full rounded-[2px] border border-rule bg-ink-3 px-3 py-2 text-sm text-paper placeholder:text-paper-dim focus:border-seal disabled:opacity-50";
const labelCls = "block text-xs text-paper-dim";
const sealBtn =
  "cursor-pointer rounded-[2px] bg-seal px-4 py-2.5 text-sm font-bold text-on-seal transition-colors duration-200 hover:bg-seal-hi disabled:cursor-not-allowed disabled:opacity-50";
const ruleBtn =
  "cursor-pointer rounded-[2px] border border-rule px-4 py-2.5 text-sm font-bold text-paper transition-colors duration-200 hover:bg-ink-3 disabled:cursor-not-allowed disabled:opacity-50";

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen || price === null) return;
    run("settle", [Cl.uint(chosen.id), Cl.uint(price)], []);
  };

  return (
    <Panel
      title="Settle a series"
      sub={
        isOracle
          ? "Records the settlement price for an expired series. One price, once."
          : "The connected wallet is not the oracle - settlement calls will be rejected."
      }
    >
      {eligible.length === 0 ? (
        <p className="mt-3 border-t border-rule pt-3 text-sm text-paper-dim">
          No series awaiting settlement.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="settle-id" className={labelCls}>
              Series
            </label>
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

function Controls({ paused, openCreation, feeBps, feeRecipient }: { paused: boolean; openCreation: boolean; feeBps: number; feeRecipient: string }) {
  const pauseTx = useTx(useInvalidateAdmin());
  const openTx = useTx(useInvalidateAdmin());
  const feeTx = useTx(useInvalidateAdmin());
  const [bpsStr, setBpsStr] = useState(feeBps.toString());
  const [recipient, setRecipient] = useState(feeRecipient);

  const bps = useMemo(() => {
    const n = Number(bpsStr);
    return Number.isInteger(n) && n >= 0 && n <= 500 ? n : null;
  }, [bpsStr]);
  const recipientValid = isValidPrincipal(recipient);

  const anyBusy = (s: { phase: string }) => s.phase === "signing" || s.phase === "pending";

  return (
    <Panel title="Protocol controls" sub="Owner-only switches. A pause never blocks exits.">
      <div className="mt-4 space-y-5">
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
      <div>
        <h1 className="font-display text-3xl font-bold">Operator panel</h1>
        <p className="mt-2 text-[15px] text-paper-dim">
          Owner: <span className="tnum">{shortAddress(cfg.owner)}</span> - Oracle:{" "}
          <span className="tnum">{shortAddress(cfg.oracle)}</span>
        </p>
      </div>
      <CreateSeries burnHeight={burnQ.data ?? 0} />
      <Settle series={seriesQ.data ?? []} burnHeight={burnQ.data ?? 0} isOracle={address === cfg.oracle} />
      <Controls paused={cfg.paused} openCreation={cfg.openCreation} feeBps={cfg.feeBps} feeRecipient={cfg.feeRecipient} />
    </div>
  );
}

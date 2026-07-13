import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { explorerAddressUrl, getBalances, type Asset } from "../lib/contract";
import { assetSymbol, formatAmount, shortAddress } from "../lib/format";
import { useWallet } from "../lib/wallet";

/* Compact figures for the header plate: the summary at a glance, exact figures
   live in the panel. sBTC to 4dp trimmed, STX to whole coins. */
function compactAmount(raw: bigint, asset: Asset): string {
  if (asset === "stx") {
    return `${(raw / 1_000_000n).toLocaleString()} STX`;
  }
  const sats = Number(raw) / 1e8;
  const s = sats >= 1 ? sats.toFixed(2) : sats.toFixed(4);
  return `${s.replace(/\.?0+$/, "")} sBTC`;
}

function BalanceRow({ asset, value }: { asset: Asset; value: bigint }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-rule py-2.5">
      <dt className="text-sm text-paper-dim">{assetSymbol(asset)}</dt>
      <dd className="tnum text-right text-sm">{formatAmount(value, asset, { withUnit: false })}</dd>
    </div>
  );
}

/** The treasury plate: connected wallet as a ledger entry, not an afterthought.
    Trigger shows live balances + address; the panel carries the full address
    (copyable), exact balances, an explorer link, and disconnect. */
function ConnectedPlate({ address, onDisconnect }: { address: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Same cache the write-panel preflight uses; one source of balance truth.
  const balancesQ = useQuery({
    queryKey: ["balances", address],
    queryFn: () => getBalances(address),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch {
      /* clipboard unavailable: the full address is visible to select manually */
    }
  };

  const b = balancesQ.data;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="group flex cursor-pointer items-center gap-2.5 rounded-[2px] border border-rule bg-ink-2 px-3 py-1.5 text-sm transition-colors duration-200 hover:bg-ink-3"
      >
        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gain" aria-hidden />
        <span className="sr-only">Wallet connected.</span>
        {b && (
          <>
            <span className="tnum hidden whitespace-nowrap text-paper md:inline">
              {compactAmount(b.sbtc, "sbtc")}
              <span className="mx-1.5 text-paper-dim">&middot;</span>
              {compactAmount(b.stx, "stx")}
            </span>
            <span className="hidden h-3.5 w-px bg-rule md:block" aria-hidden />
          </>
        )}
        <span className="tnum text-paper-dim transition-colors duration-200 group-hover:text-paper">
          {shortAddress(address)}
        </span>
        <ChevronDown
          size={14}
          aria-hidden
          className={`text-paper-dim transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Wallet"
          className="anim-pop absolute right-0 top-full z-20 mt-2 w-72 border border-rule bg-ink-2 p-4 shadow-[0_2px_0_var(--color-ink)]"
        >
          <p className="font-mono text-[11px] uppercase tracking-widest text-paper-dim">Connected</p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="tnum break-all text-sm text-paper">{shortAddress(address)}</span>
            <button
              onClick={copy}
              className="flex cursor-pointer items-center gap-1.5 rounded-[2px] border border-rule px-2 py-1 text-xs text-paper-dim transition-colors duration-200 hover:bg-ink-3 hover:text-paper"
            >
              {copied ? <Check size={13} aria-hidden className="text-gain" /> : <Copy size={13} aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p aria-live="polite" className="sr-only">
            {copied ? "Address copied to clipboard." : ""}
          </p>

          <dl className="mt-4">
            {balancesQ.isLoading && (
              <div className="border-t border-rule py-2.5">
                <div className="h-5 animate-pulse rounded-[2px] bg-ink-3" />
              </div>
            )}
            {balancesQ.isError && (
              <p className="border-t border-rule py-2.5 text-xs text-loss">
                Could not load balances.{" "}
                <button onClick={() => balancesQ.refetch()} className="cursor-pointer font-medium underline">
                  Retry
                </button>
              </p>
            )}
            {b && (
              <>
                <BalanceRow asset="sbtc" value={b.sbtc} />
                <BalanceRow asset="stx" value={b.stx} />
              </>
            )}
          </dl>
          <p className="mt-1 text-xs text-paper-dim">Available to lock as collateral.</p>

          <a
            href={explorerAddressUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-1.5 border-t border-rule pt-3 text-sm text-paper-dim transition-colors duration-200 hover:text-paper"
          >
            View address on explorer <ExternalLink size={13} aria-hidden />
          </a>

          <button
            onClick={() => {
              setOpen(false);
              onDisconnect();
            }}
            className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-[2px] border border-rule px-3 py-2 text-sm font-medium text-paper-dim transition-colors duration-200 hover:bg-ink-3 hover:text-paper"
          >
            <LogOut size={14} aria-hidden /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function WalletButton() {
  const { address, connecting, connect, disconnect } = useWallet();

  if (address) {
    return <ConnectedPlate address={address} onDisconnect={disconnect} />;
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-[2px] bg-seal px-4 py-2 text-sm font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98] disabled:opacity-50"
    >
      <Wallet size={16} aria-hidden />
      {connecting ? "Connecting..." : "Connect wallet"}
    </button>
  );
}

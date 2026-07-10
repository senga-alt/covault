import { useEffect, useRef, useState } from "react";

/**
 * The invariant, animated and interactive: pick the asset (STX / sBTC) and the
 * instrument (cash-secured put / capped call); a settlement price sweeps the
 * payoff curve while holder/writer figures recompute live - always summing
 * exactly to the locked collateral. Market-sized figures, the same formula the
 * contract runs. Pauses offscreen; static settled state under reduced motion.
 */

type Asset = "stx" | "sbtc";
type Kind = "put" | "call";

const CFG = {
  stx: {
    label: "STX",
    strike: 100_000_000, // 100 STX
    capCall: 50_000_000, // call cap +50 STX
    f: (u: number) => {
      const v = u / 1e6;
      return v >= 10 ? v.toFixed(1).replace(/\.0$/, "") : v.toFixed(2);
    },
  },
  sbtc: {
    label: "sBTC",
    strike: 5_000_000, // 0.05 sBTC
    capCall: 2_500_000, // call cap +0.025 sBTC
    f: (u: number) => (u / 1e8).toFixed(4).replace(/0+$/, "").replace(/\.$/, ""),
  },
} as const;

const W = 460;
const H = 168;
const PAD = { l: 14, r: 14, t: 20, b: 26 };

function geometry(asset: Asset, kind: Kind) {
  const c = CFG[asset];
  const K = c.strike;
  const cap = kind === "put" ? K : c.capCall;
  const domainMax = kind === "put" ? K * 1.5 : (K + cap) * 1.22;
  const x = (p: number) => PAD.l + (p / domainMax) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / (cap * 1.18)) * (H - PAD.t - PAD.b);
  const curve =
    kind === "put"
      ? `M${x(0)},${y(cap)} L${x(K)},${y(0)} L${x(domainMax)},${y(0)}`
      : `M${x(0)},${y(0)} L${x(K)},${y(0)} L${x(K + cap)},${y(cap)} L${x(domainMax)},${y(cap)}`;
  const sweep: [number, number] =
    kind === "put" ? [K * 0.34, K * 1.42] : [K * 0.62, Math.min(domainMax * 0.96, (K + cap) * 1.14)];
  const staticS = kind === "put" ? K * 0.6 : K + cap * 0.6;
  const payoffAt = (s: number) =>
    kind === "put" ? Math.min(Math.max(K - s, 0), cap) : Math.min(Math.max(s - K, 0), cap);
  return { K, cap, domainMax, x, y, curve, sweep, staticS, payoffAt };
}

const toggleCls = (on: boolean) =>
  `cursor-pointer rounded-[2px] border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors duration-150 ${
    on ? "border-seal bg-seal/10 text-paper" : "border-rule text-paper-dim hover:text-paper"
  }`;

export function PayoffDemo() {
  const [asset, setAsset] = useState<Asset>("sbtc");
  const [kind, setKind] = useState<Kind>("put");
  const g = geometry(asset, kind);
  const [s, setS] = useState(g.staticS);

  // rAF reads current config through a ref so toggles retarget the sweep live
  const gRef = useRef(g);
  gRef.current = g;

  useEffect(() => {
    const reduce =
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setS(g.staticS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, kind]);

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    let raf = 0;
    let running = false;
    const tick = (t: number) => {
      const [lo, hi] = gRef.current.sweep;
      const phase = (t / 9000) * Math.PI * 2;
      setS(Math.round((lo + hi) / 2 + ((hi - lo) / 2) * Math.sin(phase)));
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const c = CFG[asset];
  const sc = Math.min(s, g.domainMax); // clamp marker when toggling shrinks the domain
  const payoff = g.payoffAt(sc);
  const leftover = g.cap - payoff;
  const itm = payoff > 0;
  const pct = (payoff / g.cap) * 100;

  return (
    <figure ref={rootRef} className="relative m-0" aria-label="Animated example: how settlement pays">
      <div className="relative border border-rule bg-ink-2 p-4 shadow-[0_18px_54px_-24px_rgba(0,0,0,0.85)]">
        <span className="font-display text-base font-bold">How settlement pays</span>
        <div className="mt-2.5 flex flex-wrap items-center gap-3" role="group" aria-label="Example configuration">
          <div className="flex gap-1.5">
            <button type="button" aria-pressed={asset === "sbtc"} onClick={() => setAsset("sbtc")} className={toggleCls(asset === "sbtc")}>
              sBTC
            </button>
            <button type="button" aria-pressed={asset === "stx"} onClick={() => setAsset("stx")} className={toggleCls(asset === "stx")}>
              STX
            </button>
          </div>
          <span className="h-4 w-px bg-rule" aria-hidden />
          <div className="flex gap-1.5">
            <button type="button" aria-pressed={kind === "put"} onClick={() => setKind("put")} className={toggleCls(kind === "put")}>
              Put
            </button>
            <button type="button" aria-pressed={kind === "call"} onClick={() => setKind("call")} className={toggleCls(kind === "call")}>
              Call
            </button>
          </div>
        </div>
        <p className="tnum mt-2.5 text-xs text-paper-dim">
          {kind === "put"
            ? `Cash-secured put - strike ${c.f(g.K)} ${c.label}, ${c.f(g.cap)} ${c.label} locked`
            : `Capped call - strike ${c.f(g.K)} ${c.label}, cap +${c.f(g.cap)} ${c.label} locked`}
        </p>

        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" aria-hidden="true">
          <line x1={PAD.l} y1={g.y(0)} x2={W - PAD.r} y2={g.y(0)} stroke="var(--color-rule)" strokeWidth="1" />
          <line
            x1={g.x(g.K)} y1={PAD.t} x2={g.x(g.K)} y2={g.y(0)}
            stroke="var(--color-gilt)" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.45"
          />
          <text x={g.x(g.K)} y={H - 10} textAnchor="middle" fontSize="10" fontFamily="var(--font-mono)" className="fill-[var(--color-paper-dim)]">
            strike {c.f(g.K)}
          </text>

          <path
            d={`${g.curve} L${g.x(g.domainMax)},${g.y(0)} L${g.x(0)},${g.y(0)} Z`}
            fill="var(--color-gain)"
            opacity="0.07"
          />
          <path d={g.curve} fill="none" stroke="var(--color-gain)" strokeWidth="1.75" />

          <line x1={g.x(sc)} y1={PAD.t} x2={g.x(sc)} y2={g.y(0)} stroke="var(--color-seal)" strokeWidth="1" />
          <circle cx={g.x(sc)} cy={g.y(payoff)} r="4" fill="var(--color-seal)" />
          <text
            x={g.x(sc)} y={PAD.t - 8}
            textAnchor="middle" dominantBaseline="hanging"
            fontSize="10" fontFamily="var(--font-mono)"
            className="fill-[var(--color-seal)]"
          >
            settles {c.f(sc)}
          </text>
        </svg>

        <dl className="tnum mt-3 grid grid-cols-2 gap-3 border-t border-rule pt-3 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-paper-dim">Holder is paid</dt>
            <dd className={`mt-0.5 text-lg font-medium ${itm ? "text-gain" : "text-paper-dim"}`}>
              {c.f(payoff)} {c.label}
            </dd>
          </div>
          <div className="text-right">
            <dt className="text-[11px] uppercase tracking-widest text-paper-dim">Writer reclaims</dt>
            <dd className="mt-0.5 text-lg font-medium">
              {c.f(leftover)} {c.label}
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex h-8 w-full overflow-hidden rounded-[2px] border border-rule" aria-hidden="true">
          <div className="bg-gain/25" style={{ width: `${pct}%` }} />
          <div className="grow bg-ink-3" style={{ borderLeft: pct > 0 && pct < 100 ? "1px solid var(--color-rule)" : "none" }} />
        </div>
        <p className="tnum mt-2 text-center text-xs text-paper-dim">
          payoff + leftover <span className="text-seal">=</span> {c.f(g.cap)} {c.label} collateral, always
        </p>
      </div>
      <figcaption className="sr-only">The same math the contract runs at settlement</figcaption>
    </figure>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { PayoffChart } from "./PayoffChart";
import { CornerOrnaments, GuillocheRosette, SectionMark } from "./Guilloche";
import { Reveal } from "./Reveal";
import type { Series } from "../lib/series";

/* Market-sized settled puts in both assets - the whole showcase cycles
   between them in sync, so every figure demonstrates sBTC and STX. */
type ShowAsset = "sbtc" | "stx";

const DEMO: Record<ShowAsset, Series> = {
  sbtc: {
    id: 0, creator: "", asset: "sbtc", quoteToken: null, underlying: "SBTC-USD",
    isCall: false, strike: 5_000_000n, maxPayoff: 5_000_000n, expiry: 0,
    settled: true, settlementPrice: 3_000_000n, // 0.05 strike, settled 0.03
  },
  stx: {
    id: 0, creator: "", asset: "stx", quoteToken: null, underlying: "STX-USD",
    isCall: false, strike: 100_000_000n, maxPayoff: 100_000_000n, expiry: 0,
    settled: true, settlementPrice: 60_000_000n, // 100 strike, settled 60
  },
};

/* ------------------------------------------------------------------ */
/* ambient helpers - plates behave, but only in view and only when     */
/* motion is welcome                                                   */
/* ------------------------------------------------------------------ */

const motionAllowed = () =>
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Runs `step` on an interval only while the returned ref is on screen. */
function useAmbient<T extends HTMLElement>(step: () => void, ms: number) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motionAllowed()) return;
    let id: number | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && id === undefined) id = window.setInterval(step, ms);
      else if (!e.isIntersecting && id !== undefined) {
        clearInterval(id);
        id = undefined;
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      if (id !== undefined) clearInterval(id);
    };
  }, [step, ms]);
  return ref;
}

/** Mounts children the first time they scroll into view, so entrance
    animations - like the payoff curve drawing itself - actually play. */
function InView({ children, minHeight }: { children: React.ReactNode; minHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!motionAllowed()) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ minHeight: shown ? undefined : minHeight }}>
      {shown && children}
    </div>
  );
}

/* An engraved "plate": the framing that makes a screenshot read as a certificate
   figure rather than a bare card. */
function Plate({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="relative m-0">
      <div className="relative border border-rule bg-ink-2 p-4 shadow-[0_18px_54px_-24px_rgba(0,0,0,0.85)]">
        <CornerOrnaments />
        {children}
      </div>
      <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-widest text-paper-dim">
        {label}
      </figcaption>
    </figure>
  );
}

const ledgerRow = "flex items-baseline justify-between gap-6 border-t border-rule py-2 text-sm";

/* The risk ledger, recomputing itself: the contract count cycles and every
   dependent figure updates live - "risk before action" as behavior. */
const QTYS = [2, 5, 8];
// per-contract collateral: 0.05 sBTC or 100 STX
const amt = (asset: ShowAsset, q: number) =>
  asset === "sbtc" ? `${((q * 5) / 100).toString()} sBTC` : `${q * 100} STX`;

function WriteLedgerMock({ asset }: { asset: ShowAsset }) {
  const [i, setI] = useState(1);
  const step = useCallback(() => setI((v) => (v + 1) % QTYS.length), []);
  const ref = useAmbient<HTMLDivElement>(step, 2600);
  const q = QTYS[i];

  const V = ({ children }: { children: React.ReactNode }) => (
    <span key={`${asset}-${q}`} className="anim-tick inline-block">
      {children}
    </span>
  );

  return (
    <div ref={ref}>
      <p className="font-display text-base font-bold">Write options</p>
      <div className="mt-3">
        <span className="block text-xs text-paper-dim">Contracts to write</span>
        <div className="tnum mt-1 w-28 rounded-[2px] border border-rule bg-ink-3 px-3 py-2 text-sm">
          <V>{q}</V>
        </div>
      </div>
      <dl className="mt-4">
        <div className={ledgerRow}>
          <dt className="text-paper-dim">You lock now (collateral)</dt>
          <dd className="tnum font-medium"><V>{amt(asset, q)}</V></dd>
        </div>
        <div className={ledgerRow}>
          <dt className="text-paper-dim">You receive</dt>
          <dd className="tnum"><V>{q} long + {q} short</V></dd>
        </div>
        <div className={ledgerRow}>
          <dt className="text-paper-dim">Maximum the holder can be paid</dt>
          <dd className="tnum"><V>{amt(asset, q)}</V></dd>
        </div>
        <div className={ledgerRow}>
          <dt className="text-paper-dim">Your maximum loss</dt>
          <dd className="tnum text-loss"><V>{amt(asset, q)} less premium</V></dd>
        </div>
      </dl>
      <div className="mt-4 rounded-[2px] bg-seal px-5 py-2.5 text-center text-sm font-bold text-on-seal">
        <V>Lock {amt(asset, q)} and write</V>
      </div>
      <p className="mt-2 text-center text-xs text-paper-dim">
        Protected by a post-condition: exactly this amount, nothing else.
      </p>
    </div>
  );
}

/* The order book, trading: the top offer fills down and fresh listings arrive.
   Premiums are quoted in the showcase's current asset. */
interface MockOffer {
  id: number;
  qty: number;
  price: number; // premium per contract, in asset minor display units
}
const BOOK = {
  stx: { prices: [450, 520, 410, 480], fmt: (p: number) => `${(p / 100).toFixed(2)} STX` },
  sbtc: { prices: [25, 32, 21, 28], fmt: (p: number) => `${(p / 10000).toFixed(4)} sBTC` },
} as const;

function OrderBookMock({ asset }: { asset: ShowAsset }) {
  const book = BOOK[asset];
  const [offers, setOffers] = useState<MockOffer[]>([
    { id: 0, qty: 3, price: book.prices[0] },
    { id: 1, qty: 2, price: book.prices[1] },
  ]);
  const [flash, setFlash] = useState<number | null>(null);
  const nextId = useRef(2);

  // fresh book whenever the showcase flips asset
  useEffect(() => {
    setOffers([
      { id: nextId.current++, qty: 3, price: book.prices[0] },
      { id: nextId.current++, qty: 2, price: book.prices[1] },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  const step = useCallback(() => {
    setOffers((prev) => {
      const [head, ...rest] = prev;
      if (!head) return prev;
      setFlash(head.id);
      window.setTimeout(() => setFlash(null), 600);
      if (head.qty <= 1) {
        const id = nextId.current++;
        return [...rest, { id, qty: 3, price: book.prices[id % book.prices.length] }];
      }
      return [{ ...head, qty: head.qty - 1 }, ...rest];
    });
  }, [book]);
  const ref = useAmbient<HTMLDivElement>(step, 2200);

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between">
        <p className="font-display text-base font-bold">Order book</p>
        <span className="text-[11px] text-paper-dim">no protocol fee</span>
      </div>
      <ul key={asset} className="anim-tick mt-3">
        {offers.map((o) => (
          <li
            key={o.id}
            className={`flex items-center justify-between gap-3 border-t border-rule py-2.5 text-sm transition-colors duration-500 ${
              flash === o.id ? "bg-seal/10" : ""
            }`}
          >
            <span>
              <span className="tnum">{o.qty}</span>
              <span className="text-paper-dim"> @ </span>
              <span className="tnum">{book.fmt(o.price)}</span>
              <span className="ml-1.5 text-[11px] text-paper-dim">premium</span>
            </span>
            <span className="rounded-[2px] bg-seal px-3 py-1.5 text-xs font-bold text-on-seal">
              Buy for {book.fmt(o.qty * o.price)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-rule pt-3 text-xs text-paper-dim">
        Sell your options - listed longs are escrowed until bought or cancelled.
      </div>
    </div>
  );
}

function Row({
  reverse,
  eyebrow,
  title,
  body,
  plate,
}: {
  reverse?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  plate: React.ReactNode;
}) {
  return (
    <Reveal className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <div className={reverse ? "md:order-2" : ""}>
        <p className="font-display text-sm font-bold text-seal">{eyebrow}</p>
        <h3 className="mt-3 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold">{title}</h3>
        <p className="mt-4 max-w-[52ch] text-paper-dim">{body}</p>
      </div>
      <div className={reverse ? "md:order-1" : ""}>{plate}</div>
    </Reveal>
  );
}

export function ProductShowcase() {
  const [asset, setAsset] = useState<ShowAsset>("sbtc");
  const flip = useCallback(() => setAsset((a) => (a === "sbtc" ? "stx" : "sbtc")), []);
  const cycleRef = useAmbient<HTMLDivElement>(flip, 7200);
  return (
    <section aria-labelledby="showcase" className="relative border-t border-rule">
      <GuillocheRosette className="pointer-events-none absolute right-6 top-16 hidden h-32 w-32 opacity-30 lg:block" />
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <SectionMark />
        <h2 id="showcase" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
          The whole instrument, on one screen
        </h2>
        <p className="mt-5 max-w-[62ch] text-paper-dim">
          No dashboards to decode. Every series shows what you lock, what you can be paid, and the
          exact shape of the payoff - before you ever sign.
        </p>

        <div ref={cycleRef} className="mt-16 space-y-20 md:space-y-28">
          <Row
            eyebrow="Figure I"
            title="Read your risk to the unit"
            body="Writing an option shows the collateral you lock, the positions you receive, and your maximum loss in figures - then binds the transaction to that exact amount with a post-condition. No surprises reach your wallet."
            plate={<Plate label={`Writing a cash-secured ${asset === "sbtc" ? "sBTC" : "STX"} put`}><WriteLedgerMock asset={asset} /></Plate>}
          />
          <Row
            reverse
            eyebrow="Figure II"
            title="Every outcome, drawn in advance"
            body="The payoff curve is computed from the contract, not illustrated. Strike, cap, and - once settled - the exact settlement price and what each side is owed, to the smallest unit."
            plate={
              <div className="relative shadow-[0_18px_54px_-24px_rgba(0,0,0,0.85)]">
                <CornerOrnaments />
                <InView minHeight={300}>
                  <PayoffChart key={asset} series={DEMO[asset]} />
                </InView>
              </div>
            }
          />
          <Row
            eyebrow="Figure III"
            title="A market, not a middleman"
            body="List your options for premium and let anyone fill them, or buy directly from the on-chain order book. Peer to peer, partial fills, and a fee that stays off until there is usage to justify it."
            plate={<Plate label={`Trading ${asset === "sbtc" ? "sBTC" : "STX"} options on the order book`}><OrderBookMock asset={asset} /></Plate>}
          />
        </div>
      </div>
    </section>
  );
}

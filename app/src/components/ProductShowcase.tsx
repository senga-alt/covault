import { PayoffChart } from "./PayoffChart";
import { CornerOrnaments, GuillocheRosette } from "./Guilloche";
import type { Series } from "../lib/contract";

/* A settled STX put - the same instrument the live demo produced. Drives the
   real PayoffChart component, so the landing shows the actual interface. */
const DEMO_SERIES: Series = {
  id: 0,
  creator: "",
  asset: "stx",
  quoteToken: null,
  underlying: "STX-USD",
  isCall: false,
  strike: 1_000_000n,
  maxPayoff: 1_000_000n,
  expiry: 0,
  settled: true,
  settlementPrice: 600_000n,
};

/* An engraved "plate": the framing that makes a screenshot read as a certificate
   figure rather than a bare card. */
function Plate({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="relative m-0">
      <div className="relative border border-rule bg-ink-2 p-4 shadow-[0_1px_0_0_var(--color-rule)]">
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

/* Faithful static replica of WritePanel's risk ledger - presentational only. */
function WriteLedgerMock() {
  return (
    <div>
      <p className="font-display text-base font-bold">Write options</p>
      <div className="mt-3">
        <span className="block text-xs text-paper-dim">Contracts to write</span>
        <div className="tnum mt-1 w-28 rounded-[2px] border border-rule bg-ink-3 px-3 py-2 text-sm">5</div>
      </div>
      <dl className="mt-4">
        <div className={ledgerRow}>
          <dt className="text-paper-dim">You lock now (collateral)</dt>
          <dd className="tnum font-medium">5 STX</dd>
        </div>
        <div className={ledgerRow}>
          <dt className="text-paper-dim">You receive</dt>
          <dd className="tnum">5 long + 5 short</dd>
        </div>
        <div className={ledgerRow}>
          <dt className="text-paper-dim">Maximum the holder can be paid</dt>
          <dd className="tnum">5 STX</dd>
        </div>
        <div className={ledgerRow}>
          <dt className="text-paper-dim">Your maximum loss</dt>
          <dd className="tnum text-loss">5 STX less premium</dd>
        </div>
      </dl>
      <div className="mt-4 rounded-[2px] bg-seal px-5 py-2.5 text-center text-sm font-bold text-on-seal">
        Lock 5 STX and write
      </div>
      <p className="mt-2 text-center text-[11px] text-paper-dim">
        Protected by a post-condition: exactly this amount, nothing else.
      </p>
    </div>
  );
}

/* Faithful static replica of the order book. */
function OrderBookMock() {
  const rows = [
    { qty: "3", price: "0.12 STX", total: "0.36 STX" },
    { qty: "2", price: "0.14 STX", total: "0.28 STX" },
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-display text-base font-bold">Order book</p>
        <span className="text-[11px] text-paper-dim">no protocol fee</span>
      </div>
      <ul className="mt-3">
        {rows.map((r) => (
          <li key={r.price} className="flex items-center justify-between gap-3 border-t border-rule py-2.5 text-sm">
            <span>
              <span className="tnum">{r.qty}</span>
              <span className="text-paper-dim"> @ </span>
              <span className="tnum">{r.price}</span>
            </span>
            <span className="rounded-[2px] bg-seal px-3 py-1.5 text-xs font-bold text-on-seal">
              Buy for {r.total}
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
    <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <div className={reverse ? "md:order-2" : ""}>
        <p className="font-display text-sm font-bold text-seal">{eyebrow}</p>
        <h3 className="mt-3 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold">{title}</h3>
        <p className="mt-4 max-w-[52ch] text-paper-dim">{body}</p>
      </div>
      <div className={reverse ? "md:order-1" : ""}>{plate}</div>
    </div>
  );
}

export function ProductShowcase() {
  return (
    <section aria-labelledby="showcase" className="relative border-t border-rule">
      <GuillocheRosette className="pointer-events-none absolute right-6 top-16 hidden h-32 w-32 opacity-30 lg:block" />
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <h2 id="showcase" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
          The whole instrument, on one screen
        </h2>
        <p className="mt-5 max-w-[62ch] text-paper-dim">
          No dashboards to decode. Every series shows what you lock, what you can be paid, and the
          exact shape of the payoff - before you ever sign.
        </p>

        <div className="mt-16 space-y-20 md:space-y-28">
          <Row
            eyebrow="Figure I"
            title="Read your risk to the unit"
            body="Writing an option shows the collateral you lock, the positions you receive, and your maximum loss in figures - then binds the transaction to that exact amount with a post-condition. No surprises reach your wallet."
            plate={<Plate label="Writing a cash-secured put"><WriteLedgerMock /></Plate>}
          />
          <Row
            reverse
            eyebrow="Figure II"
            title="Every outcome, drawn in advance"
            body="The payoff curve is computed from the contract, not illustrated. Strike, cap, and - once settled - the exact settlement price and what each side is owed, to the smallest unit."
            plate={
              <div className="relative">
                <CornerOrnaments />
                <PayoffChart series={DEMO_SERIES} />
              </div>
            }
          />
          <Row
            eyebrow="Figure III"
            title="A market, not a middleman"
            body="List your options for premium and let anyone fill them, or buy directly from the on-chain order book. Peer to peer, partial fills, and a fee that stays off until there is usage to justify it."
            plate={<Plate label="Trading on the order book"><OrderBookMock /></Plate>}
          />
        </div>
      </div>
    </section>
  );
}

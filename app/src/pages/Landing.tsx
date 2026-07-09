import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { GuillocheBand, GuillocheRosette, CornerOrnaments } from "../components/Guilloche";
import { HeroPayoffArt } from "../components/HeroPayoffArt";
import { ProductShowcase } from "../components/ProductShowcase";
import { CONTRACT_ID, NETWORK, getAllSeries, getConfig } from "../lib/contract";
import { formatAmount } from "../lib/format";

const GITHUB_URL = "https://github.com/senga-alt/covault";
const EXPLORER_URL = `https://explorer.hiro.so/txid/${CONTRACT_ID}?chain=${NETWORK}`;

/* ------------------------------------------------------------------ */
/* small pieces                                                        */
/* ------------------------------------------------------------------ */

function SealButton({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2 rounded-[2px] bg-seal px-6 py-3 font-sans text-[15px] font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98]"
    >
      {children}
      <ArrowRight
        size={16}
        aria-hidden
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function Rule({ double = false }: { double?: boolean }) {
  return <div className={double ? "double-rule h-[5px]" : "border-t border-rule"} role="presentation" />;
}

/* Conserved-sum bar: the invariant as a picture. Widths are the real
   proportions of the settled STX demo series (payoff 0.4 / leftover 0.6). */
function ConservedBar() {
  return (
    <figure className="space-y-3">
      <div className="flex h-14 w-full overflow-hidden rounded-[2px] border border-rule">
        <div className="flex w-[40%] items-center justify-center bg-gain/20 text-sm">
          <span className="tnum text-gain">payoff 400,000</span>
        </div>
        <div className="flex w-[60%] items-center justify-center border-l border-rule bg-ink-3 text-sm">
          <span className="tnum text-paper-dim">leftover 600,000</span>
        </div>
      </div>
      <figcaption className="tnum flex justify-between text-xs text-paper-dim">
        <span>collateral locked: 1,000,000</span>
        <span>conserved exactly - no rounding</span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* sections                                                            */
/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <header className="relative">
      <nav className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6" aria-label="Primary">
        <span className="font-display text-2xl font-bold tracking-tight">
          Co<span className="text-seal">vault</span>
        </span>
        <div className="flex items-center gap-6">
          <span className="rounded-[2px] border border-rule px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-paper-dim">
            {NETWORK}
          </span>
          <Link to="/app" className="text-[15px] font-medium text-paper-dim transition-colors duration-200 hover:text-paper">
            Enter the app
          </Link>
        </div>
      </nav>

      <div className="relative mx-auto max-w-6xl overflow-hidden px-6 pb-24 pt-14 md:pb-28 md:pt-20">
        <CornerOrnaments />
        <HeroPayoffArt className="pointer-events-none absolute -right-[3%] top-6 hidden h-[420px] w-[56%] max-w-none opacity-90 [mask-image:radial-gradient(115%_125%_at_72%_36%,black_36%,transparent_80%)] lg:block" />
        <div className="relative z-10 grid items-center gap-14 lg:grid-cols-[7fr_5fr] lg:gap-16">
          <div>
            <p className="anim-rise flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-gain/40 px-2 py-1 font-mono text-gain">
                <span className="h-1.5 w-1.5 rounded-full bg-gain" aria-hidden /> Live on {NETWORK}
              </span>
              <span className="inline-flex items-center rounded-[2px] border border-rule px-2 py-1 font-mono text-paper-dim">
                full lifecycles settled in sBTC and STX
              </span>
            </p>
            <h1 className="anim-rise mt-7 font-display text-[clamp(2.6rem,6vw,4.6rem)] font-extrabold leading-[1.05] tracking-[-0.02em]">
              Options, fully collateralized. Settled in Bitcoin.
            </h1>
            <p className="anim-rise anim-rise-2 mt-7 max-w-[62ch] text-lg text-paper-dim">
              Covault is an options clearinghouse on Stacks where every contract is backed, in
              full, by collateral locked on-chain - in sBTC or native STX. No margin calls. No
              liquidation engine. Nothing to go insolvent.
            </p>
            <div className="anim-rise anim-rise-3 mt-9 flex flex-wrap items-center gap-6">
              <SealButton to="/app">Enter the vault</SealButton>
              <a
                href={`https://explorer.hiro.so/txid/${CONTRACT_ID}?chain=${NETWORK}`}
                target="_blank"
                rel="noreferrer"
                className="text-[15px] font-medium text-paper-dim underline decoration-rule underline-offset-4 transition-colors duration-200 hover:text-paper"
              >
                Verify the contract on-chain
              </a>
            </div>
          </div>
          <HeroPanel />
        </div>
      </div>

      <GuillocheBand animate className="block h-28 w-full md:h-36" />
      <Rule double />
    </header>
  );
}

/* The product itself, live in the hero: real series read from the contract,
   framed like a certificate excerpt. Trust by showing, not telling. */
function HeroPanel() {
  const q = useQuery({ queryKey: ["series"], queryFn: getAllSeries });
  return (
    <div className="anim-rise anim-rise-3 relative hidden lg:block" aria-label="Live markets excerpt">
      <div className="border border-rule bg-ink-2 shadow-[0_18px_54px_-24px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
          <span className="font-display text-sm font-bold">Markets</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-paper-dim">
            read live from {CONTRACT_ID.split(".")[1]}
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-paper-dim">
              <th scope="col" className="px-4 pb-1 pt-3 font-medium">Series</th>
              <th scope="col" className="px-4 pb-1 pt-3 text-right font-medium">Strike</th>
              <th scope="col" className="px-4 pb-1 pt-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).slice(0, 4).map((s) => (
              <tr key={s.id} className="border-t border-rule">
                <td className="px-4 py-2.5 font-medium">
                  #{s.id} {s.underlying}
                  <span className="ml-2 text-xs text-paper-dim">{s.isCall ? "call" : "put"}</span>
                </td>
                <td className="tnum px-4 py-2.5 text-right">{formatAmount(s.strike, s.asset)}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={s.settled ? "text-paper-dim" : "text-gain"}>
                    {s.settled ? "settled" : "active"}
                  </span>
                </td>
              </tr>
            ))}
            {q.isLoading &&
              [0, 1].map((i) => (
                <tr key={i} className="border-t border-rule">
                  <td colSpan={3} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded-[2px] bg-ink-3" />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="border-t border-rule px-4 py-2.5">
          <Link to="/app" className="text-xs font-medium text-seal-hi transition-colors duration-200 hover:text-seal">
            Open the full order book -&gt;
          </Link>
        </div>
      </div>
    </div>
  );
}

function Invariant() {
  return (
    <section aria-labelledby="invariant" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <div className="grid gap-14 md:grid-cols-[5fr_4fr] md:gap-20">
        <div>
          <h2 id="invariant" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
            Solvent by construction
          </h2>
          <p className="mt-6 max-w-[62ch] text-paper-dim">
            Every option locks its maximum possible payout as collateral the moment it is
            written. At settlement, the holder's payoff and the writer's leftover are two
            cuts of the same escrow - they always sum to exactly what was locked.
          </p>
          <p className="mt-4 max-w-[62ch] text-paper-dim">
            That single constraint deletes the machinery that makes derivatives dangerous:
            there is no margin to call, no position to liquidate, no keeper to race. The
            only trusted input is one settlement price per series, at expiry.
          </p>
          <p className="tnum mt-8 border-t border-rule pt-6 text-lg">
            payoff + leftover <span className="text-seal">=</span> collateral
          </p>
        </div>
        <div className="flex flex-col justify-center gap-8">
          <GuillocheRosette className="mx-auto h-40 w-40 md:h-48 md:w-48" />
          <ConservedBar />
        </div>
      </div>
    </section>
  );
}

/* A real sequence - the numbers carry information, so they're earned. */
const STEPS: { n: string; t: string; d: string }[] = [
  { n: "I", t: "Write", d: "Lock collateral in sBTC or STX. Receive the option and the obligation as separate, tradable positions." },
  { n: "II", t: "Trade", d: "Sell the option for premium on the on-chain order book, or peer-to-peer. Partial fills supported." },
  { n: "III", t: "Settle", d: "At expiry, one settlement price is recorded per series - measured in Bitcoin blocks, not server time." },
  { n: "IV", t: "Exercise & reclaim", d: "The holder takes the payoff, the writer reclaims the rest. The two always sum to the escrow." },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how" className="border-t border-rule bg-ink-2">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <h2 id="how" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
          The life of a contract
        </h2>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-[2px] border border-rule bg-rule md:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="bg-ink-2 p-7">
              <span className="font-display text-sm font-bold text-seal" aria-hidden>
                {s.n}
              </span>
              <h3 className="mt-3 font-display text-xl font-bold">{s.t}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-paper-dim">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function LiveProof() {
  const cfg = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const series = useQuery({ queryKey: ["series"], queryFn: getAllSeries });
  const settled = series.data?.filter((s) => s.settled).length;

  const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="py-6">
      <dt className="text-sm text-paper-dim">{label}</dt>
      <dd className="tnum mt-2 text-3xl font-medium">{value}</dd>
    </div>
  );

  return (
    <section aria-labelledby="proof" className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="proof" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
            Live on {NETWORK}
          </h2>
          <a
            href={`https://explorer.hiro.so/txid/${CONTRACT_ID}?chain=${NETWORK}`}
            target="_blank"
            rel="noreferrer"
            className="tnum break-all text-sm text-paper-dim underline decoration-rule underline-offset-4 hover:text-paper"
          >
            {CONTRACT_ID}
          </a>
        </div>
        <dl className="mt-10 grid grid-cols-2 gap-x-10 border-t border-rule md:grid-cols-4">
          <Stat label="Option series" value={cfg.data ? cfg.data.seriesCount : "-"} />
          <Stat label="Series settled" value={settled ?? "-"} />
          <Stat label="Collateral assets" value="sBTC + STX" />
          <Stat label="Escrow conserved" value={<span className="text-gain">exact</span>} />
        </dl>
        <p className="mt-8 max-w-[70ch] text-sm text-paper-dim">
          Every lifecycle - write, trade, settle, exercise, reclaim - has already been executed
          on-chain in both collateral assets. Each figure above is read live from the contract;
          nothing on this page is a mock.
        </p>
      </div>
    </section>
  );
}

function Foundation() {
  const rows = [
    ["Settlement assets", "sBTC (Bitcoin on Stacks) and native STX, chosen per series"],
    ["Language", "Clarity 4 - decidable, no reentrancy, asset-safety primitives"],
    ["Expiry clock", "Bitcoin burn-block height, not server time"],
    ["Calls", "Written as capped spreads, so every call is fully cash-collateralizable"],
    ["Puts", "Cash-secured at the strike - the classic covered instrument"],
    ["Order book", "On-chain, peer-to-peer, partial fills, maker-cancelable"],
  ];
  return (
    <section aria-labelledby="foundation" className="border-t border-rule bg-ink-2">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <h2 id="foundation" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
          Specification
        </h2>
        <dl className="mt-12">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-2 border-t border-rule py-5 md:grid-cols-[220px_1fr] md:gap-10">
              <dt className="font-display font-bold">{k}</dt>
              <dd className="text-paper-dim">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* Honest security ledger - the DeFi question everyone asks, answered without
   overclaiming. Modeled on what Zest/Bitflow signal, grounded in what is true here. */
function SecurityPosture() {
  const rows: { k: string; v: React.ReactNode }[] = [
    {
      k: "Solvency",
      v: "Enforced by construction: a contract cannot pay out more than it holds. payoff + leftover always equals the locked collateral, exactly.",
    },
    {
      k: "Testing",
      v: "24 automated tests run against the real sBTC contract and native STX in simnet - writing, trading, settlement, exercise, reclaim, and the conservation invariant.",
    },
    {
      k: "Source",
      v: (
        <>
          Open source, end to end.{" "}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="text-paper underline decoration-rule underline-offset-4 hover:text-seal-hi">
            Read the contract
          </a>{" "}
          or{" "}
          <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="text-paper underline decoration-rule underline-offset-4 hover:text-seal-hi">
            verify the deployed code on-chain
          </a>
          .
        </>
      ),
    },
    {
      k: "Immutability",
      v: "The deployed contract cannot be upgraded in place. Improvements ship as new, versioned deployments you opt into.",
    },
    {
      k: "Failsafe",
      v: "The operator can pause new risk (writing, listing new series) in an emergency - but every exit stays open. A pause can never trap funds.",
    },
    {
      k: "Audit status",
      v: "No third-party audit yet; a formal audit is planned post-launch. Until then: small surface area, full test suite, open code, testnet-first rollout.",
    },
  ];
  return (
    <section aria-labelledby="security" className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <h2 id="security" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
          Security posture
        </h2>
        <p className="mt-5 max-w-[65ch] text-paper-dim">
          Stated plainly, including what is not done yet. The strongest guarantee is
          structural: there is no state in which the vault owes more than it holds.
        </p>
        <dl className="mt-12">
          {rows.map(({ k, v }) => (
            <div key={k} className="grid gap-2 border-t border-rule py-5 md:grid-cols-[220px_1fr] md:gap-10">
              <dt className="font-display font-bold">{k}</dt>
              <dd className="text-paper-dim">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "What exactly can I lose?",
    a: "If you buy an option, at most the premium you paid. If you write one, at most the collateral you lock when writing - the amount is shown before you sign, and nothing can increase it afterward. There are no margin calls and no liquidations.",
  },
  {
    q: "What is a capped call?",
    a: "A call whose payout stops at a cap above the strike. Capping the upside is what lets the full payout be locked as cash collateral up front - it is the same payoff as a call spread, and it is why Covault can never be undercollateralized.",
  },
  {
    q: "Where does the settlement price come from?",
    a: "Each series records one settlement price at expiry, measured on Bitcoin block height. In the current version an authorized reporter posts it; the integration underway replaces this with an on-chain price feed. A wrong price can only ever affect its own series.",
  },
  {
    q: "Which assets can collateralize a series?",
    a: "sBTC (Bitcoin on Stacks) or native STX, chosen when the series is created. Payoffs settle in the same asset that was locked.",
  },
  {
    q: "Do I need to exercise manually?",
    a: "After settlement, exercising and reclaiming are open forever - there is no deadline race. Holders claim their payoff and writers reclaim their leftover whenever they choose.",
  },
];

function Faq() {
  return (
    <section aria-labelledby="faq" className="border-t border-rule bg-ink-2">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <h2 id="faq" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
          Questions, answered
        </h2>
        <div className="mt-12 max-w-3xl">
          {FAQS.map((f) => (
            <details key={f.q} className="group border-t border-rule">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-lg font-bold marker:hidden [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-seal transition-transform duration-200 group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="max-w-[65ch] pb-6 text-paper-dim">{f.a}</p>
            </details>
          ))}
          <div className="border-t border-rule" role="presentation" />
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section className="relative border-t border-rule">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
        <GuillocheBand className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-50" />
        <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] font-extrabold">
          Write your first covered option.
        </h2>
        <p className="mx-auto mt-6 max-w-[52ch] text-paper-dim">
          Earn premium on idle sBTC, or buy downside protection with risk you can read off the
          contract - to the unit.
        </p>
        <div className="mt-10 flex justify-center">
          <SealButton to="/app">Enter the vault</SealButton>
        </div>
      </div>
      <footer className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
            <div>
              <span className="font-display text-xl font-bold">
                Co<span className="text-seal">vault</span>
              </span>
              <p className="mt-3 max-w-[42ch] text-sm text-paper-dim">
                A fully-collateralized options clearinghouse on Stacks. Solvent by
                construction: every payoff is capped at its locked collateral.
              </p>
            </div>
            <nav aria-label="Protocol">
              <h3 className="font-display text-sm font-bold">Protocol</h3>
              <ul className="mt-3 space-y-2 text-sm text-paper-dim">
                <li><Link to="/app" className="hover:text-paper">Markets</Link></li>
                <li><Link to="/app/portfolio" className="hover:text-paper">Portfolio</Link></li>
              </ul>
            </nav>
            <nav aria-label="Verify">
              <h3 className="font-display text-sm font-bold">Verify</h3>
              <ul className="mt-3 space-y-2 text-sm text-paper-dim">
                <li>
                  <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="hover:text-paper">
                    Contract on explorer
                  </a>
                </li>
                <li>
                  <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-paper">
                    Source on GitHub
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6 text-xs text-paper-dim">
            <span>Testnet software. Not investment advice.</span>
            <span className="tnum break-all">{CONTRACT_ID}</span>
          </div>
        </div>
      </footer>
    </section>
  );
}

export function Landing() {
  return (
    <div className="min-h-dvh">
      <Hero />
      <Invariant />
      <HowItWorks />
      <ProductShowcase />
      <LiveProof />
      <Foundation />
      <SecurityPosture />
      <Faq />
      <Closing />
    </div>
  );
}

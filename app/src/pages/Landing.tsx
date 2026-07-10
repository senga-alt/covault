import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { GuillocheBand, CornerOrnaments, SectionMark } from "../components/Guilloche";
import { HeroPayoffArt } from "../components/HeroPayoffArt";
import { ProductShowcase } from "../components/ProductShowcase";
import { Reveal } from "../components/Reveal";
import { PayoffDemo } from "../components/PayoffDemo";
import { CONTRACT_ID, NETWORK } from "../lib/contract";

const GITHUB_URL = "https://github.com/senga-alt/covault";
const EXPLORER_URL = `https://explorer.hiro.so/txid/${CONTRACT_ID}?chain=${NETWORK}`;

/* ------------------------------------------------------------------ */
/* small pieces                                                        */
/* ------------------------------------------------------------------ */

function SealButton({ to, children, className = "" }: { to: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2 rounded-[2px] bg-seal px-6 py-3 font-sans text-[15px] font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98] ${className}`}
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

/* ------------------------------------------------------------------ */
/* sections                                                            */
/* ------------------------------------------------------------------ */

const NAV_LINKS: [string, string][] = [
  ["Why Covault", "#why"],
  ["How it works", "#how-it-works"],
  ["Product", "#product"],
  ["FAQ", "#faq"],
];

/* Standard sticky product nav - section anchors plus the app entry. */
function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule/70 bg-ink/90 backdrop-blur-sm">
      <nav
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-0 px-4 py-3 md:h-16 md:flex-nowrap md:px-6 md:py-0"
        aria-label="Primary"
      >
        <a href="#top" className="order-1 font-display text-xl font-bold tracking-tight">
          Co<span className="text-seal">vault</span>
        </a>
        <div className="order-3 -mx-1 mt-2 flex w-full items-center gap-5 overflow-x-auto pb-0.5 md:order-2 md:mx-0 md:mt-0 md:w-auto md:gap-7 md:overflow-visible md:pb-0">
          {NAV_LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="whitespace-nowrap px-1 text-sm font-medium text-paper-dim transition-colors duration-200 hover:text-paper md:text-[15px]"
            >
              {label}
            </a>
          ))}
        </div>
        <div className="order-2 ml-auto flex items-center gap-3 md:order-3 md:ml-0">
          <span className="hidden rounded-[2px] border border-rule px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-paper-dim min-[480px]:inline-block">
            {NETWORK}
          </span>
          <Link
            to="/app"
            className="shrink-0 whitespace-nowrap rounded-[2px] bg-seal px-4 py-2 text-sm font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98]"
          >
            Launch app
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <header className="relative">
      <div className="relative mx-auto max-w-6xl overflow-hidden px-6 pb-24 pt-16 md:pb-28 md:pt-24">
        <CornerOrnaments />
        <div className="anim-float pointer-events-none absolute -right-[3%] top-6 hidden h-[420px] w-[56%] lg:block">
          <HeroPayoffArt className="h-full w-full max-w-none opacity-90 [mask-image:radial-gradient(115%_125%_at_72%_36%,black_36%,transparent_80%)]" />
        </div>
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16">
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
            <div className="anim-rise anim-rise-3 mt-9 flex flex-col items-stretch gap-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
              <SealButton to="/app" className="justify-center sm:justify-start">Enter the vault</SealButton>
              <a
                href={`https://explorer.hiro.so/txid/${CONTRACT_ID}?chain=${NETWORK}`}
                target="_blank"
                rel="noreferrer"
                className="text-center text-[15px] font-medium text-paper-dim underline decoration-rule underline-offset-4 transition-colors duration-200 hover:text-paper sm:text-left"
              >
                Verify the contract on-chain
              </a>
            </div>
          </div>
          <div className="anim-rise anim-rise-3 relative">
            <PayoffDemo />
          </div>
        </div>
      </div>

      <GuillocheBand animate className="block h-28 w-full md:h-36" />
      <Rule double />
    </header>
  );
}

const CLAIMS: { t: string; d: string }[] = [
  { t: "No margin calls", d: "Collateral is locked once, in full, the moment an option is written. Nothing can demand more later." },
  { t: "No liquidation engine", d: "There is no position to liquidate, no keeper race, no cascade. The machinery that makes derivatives dangerous simply is not here." },
  { t: "One price, once", d: "A single settlement price per series, at expiry, on Bitcoin block time. That is the entire trusted surface." },
  { t: "Nothing to go insolvent", d: "The holder's payoff and the writer's leftover are two cuts of one escrow. They sum to the collateral - exactly, every time." },
];

/* Scroll-driven emphasis: each claim brightens as it crosses the viewport's
   middle band (Opyn-style pedagogy, engraved execution). Reduced motion or no
   IntersectionObserver: everything stays lit. */
function ClaimItem({ t, d }: { t: string; d: string }) {
  const ref = useRef<HTMLLIElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), {
      rootMargin: "-36% 0px -36% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <li
      ref={ref}
      className="border-t border-rule py-9 transition-opacity duration-300"
      style={{ opacity: on ? 1 : 0.3 }}
    >
      <h3 className="flex items-center gap-3 font-display text-2xl font-bold md:text-3xl">
        <span
          className={`inline-block h-2.5 w-2.5 shrink-0 transition-colors duration-300 ${on ? "bg-seal" : "bg-rule"}`}
          aria-hidden
        />
        {t}
      </h3>
      <p className="mt-3 max-w-[52ch] text-paper-dim">{d}</p>
    </li>
  );
}

function Invariant() {
  return (
    <section id="why" aria-labelledby="invariant" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 md:py-32">
      <div className="grid gap-14 md:grid-cols-[5fr_6fr] md:gap-20">
        <div className="self-start md:sticky md:top-28">
          <SectionMark />
          <h2 id="invariant" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
            Solvent by construction
          </h2>
          <p className="mt-6 max-w-[52ch] text-paper-dim">
            Every option locks its maximum possible payout as collateral the moment it is
            written. From that one constraint, everything dangerous falls away.
          </p>
          <p className="tnum mt-8 border-t border-rule pt-6 text-lg">
            payoff + leftover <span className="text-seal">=</span> collateral
          </p>
        </div>
        <ul className="md:pt-1">
          {CLAIMS.map((c) => (
            <ClaimItem key={c.t} t={c.t} d={c.d} />
          ))}
          <div className="border-t border-rule" role="presentation" />
        </ul>
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
    <section id="how-it-works" aria-labelledby="how" className="scroll-mt-20 border-t border-rule bg-ink-2">
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal>
          <SectionMark />
          <h2 id="how" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
            The life of a contract
          </h2>
        </Reveal>
        <ol className="mt-14 grid gap-px overflow-hidden rounded-[2px] border border-rule bg-rule md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative overflow-hidden bg-ink-2">
              <span
                className="pointer-events-none absolute -right-1 -top-4 select-none font-display text-[92px] font-bold leading-none text-gilt opacity-[0.07]"
                aria-hidden
              >
                {s.n}
              </span>
              <Reveal delay={i * 80} className="h-full p-6 sm:p-7">
                <span className="font-display text-sm font-bold text-seal" aria-hidden>
                  {s.n}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold">{s.t}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-paper-dim">{s.d}</p>
              </Reveal>
            </li>
          ))}
        </ol>
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
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-20 border-t border-rule bg-ink-2">
      <Reveal className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <SectionMark />
        <h2 id="faq-heading" className="font-display text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold">
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
      </Reveal>
    </section>
  );
}

function Closing() {
  return (
    <section className="relative border-t border-rule">
      <Reveal className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
        <GuillocheBand className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-50" />
        <SectionMark center />
        <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] font-extrabold">
          Write your first covered option.
        </h2>
        <p className="mx-auto mt-6 max-w-[52ch] text-paper-dim">
          Earn premium on idle sBTC, or buy downside protection with risk you can read off the
          contract - to the unit.
        </p>
        <div className="mt-10 flex justify-center px-2">
          <SealButton to="/app" className="w-full justify-center sm:w-auto">Enter the vault</SealButton>
        </div>
      </Reveal>
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
    <div id="top" className="min-h-dvh">
      <LandingNav />
      <Hero />
      <Invariant />
      <HowItWorks />
      <div id="product" className="scroll-mt-20">
        <ProductShowcase />
      </div>
      <Faq />
      <Closing />
    </div>
  );
}

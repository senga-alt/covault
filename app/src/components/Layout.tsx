import { NavLink, Link, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { WalletButton } from "./WalletButton";
import { BrandMark } from "./BrandMark";
import { NETWORK, getBurnHeight, getConfig } from "../lib/contract";
import { useWallet } from "../lib/wallet";

const navCls = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center rounded-[2px] px-3 py-2 text-[15px] font-medium transition-colors duration-200 pointer-coarse:min-h-11 ${
    isActive ? "bg-ink-3 text-paper" : "text-paper-dim hover:text-paper"
  }`;

/** Testnet principals start ST/SN, mainnet SP/SM - detect a wallet on the wrong network. */
function networkMismatch(address: string | null): boolean {
  if (!address) return false;
  const onTestnetAddr = address.startsWith("ST") || address.startsWith("SN");
  return NETWORK === "testnet" ? !onTestnetAddr : onTestnetAddr;
}

export function Layout() {
  const { address } = useWallet();
  const configQ = useQuery({ queryKey: ["config"], queryFn: getConfig });
  const burnQ = useQuery({ queryKey: ["burn-height"], queryFn: getBurnHeight, refetchInterval: 30_000 });
  const isOwner = !!address && address === configQ.data?.owner;
  const mismatch = networkMismatch(address);
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[2px] focus:bg-seal focus:px-3 focus:py-2 focus:text-on-seal"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-rule bg-ink/95 backdrop-blur-sm">
        {/* two rows on mobile (logo+wallet, then nav); one row from sm up */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:h-16 sm:flex-nowrap sm:gap-8 sm:px-6 sm:py-0">
          <Link to="/" className="order-1 inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight">
            <BrandMark className="h-[26px] w-[26px]" />
            <span>
              Co<span className="text-seal">vault</span>
            </span>
          </Link>
          <nav
            aria-label="Primary"
            className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto sm:order-2 sm:mx-0 sm:w-auto"
          >
            <NavLink to="/app" end className={navCls}>
              Markets
            </NavLink>
            <NavLink to="/app/portfolio" className={navCls}>
              Portfolio
            </NavLink>
            {isOwner && (
              <NavLink to="/app/admin" className={navCls}>
                Operator
              </NavLink>
            )}
          </nav>
          <div className="order-2 ml-auto flex items-center gap-3 sm:order-3">
            {burnQ.data && (
              <span
                className="hidden items-center gap-1.5 font-mono text-[11px] text-paper-dim lg:flex"
                title="Bitcoin burn-block height - the clock series expire on"
              >
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gain" aria-hidden />
                burn <span className="tnum text-paper">#{burnQ.data.toLocaleString()}</span>
                <span className="sr-only">
                  Bitcoin burn-block height - the clock series expire on.
                </span>
              </span>
            )}
            <span className="hidden rounded-[2px] border border-rule px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-paper-dim min-[420px]:inline-block">
              {NETWORK}
            </span>
            <WalletButton />
          </div>
        </div>
      </header>
      {mismatch && (
        <div role="alert" className="border-b border-loss/40 bg-loss/10">
          <p className="mx-auto max-w-7xl px-4 py-2.5 text-sm sm:px-6">
            Your wallet is connected with a {NETWORK === "testnet" ? "mainnet" : "testnet"} address, but this app
            runs on {NETWORK}. Switch the network inside your wallet, then reconnect - transactions will fail
            until then.
          </p>
        </div>
      )}
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <Outlet />
      </main>
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-rule px-4 py-6 text-xs text-paper-dim sm:px-6">
        <span>Solvent by construction: every payoff is capped at its locked collateral.</span>
        <span>Testnet software. Not investment advice.</span>
      </footer>
    </div>
  );
}

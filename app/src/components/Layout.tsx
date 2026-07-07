import { NavLink, Link, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { WalletButton } from "./WalletButton";
import { NETWORK, getConfig } from "../lib/contract";
import { useWallet } from "../lib/wallet";

const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-[2px] px-3 py-2 text-[15px] font-medium transition-colors duration-200 ${
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
  const isOwner = !!address && address === configQ.data?.owner;
  const mismatch = networkMismatch(address);
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-[2px] focus:bg-seal focus:px-3 focus:py-2 focus:text-on-seal"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-rule bg-ink/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-display text-xl font-bold tracking-tight">
              Co<span className="text-seal">vault</span>
            </Link>
            <nav aria-label="Primary" className="flex items-center gap-1">
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
          </div>
          <div className="flex items-center gap-4">
            <span className="rounded-[2px] border border-rule px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-paper-dim">
              {NETWORK}
            </span>
            <WalletButton />
          </div>
        </div>
      </header>
      {mismatch && (
        <div role="alert" className="border-b border-loss/40 bg-loss/10">
          <p className="mx-auto max-w-7xl px-6 py-2.5 text-sm">
            Your wallet is connected with a {NETWORK === "testnet" ? "mainnet" : "testnet"} address, but this app
            runs on {NETWORK}. Switch the network inside your wallet, then reconnect - transactions will fail
            until then.
          </p>
        </div>
      )}
      <main id="main" className="mx-auto max-w-7xl px-6 py-10">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl border-t border-rule px-6 py-6 text-xs text-paper-dim">
        Solvent by construction: every payoff is capped at its locked collateral.
      </footer>
    </div>
  );
}

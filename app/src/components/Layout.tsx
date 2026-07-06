import { NavLink, Outlet } from "react-router-dom";
import { WalletButton } from "./WalletButton";
import { NETWORK } from "../lib/contract";

const navCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
    isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
  }`;

export function Layout() {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-on-primary"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-baseline gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-foreground">
                Co<span className="text-primary">vault</span>
              </span>
            </NavLink>
            <nav aria-label="Primary" className="flex items-center gap-1">
              <NavLink to="/" end className={navCls}>
                Markets
              </NavLink>
              <NavLink to="/portfolio" className={navCls}>
                Portfolio
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {NETWORK}
            </span>
            <WalletButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-7xl border-t border-border px-4 py-6 text-xs text-muted-foreground">
        Covault - fully-collateralized options on Stacks. Solvent by construction: every payoff is
        capped at its locked collateral.
      </footer>
    </div>
  );
}

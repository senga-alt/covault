import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { ContentsRegister } from "./ui";
import "./docs.css";

const GITHUB_URL = "https://github.com/senga-alt/covault";

/**
 * The docs read as one continuous engraved document: a contents register
 * under the masthead, then a single centered column per numbered section.
 * Deliberately no flanking nav/TOC columns - navigation lives in the
 * register strip, the front page's contents plate, the in-article clause
 * line, and the prev/next plates.
 */
export function DocsLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-paper">
      <header className="sticky top-0 z-30 border-b border-rule/70 bg-ink/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4 lg:px-6">
          <Link to="/docs" className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight">
            <BrandMark className="h-[22px] w-[22px]" />
            <span>
              Co<span className="text-seal">vault</span>
            </span>
            <span className="rounded-[2px] border border-rule px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-paper-dim">
              Docs
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <Link to="/" className="hidden text-sm text-paper-dim transition-colors duration-150 hover:text-paper sm:inline">
              Home
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 text-sm text-paper-dim transition-colors duration-150 hover:text-paper sm:inline-flex"
            >
              GitHub <ExternalLink size={12} aria-hidden />
            </a>
            <Link
              to="/app"
              className="rounded-[2px] bg-seal px-3 py-1.5 text-sm font-bold text-on-seal transition duration-200 hover:bg-seal-hi active:scale-[0.98]"
            >
              Launch app
            </Link>
          </div>
        </div>
      </header>

      <ContentsRegister />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 lg:px-6 lg:py-16">
        <Outlet />
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-paper-dim sm:flex-row lg:px-6">
          <p>Solvent by construction: every payoff is capped at its locked collateral.</p>
          <p>Testnet software. Not investment advice.</p>
        </div>
      </footer>
    </div>
  );
}

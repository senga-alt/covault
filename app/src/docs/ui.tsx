import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CornerOrnaments } from "../components/Guilloche";
import { DOCS_NAV, ALL_DOCS, getDocsSiblings, numeralFor, sectionFor } from "./nav";

/* ------------------------------------------------------------------ */
/* the contents register - one horizontal strip, the facts-strip idiom */
/* ------------------------------------------------------------------ */

export function ContentsRegister() {
  return (
    <div className="sticky top-14 z-20 border-b border-rule/70 bg-ink/95 backdrop-blur-sm">
      <nav aria-label="Contents" className="scroll-x mx-auto flex max-w-4xl overflow-x-auto px-4 lg:px-6">
        {ALL_DOCS.map((item) => (
          <NavLink
            key={item.slug}
            to={`/docs/${item.slug}`}
            end
            className="relative flex shrink-0 items-baseline gap-2 border-l border-rule/60 px-4 py-2.5 text-sm transition-colors duration-150 first:border-l-0 first:pl-1"
          >
            {({ isActive }) => (
              <>
                <span className={`font-mono text-[11px] ${isActive ? "text-seal" : "text-gilt opacity-60"}`}>
                  {numeralFor(item.slug)}
                </span>
                <span
                  className={
                    isActive ? "font-medium text-paper" : "text-paper-dim transition-colors duration-150 hover:text-paper"
                  }
                >
                  {item.title}
                </span>
                {isActive && <span aria-hidden className="absolute inset-x-3 bottom-0 border-b-2 border-seal" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* article shell - a numbered section of one continuous document       */
/* ------------------------------------------------------------------ */

export function DocArticle({
  title,
  lead,
  slug,
  children,
}: {
  title: string;
  lead: string;
  slug: string;
  children: React.ReactNode;
}) {
  const numeral = numeralFor(slug);
  return (
    <article id="doc-article" className="relative mx-auto max-w-[70ch]">
      {/* ghost section numeral - same voice as the landing's How it works */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 right-0 select-none font-display text-[9rem] font-extrabold leading-none text-paper opacity-[0.04]"
      >
        {numeral}
      </span>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-paper-dim">
        Section {numeral} <span className="mx-1.5 text-gilt">·</span> {sectionFor(slug)}
      </p>
      <h1 className="relative mt-3 font-display text-3xl font-bold">{title}</h1>
      <p className="relative mt-3 text-[15px] leading-relaxed text-paper-dim">{lead}</p>
      <div className="double-rule mt-6" role="presentation" />
      <ClauseIndex contentKey={slug} />
      <div className="doc-prose mt-6">{children}</div>
      <PageNav slug={slug} />
    </article>
  );
}

/** Run-in clause line under the rule - replaces a hanging TOC column. */
function ClauseIndex({ contentKey }: { contentKey: string }) {
  const [heads, setHeads] = useState<{ id: string; text: string }[]>([]);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLHeadingElement>("#doc-article h2[id]"));
    setHeads(els.map((el) => ({ id: el.id, text: el.textContent?.trim() ?? "" })));
  }, [contentKey]);

  if (heads.length < 2) return null;
  return (
    <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-dim">In this section</span>
      {heads.map((h, i) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          className="text-paper-dim transition-colors duration-150 hover:text-paper"
        >
          <span className="mr-1 font-mono text-[11px] text-gilt opacity-80">§{i + 1}</span>
          {h.text}
        </a>
      ))}
    </p>
  );
}

/** Anchored heading - the stylesheet stamps it with an engraved "§ n". */
export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id}>
      <a href={`#${id}`} className="!no-underline hover:!text-paper">
        {children}
      </a>
    </h2>
  );
}

/* ------------------------------------------------------------------ */
/* content primitives                                                  */
/* ------------------------------------------------------------------ */

export function Callout({
  tone = "note",
  title,
  children,
}: {
  tone?: "note" | "warn";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-[2px] border border-rule bg-ink-2 px-4 py-3.5 text-sm">
      <span
        aria-hidden
        className={`absolute left-0 top-0 h-2 w-2 ${tone === "warn" ? "bg-loss" : "bg-seal"}`}
      />
      {title && <p className="!mt-0 font-display font-bold !text-paper">{title}</p>}
      <div className={title ? "mt-1.5" : ""}>{children}</div>
    </div>
  );
}

export function CodeBlock({ label, children }: { label?: string; children: string }) {
  return (
    <figure className="!my-5 overflow-hidden rounded-[2px] border border-rule bg-ink-2">
      {label && (
        <figcaption className="border-b border-rule px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-paper-dim">
          {label}
        </figcaption>
      )}
      <pre className="scroll-x overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-paper">
        <code>{children}</code>
      </pre>
    </figure>
  );
}

/** Wide tables sit in an ornamented plate, exactly like the app's registers. */
export function DocTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative !my-5 border border-rule bg-ink-2">
      <CornerOrnaments />
      <div className="scroll-x overflow-x-auto">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* the contents plate - lives on the document's front page             */
/* ------------------------------------------------------------------ */

export function ContentsPlate() {
  return (
    <div className="relative !my-6 border border-rule bg-ink-2 p-5">
      <CornerOrnaments />
      <p className="double-rule pb-1 pt-2 font-display text-base font-bold">Contents</p>
      <div className="mt-4 space-y-5">
        {DOCS_NAV.map((section) => (
          <div key={section.label}>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim">{section.label}</p>
            <ul className="!mt-1.5 !p-0">
              {section.items.map((item) => (
                <li key={item.slug} className="!m-0 !p-0 before:!content-none">
                  <Link
                    to={`/docs/${item.slug}`}
                    className="flex items-baseline gap-2 py-1 !no-underline hover:!text-paper"
                  >
                    <span className="!text-paper">{item.title}</span>
                    <span className="toc-leader" aria-hidden />
                    <span className="font-mono text-[11px] !text-paper-dim">{numeralFor(item.slug)}</span>
                  </Link>
                  {item.description && (
                    <p className="!m-0 pb-1 text-xs !text-paper-dim">{item.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* prev / next plates                                                  */
/* ------------------------------------------------------------------ */

export function PageNav({ slug }: { slug: string }) {
  const { prev, next } = getDocsSiblings(slug);
  if (!prev && !next) return null;
  return (
    <nav aria-label="Adjacent sections" className="mt-14 flex gap-3 border-t-2 border-rule pt-5">
      {prev && (
        <Link
          to={`/docs/${prev.slug}`}
          className="group flex-1 rounded-[2px] border border-rule px-4 py-3 transition-colors duration-150 hover:bg-ink-3"
        >
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-dim">
            <ArrowLeft size={11} aria-hidden className="transition-transform duration-200 group-hover:-translate-x-0.5" />
            Section {numeralFor(prev.slug)}
          </span>
          <span className="mt-1 block font-display text-sm font-bold">{prev.title}</span>
        </Link>
      )}
      {next && (
        <Link
          to={`/docs/${next.slug}`}
          className="group flex-1 rounded-[2px] border border-rule px-4 py-3 text-right transition-colors duration-150 hover:bg-ink-3"
        >
          <span className="flex items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-widest text-paper-dim">
            Section {numeralFor(next.slug)}
            <ArrowRight size={11} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
          <span className="mt-1 block font-display text-sm font-bold">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}

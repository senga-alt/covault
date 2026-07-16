import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY, type TermKey } from "../lib/glossary";

/**
 * Inline glossary term: a dotted-underline word that reveals a quiet engraved
 * definition at the point of use. Built on the native Popover API, so it renders
 * in the top layer (never clipped by a panel or a scrolling table), light-
 * dismisses on outside click, and closes on Escape for free. Accessible: the
 * trigger is a real <button> with aria-expanded/aria-controls, keyboard-operable
 * like any button; the definition carries its own heading.
 *
 * `children` overrides the visible word (e.g. to match surrounding sentence
 * case); it defaults to the glossary label lowercased.
 */
export function Term({ term, children }: { term: TermKey; children?: React.ReactNode }) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const def = GLOSSARY[term];

  useEffect(() => {
    const pop = popRef.current;
    const btn = btnRef.current;
    if (!pop || !btn) return;

    // The popover lives in the top layer, so position it under the trigger in
    // viewport coordinates (fixed), clamped to stay on-screen.
    const place = () => {
      const r = btn.getBoundingClientRect();
      const left = Math.max(12, Math.min(r.left, window.innerWidth - pop.offsetWidth - 12));
      pop.style.left = `${left}px`;
      pop.style.top = `${r.bottom + 6}px`;
    };
    const onToggle = (e: Event) => {
      const opening = (e as ToggleEvent).newState === "open";
      setOpen(opening);
      if (opening) {
        place();
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
      } else {
        window.removeEventListener("resize", place);
        window.removeEventListener("scroll", place, true);
      }
    };
    pop.addEventListener("toggle", onToggle);
    return () => {
      pop.removeEventListener("toggle", onToggle);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        popoverTarget={id}
        aria-expanded={open}
        aria-controls={id}
        className="cursor-help font-medium underline decoration-dotted decoration-gilt/60 underline-offset-[3px] transition-colors duration-150 hover:decoration-gilt focus-visible:decoration-solid focus-visible:decoration-seal"
      >
        {children ?? def.label.toLowerCase()}
      </button>
      <div
        ref={popRef}
        id={id}
        popover="auto"
        className="anim-pop fixed m-0 w-[min(20rem,calc(100vw-1.5rem))] border border-rule bg-ink-2 px-3.5 py-3 text-left text-sm font-normal leading-relaxed text-paper-dim shadow-[0_2px_16px_-6px_var(--color-ink)]"
      >
        <span className="mb-1 block font-display text-[13px] font-bold text-paper">{def.label}</span>
        {def.text}
      </div>
    </>
  );
}

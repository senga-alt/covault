import { useEffect, useRef, useState } from "react";

/**
 * Whisper-level scroll reveal: content rises 14px and fades in once, when it
 * enters the viewport. Content is VISIBLE by default - the effect only hides
 * an element after confirming it is below the fold with motion allowed, so
 * print, snapshots, crawlers, and no-JS contexts always see the full page
 * (DESIGN.md: motion enhances, never gates). Never re-hides.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"visible" | "waiting" | "revealed">("visible");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return; // stays visible
    }
    // Only elements genuinely below the viewport earn the entrance; anything
    // already on screen must never flash out.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    setPhase("waiting");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPhase("revealed");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hidden = phase === "waiting";
  return (
    <div
      ref={ref}
      data-reveal=""
      className={className}
      style={{
        opacity: hidden ? 0 : 1,
        transform: hidden ? "translateY(14px)" : "none",
        transition:
          phase === "revealed"
            ? `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms`
            : undefined,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Counts a figure up from 0 the first time it scrolls into view.
 * Reduced motion or no IO: renders the final value immediately.
 */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      return;
    }
    if (started.current) {
      setDisplay(value); // keep live-refreshed figures current after the intro
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();
        const t0 = performance.now();
        const dur = 900;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * value));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="tnum">
      {display}
    </span>
  );
}

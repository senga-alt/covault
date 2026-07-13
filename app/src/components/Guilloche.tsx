/**
 * Parametric guilloche - the engraved line-work of banknotes and bond certificates.
 * Pure SVG computed from layered sinusoids (band) and polar rosettes (seal).
 * Ornament only: always aria-hidden, never behind body text.
 */

const W = 1200;

function bandPath(amp: number, freq: number, phase: number, mid: number): string {
  const pts: string[] = [];
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const y =
      mid +
      amp * Math.sin((2 * Math.PI * freq * x) / W + phase) +
      amp * 0.35 * Math.sin((2 * Math.PI * freq * 2.7 * x) / W + phase * 1.7);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join("");
}

const BAND_LAYERS: { d: string; o: number }[] = [];
for (let l = 0; l < 14; l++) {
  BAND_LAYERS.push({
    d: bandPath(26 + l * 2.4, 3 + (l % 5) * 0.5, (l * Math.PI) / 7, 80),
    o: 0.14 + 0.16 * Math.abs(Math.sin(l * 1.3)),
  });
}

export function GuillocheBand({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${W} 160`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {BAND_LAYERS.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke="var(--color-gilt)"
          strokeWidth="0.75"
          opacity={p.o}
          style={
            animate
              ? {
                  strokeDasharray: 1400,
                  ["--dash" as string]: 1400,
                  animation: `draw 1.6s ${0.05 * i}s cubic-bezier(0.16,1,0.3,1) both`,
                }
              : undefined
          }
        />
      ))}
    </svg>
  );
}

function rosettePath(R: number, a: number, k: number, phase: number): string {
  const pts: string[] = [];
  const steps = 240;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = R + a * Math.sin(k * t + phase);
    const x = 100 + r * Math.cos(t);
    const y = 100 + r * Math.sin(t);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join("") + "Z";
}

const ROSETTE_LAYERS: { d: string; o: number }[] = [];
for (let l = 0; l < 9; l++) {
  ROSETTE_LAYERS.push({
    d: rosettePath(46 + l * 4.6, 14 + (l % 3) * 5, 9 + (l % 4) * 3, l * 0.7),
    o: 0.16 + 0.14 * Math.abs(Math.cos(l * 1.1)),
  });
}

export function GuillocheRosette({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" focusable="false">
      {ROSETTE_LAYERS.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke="var(--color-gilt)" strokeWidth="0.7" opacity={p.o} />
      ))}
      <circle cx="100" cy="100" r="2.4" fill="var(--color-seal)" />
    </svg>
  );
}

/** Engraved section mark - a small rosette with a hairline flourish, the
    recurring glyph that opens each landing section (like a plate number). */
export function SectionMark({ center = false }: { center?: boolean }) {
  return (
    <div className={`mb-6 flex items-center gap-3 ${center ? "justify-center" : ""}`} aria-hidden="true">
      <GuillocheRosette className="h-8 w-8 opacity-60" />
      <div className="h-px w-14 bg-rule" />
    </div>
  );
}

/** Fine engraved corner marks, like a certificate's plate border. Four
    fixed-size marks (not one stretched SVG) so the engraving stays crisp and
    square on panels of any proportion. */
export function CornerOrnaments({ className = "" }: { className?: string }) {
  const mark = (
    <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true" focusable="false">
      <path d="M0.5,18 L0.5,0.5 L18,0.5" fill="none" stroke="var(--color-gilt)" strokeWidth="1" opacity="0.55" />
      <path d="M4,26 L4,4 L26,4" fill="none" stroke="var(--color-gilt)" strokeWidth="0.6" opacity="0.35" />
    </svg>
  );
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      <div className="absolute left-1.5 top-1.5">{mark}</div>
      <div className="absolute right-1.5 top-1.5 -scale-x-100">{mark}</div>
      <div className="absolute bottom-1.5 left-1.5 -scale-y-100">{mark}</div>
      <div className="absolute bottom-1.5 right-1.5 -scale-100">{mark}</div>
    </div>
  );
}

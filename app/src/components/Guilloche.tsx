/**
 * Parametric guilloche - the engraved line-work of banknotes and bond certificates.
 * Pure SVG computed from layered sinusoids (band) and polar rosettes (seal).
 * Ornament only: always aria-hidden, never behind body text.
 */

const W = 1200;
const H = 120;
const MID = H / 2;

/**
 * One strand of the woven band. Real guilloche is engine-turned: strands are
 * BOUNDED by a slow envelope and evenly phased, so they interlock into a
 * repeating motif. (Free-running sinusoids at mixed frequencies instead produce
 * a wave-interference pattern, which reads as tangled string, not engraving.)
 * `dir` flips the travel direction - two counter-phased sets cross to give the
 * lathe-work lattice.
 */
function strandPath(phase: number, freq: number, dir: 1 | -1): string {
  const pts: string[] = [];
  const steps = 720; // fine enough that crossings stay crisp at hero size
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const envelope = 34 * (0.6 + 0.4 * Math.cos((2 * Math.PI * x) / W));
    const y = MID + envelope * Math.sin((dir * 2 * Math.PI * freq * x) / W + phase);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join("");
}

const STRANDS_PER_SET = 9;
const BAND_LAYERS: { d: string; o: number }[] = [];
for (const dir of [1, -1] as const) {
  for (let k = 0; k < STRANDS_PER_SET; k++) {
    BAND_LAYERS.push({
      d: strandPath((2 * Math.PI * k) / STRANDS_PER_SET, 11, dir),
      o: 0.22 + 0.1 * Math.abs(Math.sin(k * 1.3)),
    });
  }
}

// Longer than any strand's arc length (~2050 at this amplitude/frequency), so
// the draw-in starts fully hidden.
const STRAND_DASH = 2600;

export function GuillocheBand({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      /* `slice` scales uniformly and crops the overflow. `none` would stretch
         the box anisotropically, rendering the 0.75px strokes at different
         apparent weights horizontally vs vertically - engraving depends on a
         constant stroke weight, so it must scale uniformly. */
      preserveAspectRatio="xMidYMid slice"
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
          /* Engraving is a constant hairline regardless of plate size. Without
             this, `slice` scales the stroke with the viewport - 1.2px at 1920,
             0.72px on the closing band - so the same motif prints at two
             weights. Pins it to 0.75 CSS px everywhere. */
          vectorEffect="non-scaling-stroke"
          opacity={p.o}
          style={
            animate
              ? {
                  strokeDasharray: STRAND_DASH,
                  ["--dash" as string]: STRAND_DASH,
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

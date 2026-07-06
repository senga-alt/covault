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

/** Fine engraved corner marks, like a certificate's plate border. */
export function CornerOrnaments({ className = "" }: { className?: string }) {
  const corner = (rot: number, x: number, y: number) => (
    <g transform={`translate(${x},${y}) rotate(${rot})`} key={rot}>
      <path d="M0,18 L0,0 L18,0" fill="none" stroke="var(--color-gilt)" strokeWidth="1" opacity="0.55" />
      <path d="M4,26 L4,4 L26,4" fill="none" stroke="var(--color-gilt)" strokeWidth="0.6" opacity="0.35" />
    </g>
  );
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <g transform="scale(0.28)">{corner(0, 8, 8)}</g>
      <g transform="translate(100,0) scale(-0.28,0.28)">{corner(0, 8, 8)}</g>
      <g transform="translate(0,100) scale(0.28,-0.28)">{corner(0, 8, 8)}</g>
      <g transform="translate(100,100) scale(-0.28,-0.28)">{corner(0, 8, 8)}</g>
    </svg>
  );
}

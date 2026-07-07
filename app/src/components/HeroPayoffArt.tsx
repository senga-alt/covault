/**
 * The signature hero motif: an oversized options payoff "hockey stick" (a capped
 * call) rendered as engraved line-work. Layered offset strokes give an intaglio
 * feel; the lines draw themselves in on load via stroke-dashoffset.
 * Decorative only - aria-hidden, low opacity, never carries text contrast.
 */
const W = 640;
const H = 460;
const STRIKE_X = 250;
const CAP_X = 470;
const FLOOR_Y = 360;
const CAP_Y = 90;

// capped-call payoff: flat floor -> ramp -> capped flat
function payoffPath(dy: number): string {
  const f = FLOOR_Y + dy;
  const c = CAP_Y + dy;
  return `M0,${f} L${STRIKE_X},${f} L${CAP_X},${c} L${W},${c}`;
}

const LAYERS = Array.from({ length: 5 }, (_, i) => ({
  d: payoffPath(i * 7),
  opacity: 0.28 - i * 0.045,
  delay: i * 0.12,
}));

export function HeroPayoffArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* in-the-money region under the ramp - faint gain tint */}
      <path
        d={`${payoffPath(0)} L${W},${FLOOR_Y} L${STRIKE_X},${FLOOR_Y} Z`}
        fill="var(--color-gain)"
        opacity="0.05"
      />
      {/* strike + cap guide rules, engraved dashes */}
      <line x1={STRIKE_X} y1={CAP_Y - 20} x2={STRIKE_X} y2={FLOOR_Y + 24} stroke="var(--color-gilt)" strokeWidth="0.75" strokeDasharray="3 5" opacity="0.3" />
      <line x1={CAP_X} y1={CAP_Y - 20} x2={CAP_X} y2={FLOOR_Y + 24} stroke="var(--color-gilt)" strokeWidth="0.75" strokeDasharray="3 5" opacity="0.3" />
      <line x1="0" y1={FLOOR_Y} x2={W} y2={FLOOR_Y} stroke="var(--color-gilt)" strokeWidth="0.75" opacity="0.22" />

      {/* layered payoff strokes, drawing in */}
      {LAYERS.map((l, i) => (
        <path
          key={i}
          d={l.d}
          fill="none"
          stroke={i === 0 ? "var(--color-gain)" : "var(--color-gilt)"}
          strokeWidth={i === 0 ? 2 : 1}
          opacity={l.opacity}
          style={{
            strokeDasharray: 1400,
            ["--dash" as string]: 1400,
            animation: `draw 1.8s ${0.3 + l.delay}s cubic-bezier(0.16,1,0.3,1) both`,
          }}
        />
      ))}
      {/* marker dot at the strike knee */}
      <circle cx={STRIKE_X} cy={FLOOR_Y} r="4" fill="var(--color-seal)" opacity="0.85" />
    </svg>
  );
}

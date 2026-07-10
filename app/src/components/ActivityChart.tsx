import { useState } from "react";

/**
 * On-chain activity by day: a single-series bar chart, hand-rolled SVG in the
 * engraved system. Follows the dataviz spec: thin marks with rounded data-ends
 * anchored to the baseline, recessive grid, labels in text tokens (never the
 * series color), per-mark hover/focus tooltip, and a table alternative (the
 * activity feed rendered alongside). Single series - the title names it, so
 * no legend. Mark color --color-data is validated against the dark surface.
 */
export interface DayCount {
  label: string; // short day label, e.g. "8 Jul"
  count: number;
}

const W = 640;
const H = 180;
const PAD = { l: 26, r: 8, t: 12, b: 24 };

export function ActivityChart({ days }: { days: DayCount[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(1, ...days.map((d) => d.count));
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const band = innerW / days.length;
  const barW = Math.max(2, Math.min(26, band - 2)); // thin marks, >=2px gap
  const x = (i: number) => PAD.l + i * band + (band - barW) / 2;
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;

  // integer y ticks: 0, mid, max (recessive)
  const ticks = max <= 2 ? [0, max] : [0, Math.round(max / 2), max];

  // rounded top corners, square baseline (data-end treatment)
  const bar = (i: number, v: number) => {
    const bx = x(i);
    const by = y(v);
    const h = PAD.t + innerH - by;
    const r = v === 0 ? 0 : Math.min(3, h);
    return `M${bx},${by + r} a${r},${r} 0 0 1 ${r},-${r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} h${-barW} Z`;
  };

  const active = hover !== null ? days[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Transactions per day over the last ${days.length} days`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} y1={y(t)} x2={W - PAD.r} y2={y(t)} stroke="var(--color-rule)" strokeWidth="1" opacity={t === 0 ? 1 : 0.45} />
            <text x={PAD.l - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fontFamily="var(--font-mono)" className="fill-[var(--color-paper-dim)]">
              {t}
            </text>
          </g>
        ))}
        {days.map((d, i) => (
          <g key={d.label}>
            {d.count > 0 && <path d={bar(i, d.count)} fill="var(--color-data)" opacity={hover === null || hover === i ? 1 : 0.45} style={{ transition: "opacity 150ms" }} />}
            {/* full-band hit target, keyboard reachable */}
            <rect
              x={PAD.l + i * band}
              y={PAD.t}
              width={band}
              height={innerH}
              fill="transparent"
              tabIndex={0}
              aria-label={`${d.label}: ${d.count} transaction${d.count === 1 ? "" : "s"}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              style={{ outline: "none" }}
            />
            {i % Math.max(1, Math.ceil(days.length / 7)) === 0 && (
              <text x={PAD.l + i * band + band / 2} y={H - 8} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" className="fill-[var(--color-paper-dim)]">
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {active && hover !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[2px] border border-rule bg-ink px-2.5 py-1.5 text-xs shadow-[0_8px_24px_-12px_rgba(0,0,0,0.9)]"
          style={{
            left: `${((PAD.l + hover * band + band / 2) / W) * 100}%`,
            top: `${(Math.max(y(active.count) - 34, 0) / H) * 100}%`,
          }}
        >
          <span className="text-paper-dim">{active.label}</span>{" "}
          <span className="tnum font-medium">{active.count}</span>{" "}
          <span className="text-paper-dim">tx{active.count === 1 ? "" : "s"}</span>
        </div>
      )}
    </div>
  );
}

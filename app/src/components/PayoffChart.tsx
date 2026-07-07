import { payoffPerContract, type Series } from "../lib/contract";
import { formatAmount, assetUnit } from "../lib/format";

/**
 * Payoff-at-settlement curve: the instrument's signature visual.
 * Pure computed SVG in the engraved style - hairlines, gilt markers, mono figures.
 * A text summary accompanies it (charts alone are not screen-reader friendly).
 */
export function PayoffChart({ series: s }: { series: Series }) {
  const strike = Number(s.strike);
  const cap = Number(s.maxPayoff);

  // price domain: show the whole interesting region plus headroom
  const domainMax = s.isCall ? (strike + cap) * 1.25 : strike * 1.5;
  const yMax = cap * 1.18;

  const W = 480;
  const H = 210;
  const PAD = { l: 14, r: 14, t: 16, b: 30 };
  const x = (p: number) => PAD.l + (p / domainMax) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / yMax) * (H - PAD.t - PAD.b);

  // piecewise payoff line
  const pts: [number, number][] = s.isCall
    ? [
        [0, 0],
        [strike, 0],
        [strike + cap, cap],
        [domainMax, cap],
      ]
    : [
        [0, Math.min(strike, cap)],
        [Math.max(strike - cap, 0), cap],
        [strike, 0],
        [domainMax, 0],
      ];
  const line = pts.map(([p, v], i) => `${i === 0 ? "M" : "L"}${x(p).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(domainMax).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z`;

  // settlement marker (only when settled)
  const sp = s.settled ? Number(s.settlementPrice) : null;
  const spClamped = sp !== null ? Math.min(sp, domainMax) : null;
  const payoffAtSp =
    sp !== null
      ? Math.min(s.isCall ? Math.max(sp - strike, 0) : Math.max(strike - sp, 0), cap)
      : null;

  const summary = s.isCall
    ? `Capped call: pays nothing at or below the strike of ${formatAmount(s.strike, s.asset)}, then rises one-for-one to a maximum of ${formatAmount(s.maxPayoff, s.asset)}.`
    : `Put: pays nothing at or above the strike of ${formatAmount(s.strike, s.asset)}, rising as the price falls, to a maximum of ${formatAmount(s.maxPayoff, s.asset)}.`;

  const tickLabel = (v: bigint) => formatAmount(v, s.asset, { withUnit: false });

  return (
    <figure className="border border-rule bg-ink-2 p-5">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="font-display text-lg font-bold">Payoff at settlement</span>
        <span className="text-xs text-paper-dim">{assetUnit(s.asset)} per contract</span>
      </figcaption>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="mt-3 w-full">
        {/* zero baseline + cap gridline */}
        <line x1={PAD.l} y1={y(0)} x2={W - PAD.r} y2={y(0)} stroke="var(--color-rule)" strokeWidth="1" />
        <line
          x1={PAD.l} y1={y(cap)} x2={W - PAD.r} y2={y(cap)}
          stroke="var(--color-gilt)" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.5"
        />
        <text x={W - PAD.r} y={y(cap) - 5} textAnchor="end" className="fill-[var(--color-gilt)]" fontSize="10" opacity="0.8" fontFamily="var(--font-mono)">
          max {tickLabel(s.maxPayoff)}
        </text>

        {/* strike marker */}
        <line
          x1={x(strike)} y1={PAD.t} x2={x(strike)} y2={y(0)}
          stroke="var(--color-gilt)" strokeWidth="0.75" strokeDasharray="3 4" opacity="0.5"
        />
        <text x={x(strike)} y={H - 12} textAnchor="middle" className="fill-[var(--color-paper-dim)]" fontSize="10" fontFamily="var(--font-mono)">
          strike {tickLabel(s.strike)}
        </text>

        {/* payoff region + line */}
        <path d={area} fill="var(--color-gain)" opacity="0.08" />
        <path d={line} fill="none" stroke="var(--color-gain)" strokeWidth="1.75" />

        {/* settlement price marker */}
        {spClamped !== null && payoffAtSp !== null && (
          <g>
            <line
              x1={x(spClamped)} y1={PAD.t} x2={x(spClamped)} y2={y(0)}
              stroke="var(--color-seal)" strokeWidth="1"
            />
            <circle cx={x(spClamped)} cy={y(payoffAtSp)} r="3.5" fill="var(--color-seal)" />
            <text x={x(spClamped)} y={PAD.t + 2} textAnchor="middle" dominantBaseline="hanging" className="fill-[var(--color-seal)]" fontSize="10" fontFamily="var(--font-mono)">
              settled {sp !== null && sp > domainMax ? ">" : ""}{tickLabel(s.settlementPrice)}
            </text>
          </g>
        )}

        {/* x-axis extremes */}
        <text x={PAD.l} y={H - 12} textAnchor="start" className="fill-[var(--color-paper-dim)]" fontSize="10" fontFamily="var(--font-mono)">
          0
        </text>
        <text x={W - PAD.r} y={H - 12} textAnchor="end" className="fill-[var(--color-paper-dim)]" fontSize="10" fontFamily="var(--font-mono)">
          price
        </text>
      </svg>

      <p className="sr-only">{summary}</p>
      {s.settled && (
        <p className="mt-2 border-t border-rule pt-2 text-xs text-paper-dim">
          Settled: each contract pays <span className="tnum text-gain">{formatAmount(payoffPerContract(s), s.asset)}</span> to
          the holder and returns <span className="tnum">{formatAmount(s.maxPayoff - payoffPerContract(s), s.asset)}</span> to
          the writer.
        </p>
      )}
    </figure>
  );
}

import type { Asset } from "../lib/contract";
import { formatAmount } from "../lib/format";

/**
 * The invariant, drawn: payoff and leftover as two segments of one bar that
 * always total the locked collateral. The app-register sibling of the landing
 * demo's bar - slimmer, static, figures in the caption. The bar itself is
 * decorative; the caption carries the numbers for screen readers.
 */
export function ConservedSumBar({
  payoff,
  total,
  asset,
  className,
}: {
  payoff: bigint;
  total: bigint;
  asset: Asset;
  className?: string;
}) {
  const leftover = total - payoff;
  const pct = total > 0n ? Number((payoff * 10000n) / total) / 100 : 0;
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-[2px] border border-rule" aria-hidden="true">
        <div className="bg-gain/35" style={{ width: `${pct}%` }} />
        <div
          className="grow bg-ink-3"
          style={{ borderLeft: pct > 0 && pct < 100 ? "1px solid var(--color-rule)" : "none" }}
        />
      </div>
      <p className="tnum mt-1.5 text-xs text-paper-dim">
        <span className="text-gain">{formatAmount(payoff, asset, { withUnit: false })}</span> payoff +{" "}
        {formatAmount(leftover, asset, { withUnit: false })} leftover{" "}
        <span className="text-seal">=</span> {formatAmount(total, asset)} collateral
      </p>
    </div>
  );
}

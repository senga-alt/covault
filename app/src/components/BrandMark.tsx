/**
 * The Covault mark: the brand's vault-door C (supplied render, transparent
 * cutout, optimized at public/brand/logo-mark.png). Decorative next to the
 * wordmark, so it is hidden from assistive tech. Favicons are generated from
 * the same source onto the ink tile (favicon-32/192, apple-touch-icon).
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <img
      src="/brand/logo-mark.png"
      alt=""
      aria-hidden="true"
      width={26}
      height={26}
      className={className}
    />
  );
}

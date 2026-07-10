/**
 * The Covault mark: a C-shaped vault door in engraved line-work - outline
 * annulus with flat seal-vermilion jaws, spinner handle drawn as a rosette,
 * hinge blocks on the spine. Redrawn flat from the brand concept so it sits
 * on ink and survives small sizes; the favicon ships a heavier solid build
 * of the same geometry (public/favicon.svg).
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      <path d="M 80.6,24.3 A 40,40 0 0 0 43.1,10.6 L 45.5,24.4 A 26,26 0 0 1 69.9,33.3 Z" fill="var(--color-seal)" />
      <path d="M 80.6,75.7 A 40,40 0 0 1 43.1,89.4 L 45.5,75.6 A 26,26 0 0 0 69.9,66.7 Z" fill="var(--color-seal)" />
      <path
        d="M 80.6,24.3 A 40,40 0 1 0 80.6,75.7 L 69.9,66.7 A 26,26 0 1 1 69.9,33.3 Z"
        fill="none"
        stroke="var(--color-paper)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <g stroke="var(--color-paper)" strokeWidth="2.5" strokeLinecap="round">
        <line x1="50" y1="36.5" x2="50" y2="43.5" />
        <line x1="50" y1="56.5" x2="50" y2="63.5" />
        <line x1="38.3" y1="43.25" x2="44.4" y2="46.75" />
        <line x1="55.6" y1="53.25" x2="61.7" y2="56.75" />
        <line x1="38.3" y1="56.75" x2="44.4" y2="53.25" />
        <line x1="55.6" y1="46.75" x2="61.7" y2="43.25" />
      </g>
      <circle cx="50" cy="50" r="7" fill="none" stroke="var(--color-paper)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="2.2" fill="var(--color-seal)" />
      <rect x="4" y="33.5" width="4" height="10" rx="2" fill="var(--color-paper)" />
      <rect x="4" y="56.5" width="4" height="10" rx="2" fill="var(--color-paper)" />
    </svg>
  );
}

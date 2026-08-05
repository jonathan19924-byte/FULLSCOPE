/** The Twin Lens brand mark — two overlapping rings, cream/foreground ring
 * on `currentColor` (so it adapts to light/dark automatically, unlike the
 * fixed-cream app icon which only ever sits on the dark app background)
 * plus a fixed gold accent ring. Intersection points are the exact
 * circle-circle intersection (26.935/73.065), not the ~27.2/72.8 the
 * original concept sketch used — visible as a seam at large sizes
 * otherwise. */
export function TwinLensMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="38" cy="50" r="26" stroke="currentColor" strokeWidth="6" />
      <circle cx="62" cy="50" r="26" stroke="var(--brand-gold)" strokeWidth="6" />
      <path
        d="M 50 26.935 A 26 26 0 0 1 50 73.065 A 26 26 0 0 1 50 26.935 Z"
        fill="currentColor"
      />
    </svg>
  );
}

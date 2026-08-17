/** The Twin Lens brand mark — two overlapping rings, cream/foreground ring
 * on `currentColor` (so it adapts to light/dark automatically, unlike the
 * fixed-cream app icon which only ever sits on the dark app background)
 * plus a fixed gold accent ring. The lens-shaped mask that covers the
 * overlap is traced at radius 29 (the ring's outer edge — r=26 plus half
 * the strokeWidth of 6), not the bare r=26 centerline: masking at the
 * centerline leaves the outer half of each stroke uncovered right at the
 * two crossing points, which reads as the gold ring getting pinched/cut
 * where it meets the white one. Intersection points (23.599/76.401) are
 * the exact circle-circle intersection for that r=29 mask. */
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
        d="M 50 23.599 A 29 29 0 0 1 50 76.401 A 29 29 0 0 1 50 23.599 Z"
        fill="currentColor"
      />
    </svg>
  );
}

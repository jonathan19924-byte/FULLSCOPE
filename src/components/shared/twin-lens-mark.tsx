/** The Twin Lens brand mark — two genuinely interlocking rings (both drawn
 * whole, gold never hidden) rather than the earlier design's solid lens
 * mask that hid part of the gold ring. The white ring is `currentColor` at
 * reduced opacity (so it adapts to light/dark, staying a shade dimmer than
 * the fully-opaque inner fill), gold is the fixed accent, and the small
 * gap fully enclosed by both rings' inner edges is filled solid at full
 * `currentColor` opacity. Fill intersection points (30.379/69.621) are the
 * exact circle-circle intersection at the rings' inner radius (26 - 3). */
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
      <circle cx="62" cy="50" r="26" stroke="var(--brand-gold)" strokeWidth="6" />
      <circle cx="38" cy="50" r="26" stroke="currentColor" strokeOpacity="0.85" strokeWidth="6" />
      <path
        d="M 50 30.379 A 23 23 0 0 1 50 69.621 A 23 23 0 0 1 50 30.379 Z"
        fill="currentColor"
      />
    </svg>
  );
}

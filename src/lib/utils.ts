import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Tapping the nav item for the page you're already on scrolls to top
 * instead of navigating — a same-route Link click wouldn't reset scroll
 * position on its own, so this is the whole feature. Respects reduced-motion. */
export function scrollToTop() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
}

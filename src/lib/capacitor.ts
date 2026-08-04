import { Capacitor } from "@capacitor/core";

/**
 * True when running inside the native app shell (Capacitor's WebView),
 * false in a regular browser tab. Cloudflare Turnstile's bot-check widget
 * doesn't reliably initialize inside an embedded WebView — it can fail to
 * render at all, leaving auth forms permanently stuck waiting for a token
 * that will never arrive. Gate anything Turnstile-dependent behind this
 * rather than requiring it unconditionally.
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

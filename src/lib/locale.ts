/**
 * The reversible switch for the Hebrew/Israeli pivot. Set
 * NEXT_PUBLIC_LOCALE=he to run the app in Hebrew/RTL mode with Israeli
 * sources; unset (or "en") stays on the original English/LTR/international
 * setup. Nothing English is deleted — this just gates which source list,
 * prompt language, fonts, and `dir`/`lang` get used, so reverting later is
 * flipping this env var back, not restoring from git history.
 */
export type Locale = "en" | "he";

export const LOCALE: Locale = process.env.NEXT_PUBLIC_LOCALE === "he" ? "he" : "en";
export const IS_RTL = LOCALE === "he";
export const DIR: "ltr" | "rtl" = IS_RTL ? "rtl" : "ltr";

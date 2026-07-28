import { LOCALE } from "../locale";
import { strings } from "./strings";

/** The active UI-chrome dictionary for the current locale — import `t` and
 * use it directly, e.g. `t.nav.home`. Switching NEXT_PUBLIC_LOCALE flips
 * every string in the app, same as the content pipeline. */
export const t = strings[LOCALE];

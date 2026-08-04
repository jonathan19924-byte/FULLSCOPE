import { formatDistanceToNowStrict, format } from "date-fns";
import { he } from "date-fns/locale";
import { LOCALE } from "./locale";
import { t } from "./i18n";

const dateFnsLocale = LOCALE === "he" ? { locale: he } : {};

export function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  // A timestamp that's still in the future relative to the client's clock
  // (clock skew, or a story published moments ago) would otherwise render
  // as "in 57 seconds" instead of "just now".
  if (date.getTime() > Date.now()) {
    return t.format.updatedAt(t.format.justNow);
  }
  const relative = formatDistanceToNowStrict(date, { addSuffix: true, ...dateFnsLocale });
  return t.format.updatedAt(relative);
}

export function formatFullDate(iso: string): string {
  return format(new Date(iso), "MMMM d, yyyy", dateFnsLocale);
}

export function formatReadingTime(minutes: number): string {
  return t.format.readingTime(minutes);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

import { formatDistanceToNowStrict, format } from "date-fns";
import { he } from "date-fns/locale";
import { LOCALE } from "./locale";
import { t } from "./i18n";

const dateFnsLocale = LOCALE === "he" ? { locale: he } : {};

export function formatUpdatedAt(iso: string): string {
  const relative = formatDistanceToNowStrict(new Date(iso), { addSuffix: true, ...dateFnsLocale });
  return t.format.updatedAt(relative);
}

export function formatFullDate(iso: string): string {
  return format(new Date(iso), "MMMM d, yyyy", dateFnsLocale);
}

export function formatReadingTime(minutes: number): string {
  return t.format.readingTime(minutes);
}

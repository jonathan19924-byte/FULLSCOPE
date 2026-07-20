import { formatDistanceToNowStrict, format } from "date-fns";

export function formatUpdatedAt(iso: string): string {
  return `Updated ${formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}`;
}

export function formatFullDate(iso: string): string {
  return format(new Date(iso), "MMMM d, yyyy");
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}

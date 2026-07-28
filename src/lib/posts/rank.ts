/** Ranks posts by a simple decayed score — favors likes, but lets a post's
 * rank fade over time so an old heavily-liked post doesn't permanently bury
 * new contributions. Same shape as Hacker News' classic ranking formula,
 * just tuned for a much lower-volume feed (hours, not days, matter here).
 * Deliberately simple for v1 — revisit if it doesn't feel right in
 * practice once there's real usage to look at. */
export function rankScore(likeCount: number, createdAt: string): number {
  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  return (likeCount + 1) / Math.pow(ageHours + 2, 1.5);
}

export function sortByRank<T extends { likeCount: number; createdAt: string }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => rankScore(b.likeCount, b.createdAt) - rankScore(a.likeCount, a.createdAt));
}

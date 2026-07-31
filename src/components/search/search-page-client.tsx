"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, X, UserRound } from "lucide-react";
import type { StoryWithPosts } from "@/types/domain";
import { matchesQuery, toSummary } from "@/lib/services/story-summary";
import { StoryCard } from "@/components/story/story-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/profile/follow-button";
import { useUser } from "@/components/auth/user-provider";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface SearchableProfile {
  userId: string;
  username: string;
  displayName: string | null;
}

export function SearchPageClient({
  stories,
  profiles,
}: {
  stories: StoryWithPosts[];
  profiles: SearchableProfile[];
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"stories" | "people">("stories");
  const { user } = useUser();
  const trimmed = query.trim();
  const trimmedLower = trimmed.toLowerCase();

  const storyResults = useMemo(() => {
    if (!trimmed) return [];
    return stories.filter((s) => matchesQuery(s, trimmed)).map(toSummary);
  }, [stories, trimmed]);

  const peopleResults = useMemo(() => {
    if (!trimmed) return [];
    return profiles.filter(
      (p) =>
        p.username.toLowerCase().includes(trimmedLower) ||
        (p.displayName ?? "").toLowerCase().includes(trimmedLower),
    );
  }, [profiles, trimmed, trimmedLower]);

  const results = tab === "stories" ? storyResults : peopleResults;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 pb-8">
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
        {t.search.title}
      </h1>

      <div className="relative flex items-center">
        <SearchIcon
          className="pointer-events-none absolute start-4 size-4.5 text-muted-foreground"
          strokeWidth={1.75}
        />
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search.placeholder}
          aria-label={t.search.searchAria}
          className="h-12 w-full rounded-full border border-border bg-muted/50 ps-11 pe-11 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground/40"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t.search.clearAria}
            onClick={() => setQuery("")}
            className="absolute end-1.5 rounded-full"
          >
            <X className="size-4" strokeWidth={1.75} />
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {(["stories", "people"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={tab === option}
            onClick={() => setTab(option)}
            className={cn(
              "flex-1 rounded-full border py-2 text-sm font-medium transition-colors",
              tab === option
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {option === "stories" ? t.search.storiesTab : t.search.peopleTab}
          </button>
        ))}
      </div>

      {!trimmed && (
        <EmptyState
          icon={tab === "stories" ? SearchIcon : UserRound}
          title={tab === "stories" ? t.search.searchFullScope : t.search.searchPeopleTitle}
          description={tab === "stories" ? t.search.hint : t.search.searchPeopleHint}
        />
      )}

      {trimmed && results.length === 0 && (
        <EmptyState
          icon={tab === "stories" ? SearchIcon : UserRound}
          title={tab === "stories" ? t.search.noResultsTitle : t.search.noPeopleResultsTitle}
          description={t.search.noResultsDescription(trimmed)}
        />
      )}

      {tab === "stories" && storyResults.length > 0 && (
        <div className="flex flex-col gap-4" aria-live="polite">
          <p className="text-sm text-muted-foreground">{t.posts.results(storyResults.length)}</p>
          {storyResults.map((story) => (
            <StoryCard key={story.id} story={story} variant="standard" />
          ))}
        </div>
      )}

      {tab === "people" && peopleResults.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60" aria-live="polite">
          {peopleResults.map((profile) => (
            <li key={profile.userId} className="flex items-center gap-3 py-3">
              <Link href={`/profile/${profile.username}`} className="shrink-0">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <UserRound className="size-5 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </Link>
              <Link href={`/profile/${profile.username}`} className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{profile.displayName || profile.username}</p>
                <p className="truncate text-sm text-muted-foreground">
                  <span dir="ltr" className="inline-block">@{profile.username}</span>
                </p>
              </Link>
              {user?.id !== profile.userId && <FollowButton userId={profile.userId} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { Button } from "@/components/ui/button";
import { useBlocks } from "@/lib/safety/blocks-context";
import { t } from "@/lib/i18n";

export interface BlockedAccountItem {
  userId: string;
  username: string | null;
  displayName: string | null;
}

export function BlockedAccountsPageClient({ initialBlocked }: { initialBlocked: BlockedAccountItem[] }) {
  const { blockedIds, toggleBlock } = useBlocks();
  const people = initialBlocked.filter((person) => blockedIds.includes(person.userId));

  function handleUnblock(person: BlockedAccountItem) {
    toggleBlock(person.userId);
    toast(t.safety.unblockedToast(person.username ?? person.displayName ?? t.profile.guestReader));
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex items-center gap-3">
        <BackButton ariaLabel={t.settings.backAria} />
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.safety.blockedAccountsPageTitle}
        </h1>
      </div>

      {people.length === 0 ? (
        <EmptyState icon={UserRound} title={t.safety.noBlockedTitle} description={t.safety.noBlockedDescription} />
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60">
          {people.map((person) => {
            const displayName = person.displayName || person.username || t.profile.guestReader;
            const href = person.username ? `/profile/${person.username}` : undefined;

            return (
              <li key={person.userId} className="flex items-center gap-3 py-3">
                {href ? (
                  <Link href={href} className="shrink-0">
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                      <UserRound className="size-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  </Link>
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserRound className="size-5 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link href={href} className="block min-w-0">
                      <p className="truncate font-medium text-foreground">{displayName}</p>
                      {person.username && (
                        <p className="truncate text-sm text-muted-foreground">
                          <span dir="ltr" className="inline-block">@{person.username}</span>
                        </p>
                      )}
                    </Link>
                  ) : (
                    <p className="truncate font-medium text-foreground">{displayName}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => handleUnblock(person)}
                >
                  {t.safety.unblock}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { useUser } from "@/components/auth/user-provider";
import { FollowButton } from "@/components/profile/follow-button";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { t } from "@/lib/i18n";

export interface FollowListItem {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export function FollowListPageClient({
  title,
  people,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  people: FollowListItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { user } = useUser();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex items-center gap-3">
        <BackButton ariaLabel={t.settings.backAria} />
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      {people.length === 0 ? (
        <EmptyState icon={UserRound} title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60">
          {people.map((person) => {
            const displayName = person.displayName || person.username || t.profile.guestReader;
            const href = person.username ? `/profile/${person.username}` : undefined;

            return (
              <li key={person.userId} className="flex items-center gap-3 py-3">
                {(() => {
                  const avatar = person.avatarUrl ? (
                    <div className="relative size-10 overflow-hidden rounded-full bg-muted">
                      <Image src={person.avatarUrl} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                      <UserRound className="size-5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                  );
                  return href ? (
                    <Link href={href} className="shrink-0">
                      {avatar}
                    </Link>
                  ) : (
                    <div className="shrink-0">{avatar}</div>
                  );
                })()}
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
                {user?.id !== person.userId && <FollowButton userId={person.userId} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell, Flame, Heart, MessageCircle, RefreshCw, TrendingUp, UserPlus } from "lucide-react";
import { useNotifications } from "@/lib/notifications/notifications-context";
import { messageFor, linkFor } from "@/lib/notifications/message-for";
import { EmptyState } from "@/components/shared/empty-state";
import { BackButton } from "@/components/shared/back-button";
import { formatUpdatedAt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/types/domain";
import { t } from "@/lib/i18n";

const ICON_BY_TYPE: Record<NotificationType, typeof Heart> = {
  post_liked: Heart,
  post_commented: MessageCircle,
  new_follower: UserPlus,
  post_credited: TrendingUp,
  story_updated: RefreshCw,
  trending_story: Flame,
};

export function NotificationsPageClient() {
  const { notifications, refresh, markAllRead } = useNotifications();

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (notifications.some((n) => !n.readAt)) markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex items-center gap-3">
        <BackButton ariaLabel={t.settings.backAria} />
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.notifications.title}
        </h1>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t.notifications.emptyTitle}
          description={t.notifications.emptyDescription}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const Icon = ICON_BY_TYPE[n.type];
            const href = linkFor(n);
            const row = (
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border/60 p-3.5 transition-colors",
                  href && "hover:bg-muted/60",
                  !n.readAt && "bg-muted/40",
                )}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{messageFor(n)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatUpdatedAt(n.createdAt)}</p>
                </div>
                {!n.readAt && <span className="size-2 shrink-0 rounded-full bg-foreground" aria-hidden />}
              </div>
            );

            return <li key={n.id}>{href ? <Link href={href} prefetch={false}>{row}</Link> : row}</li>;
          })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CATEGORY_META } from "@/lib/category";
import { formatUpdatedAt } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";
import { t } from "@/lib/i18n";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function username(name: string) {
  return `@${name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")}`;
}

export interface FeedPost {
  id: string;
  displayName: string;
  content: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  story?: { slug: string; title: string; category: Category };
  /** Set when this post was one of several distinct readers making the same
   * point that got folded into the story's own content. */
  contributionTheme?: string;
}

export function PostFeedCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [reply, setReply] = useState("");

  function toggleLike() {
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    toast(t.posts.repliesComingSoon);
    setReply("");
  }

  return (
    <li className="flex gap-3 px-1 py-3.5">
      <Avatar size="sm">
        <AvatarFallback>{initials(post.displayName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Dialog>
          <DialogTrigger
            render={<div className="cursor-pointer text-start" />}
          >
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="text-sm font-medium text-foreground">{post.displayName}</span>
              <span className="text-xs text-muted-foreground">{username(post.displayName)}</span>
              <span className="text-xs text-muted-foreground">· {formatUpdatedAt(post.createdAt)}</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
            {post.contributionTheme && (
              <span
                title={post.contributionTheme}
                className="flex w-fit items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
              >
                <Sparkles className="size-3" strokeWidth={1.75} />
                {t.story.shapedThisStory}
              </span>
            )}
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.posts.postDialogTitle}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-3">
              <Avatar size="sm">
                <AvatarFallback>{initials(post.displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  <span className="text-sm font-medium text-foreground">{post.displayName}</span>
                  <span className="text-xs text-muted-foreground">{username(post.displayName)}</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
                {post.story && (
                  <Link
                    href={`/story/${post.story.slug}`}
                    className={`mt-1 w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${CATEGORY_META[post.story.category].bg} ${CATEGORY_META[post.story.category].text}`}
                  >
                    {post.story.title}
                  </Link>
                )}
              </div>
            </div>
            <form onSubmit={handleReply} className="flex flex-col gap-2 border-t border-border/60 pt-3">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={t.posts.replyPlaceholder}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground/40"
              />
              <Button type="submit" size="sm" className="self-end rounded-full">
                {t.posts.reply}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-4 pt-0.5 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            aria-label={liked ? t.posts.unlike : t.posts.like}
            className="-m-1.5 flex items-center gap-1 rounded-full p-1.5 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Heart
              className={cn("size-3.5", liked && "fill-destructive text-destructive")}
              strokeWidth={1.75}
            />
            {likeCount}
          </button>
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3.5" strokeWidth={1.75} />
            {post.replyCount}
          </span>
        </div>
      </div>
    </li>
  );
}

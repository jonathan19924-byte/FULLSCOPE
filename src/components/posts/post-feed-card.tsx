"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Heart, MessageCircle, Newspaper, Sparkles } from "lucide-react";
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
import { formatUpdatedAt, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";
import { t } from "@/lib/i18n";
import { usePosts } from "@/lib/posts/posts-context";
import { useUser } from "@/components/auth/user-provider";

function username(name: string) {
  return `@${name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")}`;
}

export interface FeedPost {
  id: string;
  displayName: string;
  /** The author's @handle — present only for real community posts whose
   * author has claimed a username. Makes the author name/avatar a link to
   * their public profile; absent for seed/generated posts, which have no
   * real profile to link to. */
  authorUsername?: string;
  /** The author's user id — present only for real community posts, used to
   * check "is this someone I follow" for the Following feed toggle. */
  authorUserId?: string;
  content: string;
  createdAt: string;
  likeCount: number;
  replyCount: number;
  story?: { slug: string; title: string; category: Category };
  /** Set when this post was one of several distinct readers making the same
   * point that got folded into the story's own content. */
  contributionTheme?: string;
  /** Present only for real community posts — enables real, persisted
   * liking via toggleCommunityPostLikeAction. Seed/generated posts have no
   * backing row to like against, so they keep the old local-only toggle. */
  communityPostId?: string;
  likedByMe?: boolean;
}

export function PostFeedCard({ post }: { post: FeedPost }) {
  const { toggleLike: toggleCommunityLike } = usePosts();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isCommunityPost = post.communityPostId !== undefined;
  const [localLiked, setLocalLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount);
  const [reply, setReply] = useState("");

  const liked = isCommunityPost ? (post.likedByMe ?? false) : localLiked;
  const likeCount = isCommunityPost ? post.likeCount : localLikeCount;

  function toggleLike() {
    if (isCommunityPost) {
      if (!user) {
        toast(t.shared.signInToLike);
        router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
        return;
      }
      toggleCommunityLike(post.communityPostId!);
      return;
    }

    setLocalLiked((v) => !v);
    setLocalLikeCount((c) => (localLiked ? c - 1 : c + 1));
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    toast(t.posts.repliesComingSoon);
    setReply("");
  }

  const avatarEl = (
    <Avatar size="sm">
      <AvatarFallback>{initials(post.displayName)}</AvatarFallback>
    </Avatar>
  );

  return (
    <li className="flex gap-3 px-4 py-4">
      {post.authorUsername ? (
        <Link href={`/profile/${post.authorUsername}`} className="shrink-0">
          {avatarEl}
        </Link>
      ) : (
        avatarEl
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Dialog>
          <DialogTrigger
            render={<div className="cursor-pointer text-start" />}
          >
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {post.authorUsername ? (
                <Link
                  href={`/profile/${post.authorUsername}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  {post.displayName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-foreground">{post.displayName}</span>
              )}
              {post.authorUsername ? (
                <span dir="ltr" className="inline-block text-xs text-muted-foreground">
                  @{post.authorUsername}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{username(post.displayName)}</span>
              )}
              <span className="text-xs text-muted-foreground">· {formatUpdatedAt(post.createdAt)}</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
            {post.story && (
              <Link
                href={`/story/${post.story.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="flex w-fit min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                <Newspaper className="size-3 shrink-0" strokeWidth={1.75} />
                {t.posts.seeRelatedStory}
              </Link>
            )}
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
                  {post.authorUsername ? (
                    <span dir="ltr" className="inline-block text-xs text-muted-foreground">
                      @{post.authorUsername}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{username(post.displayName)}</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
                {post.story && (
                  <Link
                    href={`/story/${post.story.slug}`}
                    className="mt-1 flex w-fit items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <Newspaper className="size-3 shrink-0" strokeWidth={1.75} />
                    {t.posts.seeRelatedStory}
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

"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Flag, Heart, MessageCircle, MoreHorizontal, Newspaper, Sparkles, UserX } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/components/safety/report-dialog";
import { formatUpdatedAt, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";
import { t } from "@/lib/i18n";
import { usePosts } from "@/lib/posts/posts-context";
import { useUser } from "@/components/auth/user-provider";
import { useBlocks } from "@/lib/safety/blocks-context";
import type { ReportTargetType } from "@/lib/safety/actions";

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
  /** A publicly-readable photo URL — present only for real community posts
   * whose attached photo passed the moderation check run at creation time. */
  mediaUrl?: string;
  /** The author's profile photo — present only once it's passed
   * moderation; undefined falls back to the colored-initials circle. */
  authorAvatarUrl?: string;
}

export function PostFeedCard({ post }: { post: FeedPost }) {
  const { toggleLike: toggleCommunityLike } = usePosts();
  const { user } = useUser();
  const { toggleBlock } = useBlocks();
  const router = useRouter();
  const pathname = usePathname();

  const isCommunityPost = post.communityPostId !== undefined;
  const [localLiked, setLocalLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.likeCount);
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(null);

  function requireSignIn(message: string) {
    toast(message);
    router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }

  function handleReport(type: ReportTargetType, id: string) {
    if (!user) {
      requireSignIn(t.safety.signInToReport);
      return;
    }
    setReportTarget({ type, id });
  }

  function handleBlock() {
    if (!user) {
      requireSignIn(t.safety.signInToBlock);
      return;
    }
    if (!post.authorUserId) return;
    toggleBlock(post.authorUserId);
    toast(t.safety.blockedToast(post.authorUsername ?? post.displayName), {
      description: t.safety.blockedToastDescription,
    });
  }

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

  const avatarEl = (
    <Avatar size="sm">
      <AvatarFallback>{initials(post.displayName)}</AvatarFallback>
    </Avatar>
  );

  return (
    <li className="flex gap-3 px-4 py-4">
      {post.authorUsername ? (
        <Link href={`/profile/${post.authorUsername}`} prefetch={false} className="shrink-0">
          {avatarEl}
        </Link>
      ) : (
        avatarEl
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start gap-1">
          <div
            role="link"
            tabIndex={0}
            onClick={() => router.push(`/posts/${post.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/posts/${post.id}`);
              }
            }}
            className="min-w-0 flex-1 cursor-pointer text-start"
          >
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              {post.authorUsername ? (
                <Link
                  href={`/profile/${post.authorUsername}`}
                  prefetch={false}
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
            {post.mediaUrl && (
              <Image
                src={post.mediaUrl}
                alt=""
                width={480}
                height={480}
                className="max-h-80 w-full rounded-xl border border-border/60 object-cover"
              />
            )}
            {post.story && (
              <Link
                href={`/story/${post.story.slug}`}
                prefetch={false}
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
          </div>

          {isCommunityPost && post.authorUserId && post.authorUserId !== user?.id && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t.safety.moreOptionsAria}
                render={
                  <button
                    type="button"
                    className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  />
                }
              >
                <MoreHorizontal className="size-4" strokeWidth={1.75} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleReport("post", post.communityPostId!)}>
                  <Flag className="size-3.5" strokeWidth={1.75} />
                  {t.safety.reportPost}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock}>
                  <UserX className="size-3.5" strokeWidth={1.75} />
                  {t.safety.blockUser(post.authorUsername ?? post.displayName)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

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
            {likeCount > 0 && likeCount}
          </button>
          <Link
            href={`/posts/${post.id}`}
            prefetch={false}
            className="-m-1.5 flex items-center gap-1 rounded-full p-1.5 transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="size-3.5" strokeWidth={1.75} />
            {post.replyCount > 0 && post.replyCount}
          </Link>
        </div>
      </div>

      {reportTarget && (
        <ReportDialog
          open={reportTarget !== null}
          onOpenChange={(open) => !open && setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
        />
      )}
    </li>
  );
}

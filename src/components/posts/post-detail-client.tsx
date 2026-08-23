"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ChevronRight, Flag, Heart, MessageCircle, MoreHorizontal, Newspaper, Sparkles, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/components/safety/report-dialog";
import { formatUpdatedAt, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PostComment } from "@/types/domain";
import { t } from "@/lib/i18n";
import { useUser } from "@/components/auth/user-provider";
import { useBlocks } from "@/lib/safety/blocks-context";
import { addCommentAction, deleteCommentAction, toggleCommunityPostLikeAction } from "@/lib/posts/actions";
import type { ReportTargetType } from "@/lib/safety/actions";
import type { FeedPost } from "@/components/posts/post-feed-card";

function username(name: string) {
  return `@${name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")}`;
}

export function PostDetailClient({
  post,
  initialComments,
}: {
  post: FeedPost;
  initialComments: PostComment[];
}) {
  const { user } = useUser();
  const { toggleBlock } = useBlocks();
  const router = useRouter();
  const pathname = usePathname();

  const isCommunityPost = post.communityPostId !== undefined;
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isToggling, setIsToggling] = useState(false);
  const [reply, setReply] = useState("");
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(null);
  const [comments, setComments] = useState<PostComment[]>(initialComments);
  const [commentCount, setCommentCount] = useState(post.replyCount);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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

  async function toggleLike() {
    if (!isCommunityPost) {
      setLiked((v) => !v);
      setLikeCount((c) => (liked ? c - 1 : c + 1));
      return;
    }

    if (!user) {
      toast(t.shared.signInToLike);
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isToggling) return;
    setIsToggling(true);

    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));

    const result = await toggleCommunityPostLikeAction(post.communityPostId!);
    setIsToggling(false);

    if ("error" in result) {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
      return;
    }

    setLiked(result.liked);
    setLikeCount(result.likeCount);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reply.trim();
    if (!trimmed) return;

    if (!user) {
      toast(t.shared.signInToComment);
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setIsSubmittingComment(true);
    const result = await addCommentAction(post.communityPostId!, trimmed);
    setIsSubmittingComment(false);

    if ("error" in result) {
      toast(t.posts.couldntComment, { description: result.error });
      return;
    }

    setComments((current) => [...current, result.comment]);
    setCommentCount((c) => c + 1);
    setReply("");
  }

  async function handleDeleteComment(commentId: string) {
    const result = await deleteCommentAction(commentId);
    if ("error" in result) {
      toast(t.posts.couldntComment, { description: result.error });
      return;
    }
    setComments((current) => current.filter((c) => c.id !== commentId));
    setCommentCount((c) => Math.max(0, c - 1));
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 pb-10">
      <Link
        href="/posts"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4 rtl:rotate-180" strokeWidth={1.75} />
        {t.posts.viewAllPosts}
      </Link>

      <div className="flex gap-3">
        {post.authorUsername ? (
          <Link href={`/profile/${post.authorUsername}`} className="shrink-0">
            <Avatar size="sm">
              {post.authorAvatarUrl && <AvatarImage src={post.authorAvatarUrl} alt="" />}
              <AvatarFallback>{initials(post.displayName)}</AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Avatar size="sm">
            <AvatarFallback>{initials(post.displayName)}</AvatarFallback>
          </Avatar>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-start gap-1">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {post.authorUsername ? (
                  <Link
                    href={`/profile/${post.authorUsername}`}
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
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{post.content}</p>
              {post.mediaUrl && (
                <Image
                  src={post.mediaUrl}
                  alt=""
                  width={480}
                  height={480}
                  className="mt-2 max-h-96 w-full rounded-xl border border-border/60 object-cover"
                />
              )}
              {post.story && (
                <Link
                  href={`/story/${post.story.slug}`}
                  className="mt-2 flex w-fit min-w-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <Newspaper className="size-3 shrink-0" strokeWidth={1.75} />
                  {t.posts.seeRelatedStory}
                </Link>
              )}
              {post.contributionTheme && (
                <span
                  title={post.contributionTheme}
                  className="mt-2 flex w-fit items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
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
              <Heart className={cn("size-3.5", liked && "fill-destructive text-destructive")} strokeWidth={1.75} />
              {likeCount > 0 && likeCount}
            </button>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3.5" strokeWidth={1.75} />
              {commentCount > 0 && commentCount}
            </span>
          </div>
        </div>
      </div>

      {isCommunityPost && (
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
          {comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.posts.noCommentsYet}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-2">
                  <Avatar size="sm">
                    {comment.avatarUrl && <AvatarImage src={comment.avatarUrl} alt="" />}
                    <AvatarFallback>{initials(comment.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">{comment.displayName}</span>
                      <span className="text-[11px] text-muted-foreground">
                        · {formatUpdatedAt(comment.createdAt)}
                      </span>
                      {user?.id === comment.userId ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(comment.id)}
                          aria-label={t.posts.deleteCommentAria}
                          className="ms-auto text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" strokeWidth={1.75} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReport("comment", comment.id)}
                          aria-label={t.safety.reportComment}
                          className="ms-auto text-muted-foreground hover:text-foreground"
                        >
                          <Flag className="size-3" strokeWidth={1.75} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90">{comment.content}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleReply} className="flex flex-col gap-2 border-t border-border/60 pt-3">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t.posts.replyPlaceholder}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground/40"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSubmittingComment || !reply.trim()}
              className="self-end rounded-full"
            >
              {isSubmittingComment ? t.posts.commenting : t.posts.reply}
            </Button>
          </form>
        </div>
      )}

      {reportTarget && (
        <ReportDialog
          open={reportTarget !== null}
          onOpenChange={(open) => !open && setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
        />
      )}
    </div>
  );
}

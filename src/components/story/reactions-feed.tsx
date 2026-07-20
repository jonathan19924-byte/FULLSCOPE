"use client";

import { useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import type { Post } from "@/types/domain";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
  return `@${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

function PostCard({ post, label }: { post: Post; label: string }) {
  return (
    <li className="flex gap-3 rounded-xl border border-border/60 bg-card p-3.5">
      <Avatar size="sm">
        <AvatarFallback>{initials(post.displayName)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">{post.displayName}</span>
          <span className="text-xs text-muted-foreground">{username(post.displayName)}</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{post.content}</p>
        <div className="flex items-center gap-4 pt-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="size-3.5" strokeWidth={1.75} />
            {post.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="size-3.5" strokeWidth={1.75} />
            {post.replyCount}
          </span>
        </div>
      </div>
    </li>
  );
}

export function ReactionsFeed({
  posts,
  perspectiveAName,
  perspectiveBName,
}: {
  posts: Post[];
  perspectiveAName: string;
  perspectiveBName: string;
}) {
  const [tab, setTab] = useState<"A" | "B">("A");
  const postsA = posts.filter((p) => p.perspective === "A");
  const postsB = posts.filter((p) => p.perspective === "B");

  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="reactions-heading" className="flex flex-col gap-3">
      <h2 id="reactions-heading" className="font-serif text-lg font-semibold text-foreground">
        Public reactions
      </h2>
      <p className="text-xs text-muted-foreground">
        A sample of reactions representing each perspective. Visual only in this preview.
      </p>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "A" | "B")}>
        <TabsList className={cn("w-full")}>
          <TabsTrigger value="A">{perspectiveAName} ({postsA.length})</TabsTrigger>
          <TabsTrigger value="B">{perspectiveBName} ({postsB.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="A">
          <ul className="flex flex-col gap-2.5 pt-3">
            {postsA.map((post) => (
              <PostCard key={post.id} post={post} label="Perspective A" />
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="B">
          <ul className="flex flex-col gap-2.5 pt-3">
            {postsB.map((post) => (
              <PostCard key={post.id} post={post} label="Perspective B" />
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </section>
  );
}

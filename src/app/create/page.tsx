import type { Metadata } from "next";
import { listStorySummaries } from "@/lib/services/story-service";
import { CreatePostForm } from "@/components/posts/create-post-form";

export const metadata: Metadata = { title: "Create Post" };

export default async function CreatePage() {
  const stories = await listStorySummaries();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Create Post
        </h1>
        <p className="text-sm text-muted-foreground">
          Share a quick reaction to the news. Visible to everyone on the Posts feed.
        </p>
      </div>
      <CreatePostForm stories={stories} />
    </div>
  );
}

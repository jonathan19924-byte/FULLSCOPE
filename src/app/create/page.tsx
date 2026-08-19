import type { Metadata } from "next";
import { CreatePostForm } from "@/components/posts/create-post-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.posts.createPageTitle };

export default function CreatePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.posts.createPageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{t.posts.createPageDescription}</p>
      </div>
      <CreatePostForm />
    </div>
  );
}

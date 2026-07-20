"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  title: string;
  text: string;
  path: string;
  className?: string;
}

export async function shareStory({ title, text, path }: ShareButtonProps) {
  const url = `${window.location.origin}${path}`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch {
      // User cancelled the native share sheet — nothing to do.
    }
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    toast("Link copied", { description: "Story link copied to your clipboard." });
  } catch {
    toast("Couldn't copy the link", {
      description: "Copy it manually from your browser's address bar.",
    });
  }
}

export function ShareButton({ title, text, path, className }: ShareButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Share ${title}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void shareStory({ title, text, path });
      }}
      className={cn("rounded-full", className)}
    >
      <Share2 strokeWidth={1.75} />
    </Button>
  );
}

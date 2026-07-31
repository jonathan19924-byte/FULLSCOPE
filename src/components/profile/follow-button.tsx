"use client";

import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { useFollows } from "@/lib/follows/follows-context";
import { useUser } from "@/components/auth/user-provider";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function FollowButton({ userId }: { userId: string }) {
  const { user } = useUser();
  const { isFollowing, toggleFollow } = useFollows();
  const router = useRouter();
  const pathname = usePathname();

  const following = isFollowing(userId);

  function handleClick() {
    if (!user) {
      toast(t.profile.signInToFollow);
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }
    toggleFollow(userId);
  }

  return (
    <Button
      type="button"
      variant={following ? "outline" : "default"}
      size="sm"
      className="rounded-full"
      onClick={handleClick}
    >
      {following ? t.profile.following : t.profile.follow}
    </Button>
  );
}

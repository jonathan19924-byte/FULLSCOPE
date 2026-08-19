"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { updateNotificationPreferenceAction, type NotificationPreferenceKey } from "@/lib/notifications/actions";
import { t } from "@/lib/i18n";

export function NotificationPreferenceToggle({
  icon: Icon,
  title,
  description,
  preferenceKey,
  defaultChecked,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  preferenceKey: NotificationPreferenceKey;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      const result = await updateNotificationPreferenceAction(preferenceKey, next);
      if ("error" in result) {
        setChecked(!next);
        toast(t.settings.couldntUpdatePreference, { description: result.error });
      }
    });
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={handleChange} disabled={isPending} />
    </div>
  );
}

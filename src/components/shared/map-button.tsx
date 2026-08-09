"use client";

import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface MapButtonProps {
  place: string;
  className?: string;
}

/** Links out to a Google Maps search by place name — no geocoding API or
 * coordinates needed, Google's own search resolves the name. Only rendered
 * by the caller when a story actually has a locationName. */
export function MapButton({ place, className }: MapButtonProps) {
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t.shared.mapAria(place)}
      render={
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        />
      }
      className={cn("rounded-full", className)}
    >
      <MapPin strokeWidth={1.75} />
    </Button>
  );
}

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const FEEDBACK_EMAIL = "jonathan19924@gmail.com";

function SegmentedField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
              value === option
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const sharedClassName =
    "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground/40";
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={sharedClassName}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={sharedClassName}
        />
      )}
    </label>
  );
}

export function FeedbackForm() {
  const [impression, setImpression] = useState("");
  const [device, setDevice] = useState("");
  const [storyTested, setStoryTested] = useState("");
  const [stoodOut, setStoodOut] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const subject = t.feedback.mailSubject;
    const body = [
      `${t.feedback.mailOverallImpression}${impression || t.feedback.mailNotAnswered}`,
      `${t.feedback.mailDeviceType}${device || t.feedback.mailNotAnswered}`,
      `${t.feedback.mailStoryTested}${storyTested || t.feedback.mailNone}`,
      `${t.feedback.mailStoodOut}${stoodOut || t.feedback.mailNone}`,
    ].join("\n");

    const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <SegmentedField
        label={t.feedback.overallImpression}
        options={t.feedback.impressions}
        value={impression}
        onChange={setImpression}
      />
      <SegmentedField label={t.feedback.deviceType} options={t.feedback.devices} value={device} onChange={setDevice} />
      <TextField
        label={t.feedback.whichStory}
        value={storyTested}
        onChange={setStoryTested}
        placeholder={t.feedback.whichStoryPlaceholder}
      />
      <TextField
        label={t.feedback.stoodOut}
        value={stoodOut}
        onChange={setStoodOut}
        multiline
      />

      <Button type="submit" size="lg" className="h-12 w-full rounded-full">
        {t.feedback.send}
      </Button>

      {sent && (
        <p className="text-center text-sm text-muted-foreground" role="status">
          {t.feedback.sentDescription}
        </p>
      )}
    </form>
  );
}

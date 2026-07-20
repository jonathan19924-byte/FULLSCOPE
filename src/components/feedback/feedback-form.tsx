"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const FEEDBACK_EMAIL = "jonathan19924@gmail.com";

const IMPRESSIONS = ["Great", "Good", "Okay", "Poor"] as const;
const DEVICES = ["Phone", "Tablet", "Desktop"] as const;

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
  const [mostUseful, setMostUseful] = useState("");
  const [confusing, setConfusing] = useState("");
  const [unnecessary, setUnnecessary] = useState("");
  const [comments, setComments] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const subject = "FullScope feedback";
    const body = [
      `Overall impression: ${impression || "(not answered)"}`,
      `Device type: ${device || "(not answered)"}`,
      `Story tested: ${storyTested || "(not answered)"}`,
      `What was most useful: ${mostUseful || "(not answered)"}`,
      `What was confusing: ${confusing || "(not answered)"}`,
      `What felt unnecessary: ${unnecessary || "(not answered)"}`,
      `Additional comments: ${comments || "(none)"}`,
    ].join("\n");

    const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSent(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <SegmentedField
        label="Overall impression"
        options={IMPRESSIONS}
        value={impression}
        onChange={setImpression}
      />
      <SegmentedField label="Device type" options={DEVICES} value={device} onChange={setDevice} />
      <TextField
        label="Which story did you test?"
        value={storyTested}
        onChange={setStoryTested}
        placeholder="e.g. Senate Rejects War Powers Resolution"
      />
      <TextField
        label="What was most useful?"
        value={mostUseful}
        onChange={setMostUseful}
        multiline
      />
      <TextField
        label="What was confusing?"
        value={confusing}
        onChange={setConfusing}
        multiline
      />
      <TextField
        label="What felt unnecessary?"
        value={unnecessary}
        onChange={setUnnecessary}
        multiline
      />
      <TextField
        label="Anything else? (optional)"
        value={comments}
        onChange={setComments}
        multiline
      />

      <Button type="submit" size="lg" className="h-12 w-full rounded-full">
        Send feedback
      </Button>

      {sent && (
        <p className="text-center text-sm text-muted-foreground" role="status">
          Your email app should have opened with your feedback pre-filled — just hit send.
        </p>
      )}
    </form>
  );
}

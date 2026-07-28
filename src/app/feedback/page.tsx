import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/feedback-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.feedback.title };

export default function FeedbackPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.feedback.title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.feedback.description}</p>
      </div>
      <FeedbackForm />
    </div>
  );
}

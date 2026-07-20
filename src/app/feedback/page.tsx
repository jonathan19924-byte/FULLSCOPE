import type { Metadata } from "next";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export const metadata: Metadata = { title: "Send Feedback" };

export default function FeedbackPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Send Feedback
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          FullScope is an early test version. Your answers help decide what to
          build next — this opens your email app with your answers filled in,
          so you can review before sending.
        </p>
      </div>
      <FeedbackForm />
    </div>
  );
}

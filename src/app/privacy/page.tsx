import type { Metadata } from "next";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.privacy.title };

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-16">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.privacy.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.privacy.lastUpdated}</p>
      </div>

      <p className="text-sm leading-relaxed text-foreground/90">{t.privacy.intro}</p>

      <div className="flex flex-col gap-6">
        {t.privacy.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-1.5">
            <h2 className="text-base font-semibold text-foreground">{section.heading}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

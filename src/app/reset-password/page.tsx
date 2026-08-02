import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.resetPasswordTitle };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 pt-10 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.auth.resetPasswordTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{t.auth.resetPasswordDescription}</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}

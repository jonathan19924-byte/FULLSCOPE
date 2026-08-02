import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.forgotPasswordTitle };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 pt-10 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.auth.forgotPasswordTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{t.auth.forgotPasswordDescription}</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}

import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.forgotPasswordTitle };

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      title={t.auth.forgotPasswordTitle}
      description={t.auth.forgotPasswordDescription}
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}

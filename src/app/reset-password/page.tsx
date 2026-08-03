import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.resetPasswordTitle };

export default function ResetPasswordPage() {
  return (
    <AuthPageShell title={t.auth.resetPasswordTitle} description={t.auth.resetPasswordDescription}>
      <ResetPasswordForm />
    </AuthPageShell>
  );
}

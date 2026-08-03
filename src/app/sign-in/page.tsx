import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.signInTitle };

export default function SignInPage() {
  return (
    <AuthPageShell title={t.auth.welcomeBack} description={t.auth.signInDescription}>
      <SignInForm />
    </AuthPageShell>
  );
}

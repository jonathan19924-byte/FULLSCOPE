import type { Metadata } from "next";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.auth.signUpTitle };

export default function SignUpPage() {
  return (
    <AuthPageShell title={t.auth.createYourAccount} description={t.auth.signUpDescription}>
      <SignUpForm />
    </AuthPageShell>
  );
}

import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Sign In" };

export default function SignInPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 pt-10 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in to bookmark stories and post your own reactions.
        </p>
      </div>
      <SignInForm />
    </div>
  );
}

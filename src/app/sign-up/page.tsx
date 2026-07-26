import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Sign Up" };

export default function SignUpPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 pt-10 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign up to bookmark stories and post your own reactions.
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}

import Link from "next/link";
import { TwinLensMark } from "@/components/shared/twin-lens-mark";

interface AuthPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 pt-14 pb-10">
      <Link href="/" className="flex flex-col items-center gap-2 text-center text-foreground">
        <TwinLensMark size={40} />
        <span className="font-serif text-2xl font-semibold tracking-tight">FullScope</span>
      </Link>

      <div className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

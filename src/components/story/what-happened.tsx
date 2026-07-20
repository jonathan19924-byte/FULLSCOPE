export function WhatHappened({ text }: { text: string }) {
  return (
    <section aria-labelledby="what-happened-heading" className="flex flex-col gap-2">
      <h2 id="what-happened-heading" className="font-serif text-lg font-semibold text-foreground">
        What happened
      </h2>
      <p className="text-[15px] leading-relaxed text-foreground/90">{text}</p>
    </section>
  );
}

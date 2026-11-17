import type { ReactNode } from "react";

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="shell pb-[var(--section)] pt-[calc(var(--nav-h)+5rem)]">
      <h1 className="t-display t-xl text-bone">{title}</h1>
      <div className="legal mt-14 max-w-[70ch] space-y-10 text-fog [&_a]:text-bone [&_a]:underline [&_a]:underline-offset-4 [&_h2]:t-title [&_h2]:mb-3 [&_h2]:text-bone [&_p+p]:mt-3">
        {children}
      </div>
    </article>
  );
}

/** Deutlicher Hinweis auf fehlende Pflichtangaben – verschwindet, sobald legal.ts befüllt ist. */
export function Missing({ children }: { children: ReactNode }) {
  return (
    <span className="my-1 block rounded-[0.75rem] bg-red/10 px-4 py-3 text-[0.9375rem] text-bone ring-1 ring-red/60">
      <strong className="font-[700] text-red">Fehlt noch:</strong> {children}
    </span>
  );
}

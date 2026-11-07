import { Link } from "@tanstack/react-router";
import { Section, stagger } from "./section";

const STEPS = [
  { t: "Reiseziel wählen", d: "Suche dein Land oder deine Region und wähle ein Datenpaket oder Unlimited." },
  { t: "Bezahlen", d: "Mit Karte, Apple Pay oder Google Pay. Die eSIM kommt sofort per E-Mail." },
  { t: "QR-Code scannen", d: "Einmal installieren, am Reiseziel einschalten, online sein." },
];

export function HowItWorks() {
  return (
    <Section labelledBy="how-h" tone="band" className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
      <div>
        <h2 id="how-h">So funktioniert's</h2>
        <ol className="mt-8">
          {STEPS.map((s, i) => (
            <li
              key={s.t}
              style={stagger("--reveal-i", i)}
              className="reveal relative flex gap-4 pb-8 last:pb-0 sm:gap-5 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:left-5 [&:not(:last-child)]:before:top-12 [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-line-strong [&:not(:last-child)]:before:content-['']"
            >
              <span className="tabular flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 font-display text-lg font-semibold text-primary">{i + 1}</span>
              <div className="min-w-0 pt-1.5">
                <h3 className="text-lg lg:text-xl">{s.t}</h3>
                <p className="mt-1 text-ink-muted">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link to="/how-it-works" className="mt-8 inline-flex min-h-10 items-center font-medium text-primary underline decoration-transparent underline-offset-4 transition-[text-decoration-color] duration-(--dur-hover) ease-ui-out hover:decoration-current">Ausführliche Anleitung</Link>
      </div>
      <PhoneMockup />
    </Section>
  );
}

function PhoneMockup() {
  return (
    <div className="reveal mx-auto w-[260px] rounded-[40px] border border-line-strong bg-paper p-3" aria-hidden>
      <div className="rounded-[30px] border border-line bg-surface px-5 pb-8 pt-6">
        <div className="mx-auto h-1.5 w-16 rounded-full bg-line" />
        <div className="mt-6 font-display text-lg font-semibold tracking-[-0.02em]">
          <span>Globe</span><span className="text-primary">SIM</span>
        </div>
        <div className="mt-5 rounded-lg border border-line p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Meine eSIM</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2 py-0.5 text-xs">
              <span className="size-1.5 rounded-full bg-mint" /> Aktiv
            </span>
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted"><div className="h-2 w-2/5 rounded-full bg-primary" /></div>
          <div className="mt-2 flex justify-between text-xs text-ink-muted"><span>Verbrauch</span><span>Restlaufzeit</span></div>
        </div>
        <div className="mt-3 rounded-lg border border-line p-4 text-xs text-ink-muted">Installiert · Datenroaming an</div>
      </div>
    </div>
  );
}

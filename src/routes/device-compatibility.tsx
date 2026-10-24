import { createFileRoute } from "@tanstack/react-router";
import { Cpu, LockSimpleOpen, ArrowDown } from "@phosphor-icons/react";
import { SiteLayout } from "@/components/layout";
import { DeviceFinder } from "@/components/compat-check";
import { LinkButton } from "@/components/ui-kit";
import { pageIdentity } from "@/lib/seo";

export const Route = createFileRoute("/device-compatibility")({
  head: () => ({
    meta: [
      { title: "Ist mein Handy eSIM-fähig? Gerätekompatibilität | GlobeSIM" },
      { name: "description", content: "Prüfe, ob dein Gerät eSIMs unterstützt und nicht an einen Anbieter gebunden ist. Mit Geräteliste nach Hersteller." },
      { property: "og:title", content: "Gerätekompatibilität | GlobeSIM" },
      { property: "og:description", content: "So prüfst du, ob du eine GlobeSIM verwenden kannst." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      ...pageIdentity("/device-compatibility").meta,
    ],
    links: pageIdentity("/device-compatibility").links,
  }),
  component: DeviceCompatibility,
});

const JUMPS = [
  { id: "pruefen", label: "So überprüfst du, ob du GlobeSIM verwenden kannst" },
  { id: "geraete", label: "Welche Geräte unterstützen eSIMs?" },
];

function DeviceCompatibility() {
  return (
    <SiteLayout>
      <section className="container-page max-w-5xl pt-10 lg:pt-16">
        <h1 className="text-5xl leading-[1.05] lg:text-6xl">Gerätekompatibilität</h1>
        <p className="mt-6 text-lg font-semibold text-ink">Jedes GlobeSIM-Paket ist eine eSIM.</p>
        <p className="mt-3 max-w-xl text-ink-muted">Dein Gerät muss eSIMs unterstützen und darf keine Netzbetreiber-Sperre haben, damit du GlobeSIM nutzen kannst.</p>
        <nav aria-label="Auf dieser Seite" className="mt-10 grid gap-3 sm:grid-cols-2">
          {JUMPS.map((j) => (
            <a key={j.id} href={`#${j.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-primary">
              {j.label}<ArrowDown size={18} aria-hidden className="shrink-0" />
            </a>
          ))}
        </nav>
      </section>

      <section id="pruefen" className="container-page mt-16 max-w-5xl scroll-mt-24">
        <h2 className="text-3xl lg:text-4xl">So überprüfst du, ob du GlobeSIM verwenden kannst</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          <li className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <span className="grid size-12 place-items-center rounded-full bg-mint/30 text-ink"><Cpu size={24} aria-hidden /></span>
            <h3 className="mt-5 text-lg font-semibold">Stelle sicher, dass dein Gerät eSIMs unterstützt</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">Das siehst du in der Regel in den Einstellungen deines Geräts im Bereich „SIM-Karten“ oder „Mobilfunk“. Unten findest du außerdem unsere Geräteliste.</p>
          </li>
          <li className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <span className="grid size-12 place-items-center rounded-full bg-primary/15 text-ink"><LockSimpleOpen size={24} aria-hidden /></span>
            <h3 className="mt-5 text-lg font-semibold">Stelle sicher, dass dein Gerät nicht an einen Anbieter gebunden ist</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">Ob eine Sperre (SIM-Lock) besteht, siehst du in den Einstellungen deines Geräts. Im Zweifel fragst du deinen Mobilfunkanbieter. Auch ein Jailbreak (iOS) oder Root (Android) kann Probleme machen.</p>
          </li>
        </ul>
      </section>

      <section id="geraete" className="container-page mt-16 max-w-3xl scroll-mt-24 pb-20">
        <div className="rounded-[2rem] border border-line bg-surface p-6 shadow-sm lg:p-10">
          <h2 className="text-2xl">Welche Geräte unterstützen eSIMs?</h2>
          <p className="mt-3 text-sm text-ink-muted">Unsere Liste wird regelmäßig aktualisiert, ist aber nicht vollständig. Einige regionale Modelle unterstützen kein eSIM. Frag im Zweifel den Hersteller.</p>
          <DeviceFinder />
        </div>
        <div className="mt-8"><LinkButton to="/destinations">Reiseziel wählen</LinkButton></div>
      </section>
    </SiteLayout>
  );
}

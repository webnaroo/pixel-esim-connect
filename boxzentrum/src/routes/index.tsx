import type { CSSProperties } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { NowNext } from "@/components/now-next";
import { CourseIndex } from "@/components/course-index";
import { WeekStrip } from "@/components/week-strip";
import { SectionHead, TrialCta } from "@/components/blocks";
import { ArrowRight, ArrowUpRight, Facebook, Instagram, Star } from "@/components/icons";
import { courseBySlug, courses, tracks } from "@/content/courses";
import { courseDays } from "@/lib/format";
import { principles, site } from "@/content/site";
import { team } from "@/content/team";
import { weekSlots } from "@/content/schedule";
import { seo } from "@/lib/seo";
import { localBusiness } from "@/lib/structured-data";

export const Route = createFileRoute("/")({
  head: () =>
    seo({
      title: "BoxZentrum Kiel – Boxen im alten Güterbahnhof",
      description:
        "Boxen, Fit Boxen und Jugendtraining in der Backsteinhalle am Tonberg 15 in Kiel. 15 Formate, Kinder ab 6 Jahren, erste Einheit kostenlos.",
      path: "/",
      jsonLd: [localBusiness()],
    }),
  component: Home,
});

const youthGroups = [
  { slug: "fit-boxen-jugend-6-12", age: "6–12", note: "Kein Kopfkontakt" },
  { slug: "grundschule-jugend", age: "ab 8", note: "Einstieg ohne Vorkenntnisse" },
  { slug: "fit-boxen-jugend-12-15", age: "12–15", note: "Kein Kopfkontakt" },
  { slug: "jugend-boxen-vollkontakt", age: "Jugend", note: "Mit Grundlage, Wettkampf möglich" },
  { slug: "boxen-vollkontakt", age: "ab 14", note: "Mit den Erwachsenen im Ring" },
];

const youthPromises = [
  {
    title: "Stärker werden",
    text: "Technik, Kondition, Koordination. Kraft kommt dazu, sobald die Beinarbeit sitzt – ein sauberer Jab ist schwerer zu bekommen als Muskeln.",
  },
  {
    title: "Ernst genommen werden",
    text: "Beim ersten Mal geht jemand mit dir die Grundstellung durch. Du stehst nicht am Sack und rätst.",
  },
  {
    title: "Sparring nur, wenn du willst",
    text: "Niemand wird in den Ring geschickt. Wer sparren will, wird vorbereitet und passend eingeteilt.",
  },
  {
    title: "Teil vom Team",
    text: "Boxen ist ein Einzelsport, aber trainiert wird zusammen. Unterstützung und Respekt tragen die Gruppe.",
  },
];

function Home() {
  const coach = team[0]!;
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden" aria-labelledby="hero-title">
        <div className="hero-fade absolute inset-0 -z-10">
          <Photo id="halle-ring-decke" priority sizes="100vw" focus="50% 42%" className="hero-photo h-full w-full" />
          <div className="grain absolute inset-0" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-pitch via-pitch/45 to-pitch/30" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_0%_100%,rgba(7,6,6,.85),transparent_60%)]" />

        <div className="shell w-full pb-10 pt-[calc(var(--nav-h)+3rem)] md:pb-16">
          <div className="grid items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <p className="fade-in mb-6 flex items-center gap-3 text-[0.9375rem] font-[560] text-fog" style={{ "--d": "0ms" } as CSSProperties}>
                <span aria-hidden className="h-px w-8 bg-red" />
                Boxen in Kiel, seit {site.founded} im alten Güterbahnhof
              </p>
              <h1 id="hero-title" className="t-display t-hero text-bone">
                {["Dein Ring.", "Dein Weg.", "Dein Team."].map((line, i) => (
                  <span key={line} className="line-mask" style={{ "--i": i } as CSSProperties}>
                    <span>{line}</span>
                  </span>
                ))}
              </h1>
              <p className="fade-in t-lead mt-8 max-w-[34ch] text-fog" style={{ "--d": "380ms" } as CSSProperties}>
                Entdecke, was in dir steckt. Trainiere mit uns, wachse über dich hinaus und werde Teil des BoxZentrum Kiel.
              </p>
              <div className="fade-in mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--d": "480ms" } as CSSProperties}>
                <Link to="/probetraining" className="btn btn-primary !h-14 px-8 text-[1.0625rem]">
                  Jetzt Probetraining starten
                  <ArrowRight size={18} className="btn-icon" />
                </Link>
                <Link to="/training" className="btn btn-ghost !h-14 px-8 text-[1.0625rem]">
                  Trainingsangebote entdecken
                </Link>
              </div>
              <p className="fade-in mt-5 text-[0.875rem] text-ash" style={{ "--d": "560ms" } as CSSProperties}>
                Erste Einheit kostenlos. Handschuhe und Bandagen leihen wir dir.
              </p>
            </div>
            <div className="fade-in hidden lg:col-span-4 lg:block lg:justify-self-end" style={{ "--d": "650ms" } as CSSProperties}>
              <NowNext className="w-[19rem]" />
            </div>
          </div>
        </div>
        <div aria-hidden className="absolute bottom-0 left-1/2 hidden h-14 w-px -translate-x-1/2 overflow-hidden md:block">
          <span className="scroll-cue block h-full w-full bg-bone/60" />
        </div>
      </section>

      {/* ── Statement ────────────────────────────────────────── */}
      <section className="section" aria-label="Über das BoxZentrum">
        <div className="shell grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-10">
            <Reveal as="p" className="t-statement text-bone">
              Mehr als Boxen. Ein Ring in einer alten Güterhalle – und ein Publikum, das vom Achtjährigen im Kindertraining bis zum
              Wettkämpfer reicht.
            </Reveal>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-iron pt-8 sm:grid-cols-4 lg:col-span-12">
            {[
              [String(site.founded), "an derselben Adresse"],
              [String(courses.length), "Trainingsformate"],
              [String(weekSlots.length), "Einheiten pro Woche"],
              ["ab 6", "Jahren geht es los"],
            ].map(([value, label], i) => (
              <Reveal key={label} index={i} className="flex flex-col-reverse gap-2">
                <dt className="text-[0.9375rem] text-ash">{label}</dt>
                <dd className="t-display tnum text-[clamp(2.6rem,5vw,4rem)] text-bone">{value}</dd>
              </Reveal>
            ))}
          </dl>
          <div className="lg:hidden">
            <NowNext />
          </div>
        </div>
      </section>

      {/* ── Jugend ───────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-y border-iron bg-coal" aria-labelledby="jugend-title">
        <div className="shell section">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <h2 id="jugend-title" className="t-display t-xl text-bone">
                <span className="block">Finde deine</span>
                <span className="block">Stärke.</span>
              </h2>
              <p className="t-lead mt-8 max-w-[38ch] text-fog">
                Du musst nicht schon fit sein, und vorführen will dich hier niemand. Du lernst Boxen von Grund auf – in einer Gruppe in
                deinem Alter, mit Leuten, die dasselbe wollen wie du.
              </p>
              <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2">
                {youthPromises.map((p, i) => (
                  <Reveal key={p.title} index={i} className="border-t border-iron pt-5">
                    <h3 className="t-title text-bone">{p.title}</h3>
                    <p className="mt-3 text-fog">{p.text}</p>
                  </Reveal>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5">
              <Reveal variant="clip" className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] lg:aspect-auto lg:h-full">
                <Photo id="speedball-nahaufnahme" sizes="(min-width: 1024px) 40vw, 100vw" focus="50% 40%" className="h-full w-full" />
              </Reveal>
            </div>
          </div>

          <div className="mt-20 md:mt-28">
            <div className="flex items-end justify-between gap-6">
              <h3 className="t-display t-md text-bone">Gruppen nach Alter</h3>
              <Link to="/jugend" className="link hidden text-[0.9375rem] text-bone sm:inline">
                Alles für Jugendliche und Eltern
              </Link>
            </div>
            <ul className="no-scrollbar -mx-[var(--gutter)] mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--gutter)] pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
              {youthGroups.map((g) => {
                const c = courseBySlug(g.slug)!;
                return (
                  <li key={g.slug} className="w-[72vw] flex-none snap-start xs:w-[17rem] lg:w-auto">
                    <Link
                      to="/training/$slug"
                      params={{ slug: c.slug }}
                      className="group flex h-full flex-col rounded-[1.125rem] bg-anthracite p-5 ring-1 ring-iron transition-[background-color,transform] duration-300 ease-[var(--ease-out)] hover:bg-iron active:scale-[0.985]"
                    >
                      <span className="flex items-center gap-2 text-[0.8125rem] text-ash">
                        <span className="dot" style={{ background: tracks[c.track].color }} />
                        {tracks[c.track].short}
                      </span>
                      <span className="t-display tnum mt-8 text-[3.6rem] text-bone">{g.age}</span>
                      <span className="mt-3 text-[1.0625rem] font-[640] leading-tight text-bone">{c.name}</span>
                      <span className="mt-1 text-[0.875rem] text-ash">{g.note}</span>
                      <span className="mt-auto flex items-center justify-between pt-6 text-[0.875rem] text-fog">
                        <span className="tnum">{courseDays(c)}</span>
                        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-10 grid gap-6 rounded-[1.25rem] p-6 ring-1 ring-iron md:grid-cols-12 md:items-center md:p-8">
              <div className="md:col-span-8">
                <h3 className="t-title text-bone">Für Eltern</h3>
                <p className="mt-3 max-w-[60ch] text-fog">
                  In den Fit-Boxen-Gruppen für Kinder und Jugendliche gibt es keinen Kopfkontakt und keinen Wettkampfdruck. Feste Struktur,
                  klare Ansagen, Regeln in jeder Einheit. Die Ausrüstung stellen wir, und Eltern können jederzeit zusehen – am Rand, nicht am Sack.
                </p>
              </div>
              <div className="md:col-span-4 md:justify-self-end">
                <Link to="/jugend" hash="eltern" className="btn btn-light">
                  Infos für Eltern
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trainingsangebote ────────────────────────────────── */}
      <section className="section" aria-labelledby="training-title">
        <div className="shell">
          <SectionHead id="training-title" title={["Finde dein", "Training."]}>
            Vom ersten Schlag bis zur Wettkampfvorbereitung: Boxen, Fit Boxen in vier Stufen, reine Frauengruppen, Kraft und
            Selbstverteidigung.
          </SectionHead>
          <div className="mt-14 md:mt-20">
            <CourseIndex mode="compact" />
          </div>
          <div className="mt-10">
            <Link to="/training" className="btn btn-ghost">
              Alle Trainings im Detail
              <ArrowRight size={18} className="btn-icon" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Woche ────────────────────────────────────────────── */}
      <section className="border-y border-iron bg-coal" aria-labelledby="woche-title">
        <div className="shell section grid gap-14 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <h2 id="woche-title" className="t-display t-lg text-bone">
              <span className="block">Montag bis Freitag.</span>
              <span className="block">Ab 16 Uhr.</span>
            </h2>
            <p className="t-lead mt-8 max-w-[34ch] text-fog">
              {weekSlots.length} Einheiten auf zwei Hallen verteilt. Komm beim ersten Mal zehn Minuten früher, dann bleibt Zeit für die
              Einweisung.
            </p>
            <Link to="/trainingsplan" className="btn btn-light mt-9">
              Zum Trainingsplan
              <ArrowRight size={18} className="btn-icon" />
            </Link>
          </div>
          <div className="lg:col-span-7">
            <WeekStrip />
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.8125rem] text-ash">
              {(["vollkontakt", "fitboxen", "kraft", "frei"] as const).map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="dot" style={{ background: tracks[t].color }} />
                  {tracks[t].label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Halle ────────────────────────────────────────────── */}
      <section className="section overflow-hidden" aria-labelledby="halle-title">
        <div className="shell grid gap-12 lg:grid-cols-12">
          <div className="relative lg:col-span-7">
            <Reveal variant="clip" className="relative aspect-[3/4] overflow-hidden rounded-[1.25rem] md:aspect-[4/5]">
              <Photo id="halle-uebersicht" sizes="(min-width: 1024px) 55vw, 100vw" className="h-full w-full" imgClassName="parallax" />
            </Reveal>
            <Reveal
              variant="clip"
              className="absolute -bottom-10 right-0 hidden aspect-[3/4] w-[38%] overflow-hidden rounded-[1rem] ring-8 ring-pitch md:block lg:-right-16"
            >
              <Photo id="ringecke-truss" sizes="22vw" className="h-full w-full" />
            </Reveal>
          </div>
          <div className="flex flex-col justify-center lg:col-span-5 lg:pl-16">
            <h2 id="halle-title" className="t-display t-md text-bone">
              <span className="block">Tonberg 15.</span>
              <span className="block">Alter Güterbahnhof.</span>
            </h2>
            <p className="t-lead mt-8 text-fog">
              Backstein, Laderampe, Trägerdecke – gebaut, um Waggons zu entladen, seit {site.founded} genutzt, um Leuten das Boxen
              beizubringen.
            </p>
            <p className="mt-6 text-fog">
              Hier steht ein Ring, kein Geräteparcours. Sandsäcke hängen an der Decke, an den Wänden liegen Pratzen und Bandagen, und wenn
              zwanzig Leute gleichzeitig Seil springen, hört man das im ganzen Gebäude.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/halle" className="btn btn-light">
                Die Halle entdecken
              </Link>
              <a href={site.maps.directions} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Route planen
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Head Coach ───────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-t border-iron" aria-labelledby="coach-title">
        <div className="absolute inset-0 -z-10">
          <Photo id="ringecke-fenster" sizes="100vw" focus="70% 50%" className="h-full w-full" imgClassName="parallax" />
          <div className="absolute inset-0 bg-gradient-to-r from-pitch via-pitch/85 to-pitch/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-pitch via-transparent to-pitch/70" />
        </div>
        <div className="shell section">
          <p className="text-[0.9375rem] font-[560] text-fog">{coach.role}</p>
          <h2 id="coach-title" className="t-display mt-4 text-[clamp(6rem,30vw,17rem)] leading-[0.8] text-bone">
            {coach.name}
          </h2>
          <div className="mt-10 grid gap-12 lg:grid-cols-12">
            <div className="space-y-5 text-fog lg:col-span-6">
              <p className="t-lead text-bone">{coach.bio[0]}</p>
              <p>{coach.bio[1]}</p>
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <h3 className="t-meta">Womit er arbeitet</h3>
              <ul className="mt-4 space-y-2.5 text-bone">
                {coach.focus.map((f) => (
                  <li key={f} className="flex gap-3">
                    <span aria-hidden className="mt-[0.7rem] h-px w-4 flex-none bg-red" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/team" className="btn btn-light btn-sm">
                  Zum Team
                </Link>
                {coach.instagram && (
                  <a href={coach.instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                    <Instagram size={16} />
                    {coach.instagram.handle}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Grundsätze ───────────────────────────────────────── */}
      <section className="section border-t border-iron" aria-labelledby="regeln-title">
        <div className="shell">
          <SectionHead id="regeln-title" title={["Vier Sätze,", "an denen du uns", "messen kannst."]}>
            Kampfsport lebt davon, dass man sich aufeinander verlassen kann. Deshalb steht das hier schriftlich.
          </SectionHead>
          <div className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p, i) => (
              <Reveal key={p.title} index={i} className="border-t border-bone/80 pt-6">
                <h3 className="t-title text-bone">{p.title}</h3>
                <p className="mt-4 text-fog">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ─────────────────────────────────────── */}
      <section className="border-t border-iron bg-coal" aria-labelledby="stimmen-title">
        <div className="shell section">
          <h2 id="stimmen-title" className="t-display t-lg text-bone">
            <span className="block">Was draußen</span>
            <span className="block">darüber steht.</span>
          </h2>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[1.25rem] bg-iron ring-1 ring-iron md:grid-cols-3">
            <a
              href={site.maps.search}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col bg-coal p-7 transition-colors duration-300 hover:bg-anthracite md:p-9"
            >
              <span className="flex items-center gap-1 text-bone" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={18} />
                ))}
              </span>
              <span className="t-display tnum mt-8 text-[clamp(4rem,8vw,6.5rem)] text-bone">
                {site.reviews.rating.toLocaleString("de-DE")}
              </span>
              <span className="mt-2 text-fog">
                von 5 Sternen aus {site.reviews.count} Bewertungen bei {site.reviews.platform}
              </span>
              <span className="mt-auto flex items-center gap-2 pt-10 text-[0.9375rem] font-[600] text-bone">
                Bewertungen lesen
                <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </a>
            <a
              href={site.social.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col bg-coal p-7 transition-colors duration-300 hover:bg-anthracite md:p-9"
            >
              <Instagram size={26} className="text-bone" />
              <span className="t-title mt-8 text-bone">{site.social.instagram.handle}</span>
              <span className="mt-3 text-fog">Trainingsausschnitte, Wettkampftermine und kurzfristige Ausfälle.</span>
              <span className="mt-auto flex items-center gap-2 pt-10 text-[0.9375rem] font-[600] text-bone">
                Auf Instagram folgen
                <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </a>
            <a
              href={site.social.facebook.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col bg-coal p-7 transition-colors duration-300 hover:bg-anthracite md:p-9"
            >
              <Facebook size={26} className="text-bone" />
              <span className="t-title mt-8 text-bone">{site.social.facebook.handle}</span>
              <span className="mt-3 text-fog">Ankündigungen, Turniere und Bilder aus der Halle.</span>
              <span className="mt-auto flex items-center gap-2 pt-10 text-[0.9375rem] font-[600] text-bone">
                Auf Facebook ansehen
                <ArrowUpRight size={16} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </a>
          </div>
        </div>
      </section>

      <TrialCta />
    </>
  );
}

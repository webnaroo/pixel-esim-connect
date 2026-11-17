import type { CSSProperties } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { FactList } from "@/components/blocks";
import { ArrowRight, Instagram, Mail, Phone } from "@/components/icons";
import { courseBySlug, courses, fitBoxenPath, tracks, youthPath, type Course } from "@/content/courses";
import { dayNames } from "@/content/schedule";
import { coachById } from "@/content/team";
import { site, trial } from "@/content/site";
import { courseDays, durationLabel } from "@/lib/format";
import { breadcrumb, seo } from "@/lib/seo";

export const Route = createFileRoute("/training/$slug")({
  loader: ({ params }) => {
    const course = courseBySlug(params.slug);
    if (!course) throw notFound();
    return { slug: course.slug };
  },
  head: ({ loaderData }) => {
    const c = loaderData ? courseBySlug(loaderData.slug) : undefined;
    if (!c) return {};
    return seo({
      title: `${c.name} in Kiel`,
      description: `${c.tagline} ${c.access}. Training: ${courseDays(c)}. Im BoxZentrum Kiel, Tonberg 15.`,
      path: `/training/${c.slug}`,
      image: `/img/${c.photo}-1600.webp`,
      jsonLd: [
        breadcrumb([
          { name: "Start", path: "/" },
          { name: "Training", path: "/training" },
          { name: c.name, path: `/training/${c.slug}` },
        ]),
      ],
    });
  },
  component: CoursePage,
});

const titleLines = (name: string) => {
  const words = name.split(" ");
  return words.length <= 2 ? words : [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
};

const trialLabel: Record<Course["trial"], string> = {
  open: "Erste Einheit kostenlos",
  call: "Nach kurzer Absprache",
  members: "Nur für Mitglieder",
};

function CoursePage() {
  const { slug } = Route.useLoaderData();
  const c = courseBySlug(slug)!;
  const coach = c.trainer ? coachById(c.trainer) : undefined;
  const idx = courses.findIndex((x) => x.slug === c.slug);
  const prev = courses[(idx - 1 + courses.length) % courses.length]!;
  const next = courses[(idx + 1) % courses.length]!;
  const path = fitBoxenPath.includes(c.slug) ? fitBoxenPath : youthPath.includes(c.slug) ? youthPath : null;
  const related = courses
    .filter((x) => x.slug !== c.slug && (x.track === c.track || x.audiences.some((a) => c.audiences.includes(a))))
    .slice(0, 3);
  const halls = [...new Set(c.sessions.map((s) => s.hall))].join(", ");
  const subject = `Probetraining: ${c.name}`;

  const facts = [
    { label: "Für wen", value: c.access },
    { label: "Training", value: courseDays(c) },
    ...(durationLabel(c) ? [{ label: "Dauer", value: durationLabel(c)! }] : []),
    ...(halls ? [{ label: "Ort", value: halls }] : []),
    { label: "Probetraining", value: trialLabel[c.trial] },
    ...(c.hansefit ? [{ label: "Hansefit", value: "Ja, offen" }] : []),
  ];

  return (
    <>
      {/* Kopf */}
      <section className="relative isolate flex min-h-[88svh] items-end overflow-hidden pb-12 pt-[calc(var(--nav-h)+4rem)] md:pb-16">
        <div className="hero-fade absolute inset-0 -z-10">
          <Photo id={c.photo} focus={c.focus} priority sizes="100vw" className="hero-photo h-full w-full" />
          <div className="grain absolute inset-0" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-pitch via-pitch/55 to-pitch/25" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-pitch/75 via-pitch/10 to-transparent" />
        <div className="shell w-full">
          <nav aria-label="Brotkrumen" className="fade-in mb-8 text-[0.875rem] text-ash" style={{ "--d": "60ms" } as CSSProperties}>
            <Link to="/training" className="hover:text-bone">
              Training
            </Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-fog">{c.name}</span>
          </nav>
          <p className="fade-in flex items-center gap-2.5 text-[0.9375rem] font-[560] text-fog" style={{ "--d": "100ms" } as CSSProperties}>
            <span className="dot" style={{ background: tracks[c.track].color }} />
            {tracks[c.track].label}
          </p>
          <h1 className="t-display t-xl mt-5 text-bone">
            {titleLines(c.name).map((line, i) => (
              <span key={line} className="line-mask" style={{ "--i": i } as CSSProperties}>
                <span>{line}</span>
              </span>
            ))}
          </h1>
          <p className="fade-in t-lead mt-8 max-w-[36ch] text-fog" style={{ "--d": "340ms" } as CSSProperties}>
            {c.tagline}
          </p>
          <div className="fade-in mt-9 flex flex-col gap-3 sm:flex-row" style={{ "--d": "440ms" } as CSSProperties}>
            {c.trial === "members" ? (
              <Link to="/training" className="btn btn-light">
                Kurse für den Einstieg
              </Link>
            ) : (
              <a href="#probetraining" className="btn btn-primary">
                {c.trial === "open" ? "Probetraining für diesen Kurs" : "Termin absprechen"}
                <ArrowRight size={18} className="btn-icon" />
              </a>
            )}
            <a href="#zeiten" className="btn btn-ghost">
              {c.byArrangement ? "Wie es abläuft" : "Trainingszeiten"}
            </a>
          </div>
        </div>
      </section>

      {/* Eckdaten */}
      <section aria-label="Eckdaten" className="border-y border-iron bg-coal">
        <dl className="shell grid grid-cols-2 gap-px md:grid-cols-3 lg:grid-cols-6">
          {facts.map((f) => (
            <div key={f.label} className="py-6 pr-4">
              <dt className="text-[0.8125rem] text-ash">{f.label}</dt>
              <dd className="mt-1.5 text-[1rem] font-[600] leading-snug text-bone">{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Inhalt */}
      <section className="section">
        <div className="shell grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="t-display t-md text-bone">Worum es geht</h2>
            <p className="t-lead mt-6 text-fog">{c.description}</p>

            <h2 className="t-display t-md mt-16 text-bone">So läuft eine Einheit</h2>
            <div className="mt-6">
              <FactList items={c.flow} numbered />
            </div>

            <h2 className="t-display t-md mt-16 text-bone">Mitbringen</h2>
            <div className="mt-6">
              <FactList items={c.bring} />
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="space-y-4 lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
              <div id="zeiten" className="scroll-mt-28 rounded-[1.25rem] bg-coal p-6 ring-1 ring-iron md:p-7">
                <h2 className="t-title text-bone">Trainingszeiten</h2>
                {c.byArrangement ? (
                  <p className="mt-4 text-fog">
                    Termine nach Absprache – ruf kurz an, dann sprechen wir, was für dich passt.
                  </p>
                ) : (
                  <ul className="mt-5 divide-y divide-iron">
                    {c.sessions.map((s) => (
                      <li key={s.day + s.start} className="flex items-baseline justify-between gap-4 py-3.5">
                        <span className="text-[1.0625rem] font-[620] text-bone">{dayNames[s.day].long}</span>
                        <span className="tnum text-right text-[1.0625rem] text-fog">
                          {s.start}–{s.end}
                          <span className="ml-3 text-[0.8125rem] text-ash">{s.hall}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/trainingsplan" className="link mt-5 inline-block text-[0.9375rem] text-bone">
                  Ganzer Wochenplan
                </Link>
              </div>

              <div className="rounded-[1.25rem] bg-coal p-6 ring-1 ring-iron md:p-7">
                <h2 className="t-title text-bone">Trainer</h2>
                {coach ? (
                  <>
                    <p className="t-display mt-4 text-[2.8rem] text-bone">{coach.name}</p>
                    <p className="text-[0.9375rem] text-ash">{coach.role}</p>
                    <p className="mt-4 text-fog">{coach.bio[0]}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link to="/team" className="btn btn-ghost btn-sm">
                        Mehr über {coach.name}
                      </Link>
                      {coach.instagram && (
                        <a href={coach.instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                          <Instagram size={16} />
                          {coach.instagram.handle}
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-fog">
                    Jede Gruppe hat eine feste Ansprechperson. Wer diese Einheit leitet, erfährst du telefonisch oder direkt beim ersten
                    Training.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Weg */}
      {path && (
        <section className="border-t border-iron" aria-labelledby="weg-title">
          <div className="shell section !py-20 md:!py-28">
            <h2 id="weg-title" className="t-display t-md text-bone">
              {path === fitBoxenPath ? "Dein Weg im Fit Boxen" : "Dein Weg als Jugendliche:r"}
            </h2>
            <ol className="mt-10 grid gap-3 md:grid-cols-4">
              {path.map((s, i) => {
                const step = courseBySlug(s)!;
                const current = s === c.slug;
                return (
                  <li key={s}>
                    <Link
                      to="/training/$slug"
                      params={{ slug: s }}
                      aria-current={current ? "page" : undefined}
                      className={`flex h-full flex-col rounded-[1rem] p-5 ring-1 transition-colors duration-300 ${
                        current ? "bg-bone text-pitch ring-bone" : "bg-coal text-bone ring-iron hover:bg-anthracite"
                      }`}
                    >
                      <span className={`tnum text-[0.8125rem] font-[640] ${current ? "text-pitch/60" : "text-ash"}`}>Schritt {i + 1}</span>
                      <span className="mt-4 text-[1.125rem] font-[680] leading-tight">{step.name}</span>
                      <span className={`mt-1 text-[0.875rem] ${current ? "text-pitch/70" : "text-ash"}`}>{step.access}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* Probetraining */}
      <section id="probetraining" className="scroll-mt-20 border-t border-iron bg-coal" aria-labelledby="pt-title">
        <div className="shell section !py-20 md:!py-28 grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <h2 id="pt-title" className="t-display t-lg text-bone">
              {c.trial === "members" ? (
                <>
                  <span className="block">Erst Kurs,</span>
                  <span className="block">dann frei.</span>
                </>
              ) : (
                <>
                  <span className="block">Probier&apos;s</span>
                  <span className="block">einfach aus.</span>
                </>
              )}
            </h2>
            <p className="t-lead mt-6 max-w-[40ch] text-fog">
              {c.trial === "members"
                ? "Freies Training ist für Mitglieder mit Grunderfahrung aus einem laufenden Kurs. Steig über eine Grundschule oder einen Einsteigerkurs ein."
                : c.trial === "call"
                  ? "Für dieses Format sprechen wir vorher kurz miteinander – am Telefon oder per E-Mail. Danach weißt du, wann und wie es losgeht."
                  : `${trial.headline}. ${trial.gear} ${trial.arrive}`}
            </p>
          </div>
          <div className="grid gap-3 lg:col-span-5">
            <a href={site.phone.href} className="btn btn-primary !h-14 w-full text-[1.0625rem]">
              <Phone size={18} />
              <span className="tnum">{site.phone.display}</span>
            </a>
            <a href={`${site.email.href}?subject=${encodeURIComponent(subject)}`} className="btn btn-ghost !h-14 w-full">
              <Mail size={18} />
              E-Mail zum Probetraining
            </a>
            <Link to="/probetraining" className="link mt-2 justify-self-start text-[0.9375rem] text-bone">
              So läuft dein erstes Training
            </Link>
          </div>
        </div>
      </section>

      {/* Weitere Formate */}
      <section className="section" aria-labelledby="mehr-title">
        <div className="shell">
          <div className="flex items-end justify-between gap-6">
            <h2 id="mehr-title" className="t-display t-md text-bone">
              Passt auch
            </h2>
            <Link to="/training" className="link hidden text-[0.9375rem] text-bone sm:inline">
              Alle Formate
            </Link>
          </div>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {related.map((r, i) => (
              <Reveal as="li" key={r.slug} index={i}>
                <Link to="/training/$slug" params={{ slug: r.slug }} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.125rem]">
                    <Photo
                      id={r.photo}
                      focus={r.focus}
                      sizes="(min-width: 768px) 32vw, 100vw"
                      className="h-full w-full"
                      imgClassName="transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="mt-4 flex items-center gap-2 text-[0.8125rem] text-ash">
                    <span className="dot" style={{ background: tracks[r.track].color }} />
                    {r.access}
                  </p>
                  <h3 className="t-display mt-2 text-[2rem] text-bone">{r.name}</h3>
                </Link>
              </Reveal>
            ))}
          </ul>

          <nav aria-label="Weitere Kurse" className="mt-20 grid grid-cols-2 border-t border-iron pt-6">
            <Link to="/training/$slug" params={{ slug: prev.slug }} className="group pr-4">
              <span className="text-[0.8125rem] text-ash">Vorheriges Format</span>
              <span className="mt-1 block text-[1.0625rem] font-[640] text-bone group-hover:underline">{prev.name}</span>
            </Link>
            <Link to="/training/$slug" params={{ slug: next.slug }} className="group pl-4 text-right">
              <span className="text-[0.8125rem] text-ash">Nächstes Format</span>
              <span className="mt-1 block text-[1.0625rem] font-[640] text-bone group-hover:underline">{next.name}</span>
            </Link>
          </nav>
        </div>
      </section>
    </>
  );
}

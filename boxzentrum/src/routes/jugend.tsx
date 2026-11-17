import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHero, SectionHead, TrialCta } from "@/components/blocks";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { WeekPlan } from "@/components/week-plan";
import { ArrowRight, Mail } from "@/components/icons";
import { courseBySlug, tracks } from "@/content/courses";
import { principles, site, trial } from "@/content/site";
import { courseDays } from "@/lib/format";
import { breadcrumb, seo } from "@/lib/seo";

export const Route = createFileRoute("/jugend")({
  head: () =>
    seo({
      title: "Boxen für Kinder und Jugendliche",
      description:
        "Kinder- und Jugendboxen in Kiel: Gruppen von 6 bis 12 und 12 bis 15 Jahren, Einstiegskurs ab 8, Jugend-Vollkontakt mit Wettkampfvorbereitung. Kein Kopfkontakt in den Fit-Boxen-Gruppen.",
      path: "/jugend",
      jsonLd: [breadcrumb([{ name: "Start", path: "/" }, { name: "Jugend", path: "/jugend" }])],
    }),
  component: YouthPage,
});

const ladder = [
  { slug: "grundschule-jugend", age: "ab 8", text: "Noch nie geboxt? Hier geht es los: Grundstellung, Bewegung, die ersten Regeln." },
  { slug: "fit-boxen-jugend-6-12", age: "6–12", text: "Erst Haltung und Regeln, dann Technik. Viel Koordination, kein Kopfkontakt." },
  { slug: "fit-boxen-jugend-12-15", age: "12–15", text: "Boxen in der Gruppe, die im gleichen Alter tickt. Auch für Neueinsteiger:innen." },
  { slug: "jugend-boxen-vollkontakt", age: "Jugend", text: "Mehr Tempo, mehr Sparring, Wettkampfvorbereitung – für alle mit Grundlage." },
];

const parentFacts = [
  { title: "Kein Kopfkontakt", text: "In den Fit-Boxen-Gruppen für Kinder und Jugendliche gibt es keinen Kopfkontakt und keinen Wettkampfdruck." },
  { title: "Feste Struktur", text: "Klare Ansagen und Regeln, Rücksicht und Disziplin – in jeder Einheit, nicht als Sonntagsrede." },
  { title: "Zusehen erlaubt", text: "Eltern können jederzeit zusehen – am Rand, nicht am Sack." },
  { title: "Ausrüstung gestellt", text: "Für den Anfang stellen wir die Ausrüstung. Mitbringen: Sportsachen, Hallenschuhe und eine Trinkflasche mit Namen." },
  { title: "Sparring nur freiwillig", text: "Niemand wird in den Ring geschickt. Wer sparren will, wird vorbereitet und passend eingeteilt." },
  { title: "Technik vor Härte", text: "Zuerst lernen Kinder, wann die Hände unten bleiben. Draufhauen kann jedes Kind – treffen nicht." },
];

function YouthPage() {
  return (
    <>
      <PageHero
        photo="ringecke-leer"
        focus="50% 65%"
        title={["Finde deine", "Stärke."]}
        intro={<>Hier wirst du stärker, findest Leute, die dasselbe wollen wie du, und wirst vom ersten Tag an ernst genommen. Egal, ob du fit bist oder nicht.</>}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/probetraining" className="btn btn-primary">
            Probetraining starten
            <ArrowRight size={18} className="btn-icon" />
          </Link>
          <a href="#eltern" className="btn btn-ghost">
            Infos für Eltern
          </a>
        </div>
      </PageHero>

      {/* Für Jugendliche */}
      <section className="section" aria-labelledby="dein-weg">
        <div className="shell">
          <SectionHead id="dein-weg" title={["Dein Weg", "in den Ring."]}>
            Jede Gruppe ist auf ein Alter zugeschnitten. Du fängst da an, wo du stehst – und gehst weiter, wenn du so weit bist.
          </SectionHead>
          <ol className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {ladder.map((step, i) => {
              const c = courseBySlug(step.slug)!;
              return (
                <Reveal as="li" key={step.slug} index={i}>
                  <Link to="/training/$slug" params={{ slug: c.slug }} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem]">
                      <Photo
                        id={c.photo}
                        focus={c.focus}
                        sizes="(min-width: 1280px) 24vw, (min-width: 768px) 48vw, 100vw"
                        className="h-full w-full"
                        imgClassName="transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-pitch/95 via-pitch/30 to-transparent" />
                      <span className="tnum absolute left-5 top-5 text-[0.8125rem] font-[640] text-fog">Schritt {i + 1}</span>
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <span className="t-display tnum block text-[4.2rem] text-bone">{step.age}</span>
                        <span className="mt-2 flex items-center gap-2 text-[1.0625rem] font-[660] text-bone">
                          <span className="dot" style={{ background: tracks[c.track].color }} />
                          {c.name}
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-fog">{step.text}</p>
                    <p className="tnum mt-2 text-[0.875rem] text-ash">{courseDays(c)}</p>
                  </Link>
                </Reveal>
              );
            })}
          </ol>
          <p className="mt-10 max-w-[60ch] text-[0.9375rem] text-ash">
            Ab 14 Jahren kannst du auch in die Gruppe <Link to="/training/$slug" params={{ slug: "boxen-vollkontakt" }} className="link text-bone">Boxen Vollkontakt</Link>.
            Für die Jugend-Vollkontakt-Gruppe fragst du das Einstiegsalter am besten direkt im Studio.
          </p>
        </div>
      </section>

      {/* Stimmung */}
      <section className="relative isolate overflow-hidden border-y border-iron" aria-label="In der Halle">
        <div className="absolute inset-0 -z-10">
          <Photo id="sandsaecke-reihe" sizes="100vw" focus="50% 40%" className="h-full w-full" imgClassName="parallax" />
          <div className="absolute inset-0 bg-pitch/70" />
        </div>
        <div className="shell section">
          <p className="t-statement max-w-[22ch] text-bone">
            Kraft ist einfach zu bekommen. Ein sauberer Jab nicht.
          </p>
          <p className="mt-6 text-fog">Einer der vier Grundsätze, nach denen hier trainiert wird.</p>
        </div>
      </section>

      {/* Eltern */}
      <section id="eltern" className="section scroll-mt-16" aria-labelledby="eltern-title">
        <div className="shell">
          <SectionHead id="eltern-title" title={["Für Eltern."]}>
            Was in den Kinder- und Jugendgruppen gilt. Strukturiert, altersgerecht, in jeder Einheit.
          </SectionHead>
          <div className="mt-16 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {parentFacts.map((f, i) => (
              <Reveal key={f.title} index={i % 3} className="border-t border-iron pt-6">
                <h3 className="t-title text-bone">{f.title}</h3>
                <p className="mt-3 text-fog">{f.text}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-16 grid gap-6 rounded-[1.25rem] bg-coal p-6 ring-1 ring-iron md:grid-cols-12 md:items-center md:p-8">
            <div className="md:col-span-8">
              <h3 className="t-title text-bone">Fragen zum Kindertraining?</h3>
              <p className="mt-3 max-w-[56ch] text-fog">{trial.emailHint} Oder ruf an: {site.phone.display}.</p>
            </div>
            <div className="flex flex-wrap gap-3 md:col-span-4 md:justify-self-end">
              <a href={`${site.email.href}?subject=${encodeURIComponent("Kindertraining")}`} className="btn btn-light">
                <Mail size={18} />
                E-Mail schreiben
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Zeiten */}
      <section className="border-t border-iron bg-coal" aria-labelledby="zeiten-jugend">
        <div className="shell section">
          <SectionHead id="zeiten-jugend" title={["Wann die", "Jugend trainiert."]}>
            Der Plan ist auf die Jugendgruppen gefiltert. Für die Kleinen tippe auf „Kinder“, für alle Details auf eine Einheit.
          </SectionHead>
          <div className="mt-14">
            <WeekPlan initialFilter="jugend" />
          </div>
        </div>
      </section>

      <section className="section !pb-0" aria-label="Grundsätze">
        <div className="shell grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((p, i) => (
            <Reveal key={p.title} index={i} className="border-t border-bone/80 pt-6">
              <h3 className="t-title text-bone">{p.title}</h3>
              <p className="mt-3 text-fog">{p.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <TrialCta photo="ausruestung-regal" subject="Probetraining Jugend" />
    </>
  );
}

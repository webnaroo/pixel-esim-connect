import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHero, TrialCta } from "@/components/blocks";
import { WeekPlan } from "@/components/week-plan";
import { courses, tracks } from "@/content/courses";
import { dayNames, dayRanges, weekSlots } from "@/content/schedule";
import { site, trial } from "@/content/site";
import { Instagram } from "@/components/icons";
import { breadcrumb, seo } from "@/lib/seo";

export const Route = createFileRoute("/trainingsplan")({
  head: () =>
    seo({
      title: "Trainingsplan",
      description: `Wann was läuft: ${weekSlots.length} Einheiten von Montag bis Freitag im BoxZentrum Kiel – Boxen, Fit Boxen, Jugend- und Frauentraining. Mit Filter nach Alter und Zielgruppe.`,
      path: "/trainingsplan",
      jsonLd: [breadcrumb([{ name: "Start", path: "/" }, { name: "Trainingsplan", path: "/trainingsplan" }])],
    }),
  component: PlanPage,
});

function PlanPage() {
  const byArrangement = courses.filter((c) => c.byArrangement);
  return (
    <>
      <PageHero
        photo="ringecke-truss"
        focus="50% 30%"
        title={["Wann", "was läuft."]}
        intro={<>Komm beim ersten Mal zehn Minuten vor Trainingsbeginn. Dann bleibt Zeit, dich einzuweisen, statt dich mitten in die Aufwärmrunde zu schicken.</>}
      >
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-[0.9375rem]">
          {dayRanges.map((r) => (
            <div key={r.day} className="flex gap-2">
              <dt className="text-ash">{dayNames[r.day].short}</dt>
              <dd className="tnum text-bone">
                {r.start}–{r.end}
              </dd>
            </div>
          ))}
        </dl>
      </PageHero>

      <section className="section !pt-16 md:!pt-24" aria-labelledby="woche-title">
        <div className="shell">
          <h2 id="woche-title" className="sr-only">
            Wochenplan
          </h2>
          <WeekPlan />

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <div className="rounded-[1.25rem] bg-coal p-6 ring-1 ring-iron md:p-8">
              <h3 className="t-title text-bone">Nach Absprache</h3>
              <p className="mt-3 text-fog">Diese Formate laufen in kleinen Gruppen ohne festen Platz im Wochenplan. Ruf kurz an, dann klären wir den Termin.</p>
              <ul className="mt-5 divide-y divide-iron border-y border-iron">
                {byArrangement.map((c) => (
                  <li key={c.slug}>
                    <Link to="/training/$slug" params={{ slug: c.slug }} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <span className="flex items-center gap-2.5 font-[600] text-bone">
                        <span className="dot" style={{ background: tracks[c.track].color }} />
                        {c.name}
                      </span>
                      <span className="text-[0.875rem] text-ash">{c.access}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[1.25rem] bg-coal p-6 ring-1 ring-iron md:p-8">
              <h3 className="t-title text-bone">Fällt heute etwas aus?</h3>
              <p className="mt-3 text-fog">{trial.socialHint}</p>
              <a href={site.social.instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-6">
                <Instagram size={18} />
                {site.social.instagram.handle}
              </a>
            </div>
          </div>
        </div>
      </section>

      <TrialCta photo="halle-uebersicht" />
    </>
  );
}

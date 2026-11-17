import { createFileRoute } from "@tanstack/react-router";
import { PageHero, TrialCta } from "@/components/blocks";
import { CourseIndex } from "@/components/course-index";
import { Reveal } from "@/components/reveal";
import { courses, fitBoxenPath, courseBySlug } from "@/content/courses";
import { Link } from "@tanstack/react-router";
import { seo, breadcrumb } from "@/lib/seo";

export const Route = createFileRoute("/training/")({
  head: () =>
    seo({
      title: "Trainingsangebote",
      description:
        "Alle 15 Trainingsformate im BoxZentrum Kiel: Boxen Vollkontakt, Fit Boxen in vier Stufen, Frauen- und Jugendgruppen, Kraft Maga, Fit Power Workout und therapeutisches Boxen.",
      path: "/training",
      jsonLd: [breadcrumb([{ name: "Start", path: "/" }, { name: "Training", path: "/training" }])],
    }),
  component: TrainingPage,
});

function TrainingPage() {
  return (
    <>
      <PageHero
        photo="sandsaecke-reihe"
        focus="50% 40%"
        title={["Fünfzehn", "Formate."]}
        intro={<>Vom ersten Schlag bis zum Sparring, vom Kindertraining bis zum therapeutischen Boxen. Such dir aus, wo du einsteigst.</>}
      />

      <section className="section !pt-16 md:!pt-24" aria-label="Alle Trainingsformate">
        <div className="shell">
          <CourseIndex mode="full" />
        </div>
      </section>

      <section className="border-t border-iron bg-coal" aria-labelledby="stufen-title">
        <div className="shell section">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 id="stufen-title" className="t-display t-lg text-bone">
                <span className="block">Fit Boxen</span>
                <span className="block">in vier Stufen.</span>
              </h2>
              <p className="t-lead mt-8 max-w-[34ch] text-fog">
                Du startest in der Grundschule. Dort klärt ihr gemeinsam, welches Niveau danach passt. Kein Aufbaukurs mit Zwang: Bei Fit
                Boxen wählst du dein Niveau selbst.
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 lg:col-span-7">
              {fitBoxenPath.map((slug, i) => {
                const c = courseBySlug(slug)!;
                return (
                  <Reveal as="li" key={slug} index={i}>
                    <Link
                      to="/training/$slug"
                      params={{ slug }}
                      className="group flex h-full flex-col rounded-[1.125rem] bg-anthracite p-6 ring-1 ring-iron transition-colors duration-300 hover:bg-iron"
                    >
                      <span className="tnum text-[0.875rem] font-[640] text-ash">Stufe {i + 1}</span>
                      <span className="t-display mt-6 text-[2.4rem] text-bone">{c.name.replace("Fit Boxen ", "")}</span>
                      <span className="mt-3 text-[0.9375rem] text-fog">{c.tagline}</span>
                    </Link>
                  </Reveal>
                );
              })}
            </ol>
          </div>
          <p className="mt-10 text-[0.875rem] text-ash">
            {courses.filter((c) => c.hansefit).length} Formate sind auch mit Hansefit offen:{" "}
            {courses
              .filter((c) => c.hansefit)
              .map((c) => c.name)
              .join(", ")}
            .
          </p>
        </div>
      </section>

      <TrialCta />
    </>
  );
}

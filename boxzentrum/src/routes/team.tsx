import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHero, TrialCta } from "@/components/blocks";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { Instagram } from "@/components/icons";
import { courseBySlug, tracks } from "@/content/courses";
import { principles } from "@/content/site";
import { team } from "@/content/team";
import { breadcrumb, seo } from "@/lib/seo";

export const Route = createFileRoute("/team")({
  head: () =>
    seo({
      title: "Team",
      description: "Wer dich im BoxZentrum Kiel trainiert: Head Coach Arton und das Team hinter den Gruppen – Technik vor Härte, Sparring nur freiwillig.",
      path: "/team",
      jsonLd: [breadcrumb([{ name: "Start", path: "/" }, { name: "Team", path: "/team" }])],
    }),
  component: TeamPage,
});

function TeamPage() {
  return (
    <>
      <PageHero
        photo="ringecke-fenster"
        focus="65% 50%"
        title={["Wer dich", "trainiert."]}
        intro={<>Jede Gruppe hat eine feste Ansprechperson. Was alle verbindet: sauberer Stand, ehrliche Ansagen, keine Show am Sack.</>}
      />

      {team.map((coach) => (
        <section key={coach.id} className="section" aria-labelledby={`coach-${coach.id}`}>
          <div className="shell grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal variant="clip" className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem]">
                <Photo id="ringecke-truss" sizes="(min-width: 1024px) 40vw, 100vw" focus="50% 35%" className="h-full w-full" imgClassName="parallax" />
                <div className="absolute inset-0 bg-gradient-to-t from-pitch/80 via-transparent to-transparent" />
                <p aria-hidden className="t-display absolute bottom-5 left-6 text-[clamp(4.5rem,11vw,9rem)] leading-[0.8] text-bone">{coach.name}</p>
              </Reveal>
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <h2 id={`coach-${coach.id}`} className="text-[0.9375rem] font-[600] text-red">
                <span className="sr-only">{coach.name}, </span>
                {coach.role}
              </h2>
              <div className="mt-6 space-y-5">
                <p className="t-lead text-bone">{coach.bio[0]}</p>
                {coach.bio.slice(1).map((p) => (
                  <p key={p} className="text-fog">
                    {p}
                  </p>
                ))}
              </div>
              <div className="mt-10 grid gap-10 sm:grid-cols-2">
                <div>
                  <h3 className="t-meta">Womit er arbeitet</h3>
                  <ul className="mt-4 space-y-2.5 text-bone">
                    {coach.focus.map((f) => (
                      <li key={f} className="flex gap-3">
                        <span aria-hidden className="mt-[0.7rem] h-px w-4 flex-none bg-red" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="t-meta">Trainiert</h3>
                  <ul className="mt-4 space-y-2.5">
                    {coach.courses.map((slug) => {
                      const c = courseBySlug(slug)!;
                      return (
                        <li key={slug}>
                          <Link to="/training/$slug" params={{ slug }} className="inline-flex items-center gap-2.5 text-bone hover:underline">
                            <span className="dot" style={{ background: tracks[c.track].color }} />
                            {c.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              {coach.instagram && (
                <a href={coach.instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-10">
                  <Instagram size={18} />
                  {coach.instagram.handle} auf Instagram
                </a>
              )}
            </div>
          </div>
        </section>
      ))}

      <section className="border-t border-iron bg-coal" aria-labelledby="team-gruppen">
        <div className="shell section grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="team-gruppen" className="t-display t-lg text-bone">
              <span className="block">Das Team</span>
              <span className="block">hinter den Gruppen.</span>
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="t-lead text-fog">
              Neben Arton leiten weitere Trainer:innen die einzelnen Gruppen – von den Kids bis zum Fit Power Workout. Wer welche Einheit
              führt, erfährst du telefonisch oder direkt beim Probetraining.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {principles.map((p, i) => (
                <Reveal key={p.title} index={i % 2} className="border-t border-iron pt-5">
                  <h3 className="t-title text-bone">{p.title}</h3>
                  <p className="mt-3 text-fog">{p.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TrialCta photo="boxsackraum" />
    </>
  );
}

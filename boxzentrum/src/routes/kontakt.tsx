import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/blocks";
import { OsmMap } from "@/components/osm-map";
import { ArrowUpRight, Facebook, Instagram, Mail, Phone } from "@/components/icons";
import { dayNames, dayRanges } from "@/content/schedule";
import { directions, site, trial } from "@/content/site";
import { breadcrumb, seo } from "@/lib/seo";

export const Route = createFileRoute("/kontakt")({
  head: () =>
    seo({
      title: "Kontakt und Anfahrt",
      description: `BoxZentrum Kiel, Tonberg 15, 24113 Kiel. Telefon ${site.phone.display}, E-Mail ${site.email.display}. So findest du die Halle im alten Güterbahnhof.`,
      path: "/kontakt",
      jsonLd: [breadcrumb([{ name: "Start", path: "/" }, { name: "Kontakt", path: "/kontakt" }])],
    }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <>
      <PageHero
        photo="flur-zum-ring"
        focus="40% 50%"
        title={["Ruf an.", "Komm vorbei."]}
        intro={<>Es gibt kein Buchungsformular und keine Warteliste. Für ein Probetraining reicht ein Anruf.</>}
      />

      <section className="section !pt-16 md:!pt-24" aria-label="Kontaktwege">
        <div className="shell">
        <div className="grid gap-px overflow-hidden rounded-[1.25rem] bg-iron ring-1 ring-iron lg:grid-cols-3">
          <a href={site.phone.href} className="group flex flex-col bg-coal p-7 transition-colors duration-300 hover:bg-anthracite md:p-9">
            <Phone size={24} className="text-red" />
            <span className="mt-8 text-[0.875rem] text-ash">Telefon – am schnellsten</span>
            <span className="tnum t-display mt-2 text-[clamp(2.4rem,4.5vw,3.4rem)] text-bone">{site.phone.display}</span>
            <span className="mt-4 text-fog">{trial.phoneHint}</span>
          </a>
          <a href={site.email.href} className="group flex flex-col bg-coal p-7 transition-colors duration-300 hover:bg-anthracite md:p-9">
            <Mail size={24} className="text-bone" />
            <span className="mt-8 text-[0.875rem] text-ash">E-Mail</span>
            <span className="t-title mt-2 break-all text-bone">{site.email.display}</span>
            <span className="mt-4 text-fog">{trial.emailHint}</span>
          </a>
          <div className="flex flex-col bg-coal p-7 md:p-9">
            <Instagram size={24} className="text-bone" />
            <span className="mt-8 text-[0.875rem] text-ash">Social Media</span>
            <span className="mt-4 text-fog">{trial.socialHint}</span>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={site.social.instagram.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                <Instagram size={16} /> Instagram
              </a>
              <a href={site.social.facebook.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                <Facebook size={16} /> Facebook
              </a>
            </div>
          </div>
        </div>
        </div>
      </section>

      <section className="border-t border-iron" aria-labelledby="standort-title">
        <div className="shell section grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="standort-title" className="t-display t-md text-bone">
              <span className="block">Tonberg 15,</span>
              <span className="block">alter Güterbahnhof.</span>
            </h2>
            <p className="t-lead mt-8 text-fog">Die Halle steht auf dem Gelände des alten Kieler Güterbahnhofs. Backstein, hohe Fenster, Trägerdecke – und mittendrin der Ring.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={site.maps.directions} target="_blank" rel="noopener noreferrer" className="btn btn-light">
                Route in Google Maps
                <ArrowUpRight size={16} />
              </a>
              <a href={site.maps.osm} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                In OpenStreetMap
                <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="mt-12">
              <h3 className="t-meta">Trainingszeiten</h3>
              <dl className="mt-4 grid max-w-xs grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                {dayRanges.map((r) => (
                  <div key={r.day} className="contents">
                    <dt className="text-ash">{dayNames[r.day].long}</dt>
                    <dd className="tnum text-bone">
                      {r.start}–{r.end}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="lg:col-span-7">
            <OsmMap />
            <dl className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {directions.map((d) => (
                <div key={d.title} className="border-t border-iron pt-5">
                  <dt className="t-title text-bone">{d.title}</dt>
                  <dd className="mt-3 text-fog">{d.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}

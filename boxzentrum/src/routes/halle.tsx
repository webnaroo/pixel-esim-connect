import { createFileRoute } from "@tanstack/react-router";
import { PageHero, SectionHead, TrialCta } from "@/components/blocks";
import { Photo } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import { ArrowUpRight } from "@/components/icons";
import type { PhotoId } from "@/content/photos.gen";
import { photoAlt } from "@/content/photos";
import { directions, principles, site } from "@/content/site";
import { breadcrumb, seo } from "@/lib/seo";

export const Route = createFileRoute("/halle")({
  head: () =>
    seo({
      title: "Die Halle im alten Güterbahnhof",
      description:
        "Backsteinhalle, Laderampe, Trägerdecke: Das BoxZentrum Kiel trainiert seit 2015 im alten Güterbahnhof am Tonberg 15. Ring, Sandsäcke, Kraftraum – und so findest du hin.",
      path: "/halle",
      jsonLd: [breadcrumb([{ name: "Start", path: "/" }, { name: "Die Halle", path: "/halle" }])],
    }),
  component: HallPage,
});

const gallery: { id: PhotoId; className: string; sizes: string }[] = [
  { id: "ring-weitwinkel-banden", className: "md:col-span-8 aspect-[3/2]", sizes: "(min-width: 768px) 64vw, 100vw" },
  { id: "durchblick-halle", className: "md:col-span-4 aspect-[3/4] md:aspect-auto", sizes: "(min-width: 768px) 32vw, 100vw" },
  { id: "speedball-nahaufnahme", className: "md:col-span-4 aspect-[3/4]", sizes: "(min-width: 768px) 32vw, 100vw" },
  { id: "boxsackraum", className: "md:col-span-8 aspect-[3/2] md:aspect-auto", sizes: "(min-width: 768px) 64vw, 100vw" },
  { id: "kraftraum", className: "md:col-span-4 aspect-[3/4]", sizes: "(min-width: 768px) 32vw, 100vw" },
  { id: "ausruestung-regal", className: "md:col-span-4 aspect-[3/4] md:aspect-auto", sizes: "(min-width: 768px) 32vw, 100vw" },
  { id: "durchblick-kraftraum", className: "md:col-span-4 aspect-[3/4]", sizes: "(min-width: 768px) 32vw, 100vw" },
];

function HallPage() {
  return (
    <>
      <PageHero
        photo="halle-uebersicht"
        focus="50% 55%"
        title={["Eine Halle.", "Ein Ring.", `Seit ${site.founded}.`]}
        intro={<>Das BoxZentrum liegt auf dem Gelände des alten Kieler Güterbahnhofs. Gebaut, um Waggons zu entladen – seit {site.founded} genutzt, um Leuten das Boxen beizubringen.</>}
      />

      <section className="section" aria-labelledby="ort-title">
        <div className="shell grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 id="ort-title" className="t-display t-lg text-bone">
              <span className="block">Kein Fitnessstudio</span>
              <span className="block">mit Boxecke.</span>
            </h2>
          </div>
          <div className="space-y-6 text-fog lg:col-span-5 lg:col-start-8">
            <p className="t-lead text-bone">
              Hier steht ein Ring, kein Geräteparcours. Sandsäcke hängen an der Decke, an den Wänden liegen Pratzen und Bandagen.
            </p>
            <p>
              Wenn zwanzig Leute gleichzeitig Seil springen, hört man das im ganzen Gebäude. Der Boden ist hart, die Fenster sind hoch, im Winter zieht
              es an der Tür. Das ist kein Mangel, das ist der Ort. Eine Güterhalle wurde gebaut, um zu arbeiten. Genau dafür wird sie hier weiter benutzt.
            </p>
            <p>
              Was geblieben ist: dieselbe Adresse, dieselbe Art zu unterrichten – und ein Publikum, das vom Achtjährigen im Kindertraining bis zum
              Wettkämpfer reicht, der am Wochenende in Hamburg boxt.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Bilder aus der Halle" className="pb-[var(--section)]">
        <div className="shell grid gap-3 md:grid-cols-12 md:gap-4">
          {gallery.map((g, i) => (
            <Reveal key={g.id} variant="clip" index={i % 2} className={`relative overflow-hidden rounded-[1rem] ${g.className}`}>
              <figure className="h-full w-full">
                <Photo id={g.id} sizes={g.sizes} className="h-full w-full" />
                <figcaption className="sr-only">{photoAlt[g.id]}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-y border-iron bg-coal" aria-labelledby="warum-title">
        <div className="shell section grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="warum-title" className="t-display t-lg text-bone">
              <span className="block">Mehr als</span>
              <span className="block">nur Sport.</span>
            </h2>
          </div>
          <div className="space-y-6 text-fog lg:col-span-6 lg:col-start-7">
            <p className="t-lead text-bone">
              Boxen trainiert Ausdauer, Kraft, Beweglichkeit und Koordination – und genauso Konzentration, Reaktionsfähigkeit und Selbstvertrauen.
            </p>
            <p>
              Du lernst, dich Herausforderungen zu stellen, deine eigenen Grenzen zu erkennen und auch in schwierigen Situationen ruhig und konzentriert zu
              bleiben. Disziplin und Durchhaltevermögen entwickeln sich dabei von selbst.
            </p>
            <p>
              Boxen ist ein Individualsport – trotzdem zählt der Zusammenhalt im Team. Gemeinsames Training, gegenseitige Unterstützung und Respekt tragen
              die Gruppe. Jeder trainiert auf seinem eigenen Niveau und verfolgt seine eigenen Ziele.
            </p>
            <p>
              Bei uns sind alle willkommen, unabhängig von Alter, Erfahrung oder Leistungsstand. Neben dem klassischen Wettkampfboxen bietet der Verein
              Breitensport an: Fitness, Gesundheit, Technik und der Spaß am Boxen.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="grundsaetze">
        <div className="shell">
          <SectionHead id="grundsaetze" title={["Wie hier", "trainiert wird."]}>
            Vier Sätze, an denen du uns messen kannst.
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

      <section className="border-t border-iron" aria-labelledby="anfahrt-title">
        <div className="shell section grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="anfahrt-title" className="t-display t-lg text-bone">
              <span className="block">So findest</span>
              <span className="block">du hin.</span>
            </h2>
            <address className="t-lead mt-8 not-italic text-fog">
              {site.name}
              <br />
              {site.address.street}, {site.address.zip} {site.address.city}
            </address>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={site.maps.directions} target="_blank" rel="noopener noreferrer" className="btn btn-light">
                Route in Google Maps
                <ArrowUpRight size={16} />
              </a>
              <a href={site.maps.osm} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                OpenStreetMap
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
            {directions.map((d) => (
              <div key={d.title} className="border-t border-iron pt-5">
                <dt className="t-title text-bone">{d.title}</dt>
                <dd className="mt-3 text-fog">{d.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <TrialCta photo="flur-zum-ring" />
    </>
  );
}

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { PhotoId } from "@/content/photos.gen";
import { site, trial } from "@/content/site";
import { Photo } from "./photo";
import { Reveal } from "./reveal";
import { ArrowRight, Mail, Phone } from "./icons";

/** Kopf für Unterseiten: Foto, große Plakatzeile, kurzer Einstieg. */
export function PageHero({
  title,
  intro,
  photo,
  focus,
  kicker,
  children,
}: {
  title: string[];
  intro?: ReactNode;
  photo: PhotoId;
  focus?: string | undefined;
  kicker?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden pb-14 pt-[calc(var(--nav-h)+4rem)] md:min-h-[86svh] md:pb-20">
      <div className="hero-fade absolute inset-0 -z-10">
        <Photo id={photo} focus={focus} priority sizes="100vw" className="hero-photo h-full w-full" />
        <div className="grain absolute inset-0" />
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-pitch via-pitch/55 to-pitch/20" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-pitch/70 via-transparent to-transparent" />
      <div className="shell w-full">
        {kicker && <div className="fade-in mb-6 text-[0.9375rem] font-[560] text-fog" style={{ "--d": "100ms" } as React.CSSProperties}>{kicker}</div>}
        <h1 className="t-display t-xl text-bone">
          {title.map((line, i) => (
            <span key={line} className="line-mask" style={{ "--i": i } as React.CSSProperties}>
              <span>{line}</span>
            </span>
          ))}
        </h1>
        {intro && (
          <div className="fade-in t-lead mt-8 max-w-[38ch] text-fog" style={{ "--d": "340ms" } as React.CSSProperties}>
            {intro}
          </div>
        )}
        {children && (
          <div className="fade-in mt-9" style={{ "--d": "440ms" } as React.CSSProperties}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}

/** Abschnittskopf: Plakatzeile links, Erklärung rechts (Desktop). */
export function SectionHead({
  title,
  children,
  id,
  as: Tag = "h2",
}: {
  title: string[];
  children?: ReactNode;
  id?: string;
  as?: "h2" | "h1";
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
      <Tag id={id} className="t-display t-lg text-bone lg:col-span-7">
        {title.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </Tag>
      {children && <div className="t-lead max-w-[36ch] text-fog lg:col-span-5 lg:justify-self-end">{children}</div>}
    </div>
  );
}

/** Abschluss jeder Seite: der direkte Weg zum Probetraining. */
export function TrialCta({ photo = "ausruestung-regal", subject = "Probetraining" }: { photo?: PhotoId; subject?: string }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-iron" aria-labelledby="trial-cta">
      <div className="absolute inset-0 -z-10">
        <Photo id={photo} sizes="100vw" className="h-full w-full" imgClassName="parallax" />
        <div className="absolute inset-0 bg-pitch/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-pitch via-transparent to-pitch/60" />
      </div>
      <div className="shell section grid gap-14 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Reveal as="p" className="text-[0.9375rem] font-[600] text-red">
            {trial.headline}
          </Reveal>
          <h2 id="trial-cta" className="t-display t-xl mt-5 text-bone">
            <span className="block">Komm vorbei.</span>
            <span className="block">Steig ein.</span>
          </h2>
          <p className="t-lead mt-8 max-w-[36ch] text-fog">
            {trial.gear} {trial.arrive}
          </p>
        </div>
        <div className="lg:col-span-5">
          <div className="grid gap-3">
            <Link to="/probetraining" className="btn btn-primary w-full !h-14 text-[1.0625rem]">
              Jetzt Probetraining starten
              <ArrowRight size={18} className="btn-icon" />
            </Link>
            <a href={site.phone.href} className="btn btn-light w-full !h-14 text-[1.0625rem]">
              <Phone size={18} />
              <span className="tnum">{site.phone.display}</span>
            </a>
            <a href={`${site.email.href}?subject=${encodeURIComponent(subject)}`} className="btn btn-ghost w-full !h-14">
              <Mail size={18} />
              {site.email.display}
            </a>
          </div>
          <p className="mt-5 text-[0.875rem] text-ash">{trial.noContract}</p>
        </div>
      </div>
    </section>
  );
}

/** Liste mit Häkchen-Linie statt Aufzählungspunkten */
export function FactList({ items, numbered = false }: { items: readonly string[]; numbered?: boolean }) {
  const Tag = numbered ? "ol" : "ul";
  return (
    <Tag className="divide-y divide-iron border-y border-iron">
      {items.map((item, i) => (
        <li key={item} className="flex gap-5 py-4 text-[1.0625rem] leading-snug text-fog">
          {numbered ? (
            <span className="tnum w-6 flex-none pt-px text-[0.875rem] font-[640] text-ash">{i + 1}</span>
          ) : (
            <span aria-hidden className="mt-[0.6rem] h-px w-4 flex-none bg-steel" />
          )}
          <span>{item}</span>
        </li>
      ))}
    </Tag>
  );
}

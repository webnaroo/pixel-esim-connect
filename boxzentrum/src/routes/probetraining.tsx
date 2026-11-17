import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/blocks";
import { Reveal } from "@/components/reveal";
import { ArrowRight, Mail, Phone, Plus } from "@/components/icons";
import { courses } from "@/content/courses";
import { dayNames } from "@/content/schedule";
import { principles, site, trial } from "@/content/site";
import { breadcrumb, seo } from "@/lib/seo";

export const Route = createFileRoute("/probetraining")({
  head: () =>
    seo({
      title: "Probetraining – erste Einheit kostenlos",
      description:
        "Probetraining im BoxZentrum Kiel: Die erste Einheit ist kostenlos, Handschuhe und Bandagen leihen wir dir. Kein Vertrag im Voraus – ein Anruf reicht.",
      path: "/probetraining",
      jsonLd: [
        breadcrumb([{ name: "Start", path: "/" }, { name: "Probetraining", path: "/probetraining" }]),
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        },
      ],
    }),
  component: TrialPage,
});

const steps = [
  { title: "Training aussuchen", text: "Im Trainingsplan siehst du, wann welche Gruppe läuft. Unsicher? Für Erwachsene ist die Grundschule der Einstieg, für Kinder ab 8 die Grundschule Jugend." },
  { title: "Kurz Bescheid geben", text: "Ruf an oder schreib eine E-Mail. Wenn niemand rangeht, läuft gerade Training – probier es nach der Einheit noch einmal." },
  { title: "Zehn Minuten früher da sein", text: "Dann bleibt Zeit, dich kurz einzuweisen. Am Aufsteller mit dem BoxZentrum-Logo unter dem Vordach bist du richtig." },
  { title: "Mittrainieren", text: "Handschuhe und Bandagen leihen wir dir. Jemand geht mit dir die Grundstellung durch – du stehst nicht am Sack und rätst." },
];

const faq = [
  {
    q: "Was kostet das Probetraining?",
    a: "Die erste Einheit ist kostenlos. Einen Vertrag im Voraus gibt es nicht, und online anmelden musst du dich auch nicht.",
  },
  {
    q: "Brauche ich Erfahrung oder Kondition?",
    a: "Nein. Gewicht, Form und Kondition am ersten Tag sind hier kein Thema. Für den Einstieg gibt es eigene Kurse: Grundschule Erwachsene und Grundschule Jugend.",
  },
  {
    q: "Muss ich in den Ring oder sparren?",
    a: "Nein. Sparring ist freiwillig. Wer sparren will, wird vorbereitet und passend eingeteilt.",
  },
  {
    q: "Was muss ich mitbringen?",
    a: "Sportsachen, saubere Hallenschuhe, ein Handtuch und etwas zu trinken. Handschuhe und Bandagen leihen wir dir.",
  },
  {
    q: "Ab welchem Alter kann man anfangen?",
    a: "Die jüngste Gruppe ist Fit Boxen Jugend für 6- bis 12-Jährige. Die Grundschule Jugend startet ab 8 Jahren, Boxen Vollkontakt ab 14.",
  },
  {
    q: "Können Eltern beim Kindertraining zusehen?",
    a: "Ja, Eltern können jederzeit zusehen – am Rand, nicht am Sack.",
  },
  {
    q: "Geht das auch mit Hansefit?",
    a: `Ja, für diese Formate: ${courses.filter((c) => c.hansefit).map((c) => c.name).join(", ")}.`,
  },
  {
    q: "Was kostet die Mitgliedschaft danach?",
    a: "Zu Mitgliedschaft und Beiträgen sprich uns direkt an – telefonisch, per E-Mail oder in der Halle.",
  },
];

function TrialPage() {
  return (
    <>
      <PageHero
        photo="ausruestung-regal"
        focus="50% 50%"
        title={["Erste Einheit", "kostenlos."]}
        intro={<>{trial.gear} Kein Vertrag im Voraus, keine Anmeldung online. Ein Anruf reicht.</>}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href={site.phone.href} className="btn btn-primary !h-14 px-8 text-[1.0625rem]">
            <Phone size={18} />
            <span className="tnum">{site.phone.display}</span>
          </a>
          <a href="#nachricht" className="btn btn-ghost !h-14 px-8 text-[1.0625rem]">
            <Mail size={18} />
            Nachricht vorbereiten
          </a>
        </div>
      </PageHero>

      {/* Ablauf */}
      <section className="section" aria-labelledby="ablauf-title">
        <div className="shell">
          <h2 id="ablauf-title" className="t-display t-lg text-bone">
            <span className="block">So läuft dein</span>
            <span className="block">erstes Training.</span>
          </h2>
          <ol className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal as="li" key={s.title} index={i} className="relative border-t border-bone/80 pt-6">
                <span className="t-display tnum text-[3.4rem] text-red">{i + 1}</span>
                <h3 className="t-title mt-4 text-bone">{s.title}</h3>
                <p className="mt-3 text-fog">{s.text}</p>
              </Reveal>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link to="/trainingsplan" className="btn btn-light">
              Trainingsplan ansehen
              <ArrowRight size={18} className="btn-icon" />
            </Link>
            <Link to="/training" className="btn btn-ghost">
              Alle Formate
            </Link>
          </div>
        </div>
      </section>

      {/* Nachricht */}
      <section id="nachricht" className="scroll-mt-16 border-y border-iron bg-coal" aria-labelledby="nachricht-title">
        <div className="shell section grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="nachricht-title" className="t-display t-lg text-bone">
              <span className="block">Schreib uns,</span>
              <span className="block">wann du kommst.</span>
            </h2>
            <p className="t-lead mt-8 max-w-[34ch] text-fog">
              Wähle Kurs und Termin – wir bereiten dir die E-Mail vor. Abschicken tust du sie in deinem eigenen Mailprogramm.
            </p>
            <div className="mt-10 space-y-4 text-fog">
              <p>
                <span className="block text-[0.8125rem] text-ash">Lieber anrufen?</span>
                <a href={site.phone.href} className="tnum t-title text-bone hover:underline">
                  {site.phone.display}
                </a>
              </p>
              <p className="text-[0.9375rem]">{trial.phoneHint}</p>
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <MessageComposer />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" aria-labelledby="faq-title">
        <div className="shell grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 id="faq-title" className="t-display t-lg text-bone">
              <span className="block">Fragen vor</span>
              <span className="block">dem ersten Mal.</span>
            </h2>
            <p className="t-lead mt-8 max-w-[32ch] text-fog">{principles[3].text}</p>
          </div>
          <div className="lg:col-span-7">
            <div className="border-t border-iron">
              {faq.map((f) => (
                <details key={f.q} className="faq group border-b border-iron">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.125rem] font-[620] text-bone [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus size={20} className="flex-none text-fog transition-transform duration-300 ease-[var(--ease-out)] group-open:rotate-45" />
                  </summary>
                  <p className="max-w-[60ch] pb-6 text-fog">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MessageComposer() {
  const options = courses.filter((c) => c.trial !== "members");
  const [slug, setSlug] = useState(options.find((c) => c.slug === "grundschule-erwachsene")?.slug ?? options[0]!.slug);
  const course = options.find((c) => c.slug === slug)!;
  const [session, setSession] = useState("");
  const [name, setName] = useState("");
  const [forChild, setForChild] = useState(false);
  const [age, setAge] = useState("");
  const [note, setNote] = useState("");

  const sessionOptions = course.sessions.map((s) => `${dayNames[s.day].long}, ${s.start}–${s.end} Uhr`);
  const chosenSession = sessionOptions.includes(session) ? session : "";

  const href = useMemo(() => {
    const subject = `Probetraining: ${course.name}`;
    const lines = [
      "Hallo BoxZentrum-Team,",
      "",
      forChild
        ? `ich möchte mein Kind${age ? ` (${age} Jahre)` : ""} zum Probetraining „${course.name}“ anmelden.`
        : `ich möchte gern zum Probetraining „${course.name}“ kommen.`,
      chosenSession ? `Wunschtermin: ${chosenSession}` : course.byArrangement ? "Bitte meldet euch für einen Termin." : "",
      note ? `\n${note}` : "",
      "",
      "Viele Grüße",
      name,
    ].filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));
    return `${site.email.href}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  }, [course, chosenSession, name, forChild, age, note]);

  const field = "mt-2 block w-full rounded-[0.875rem] bg-anthracite px-4 py-3.5 text-[1rem] text-bone ring-1 ring-iron outline-none transition-shadow duration-200 placeholder:text-ash focus:ring-2 focus:ring-bone";

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        window.location.href = href;
      }}
    >
      <label className="block">
        <span className="text-[0.875rem] font-[600] text-fog">Kurs</span>
        <select className={field} value={slug} onChange={(e) => { setSlug(e.target.value); setSession(""); }}>
          {options.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name} ({c.access})
            </option>
          ))}
        </select>
      </label>

      {course.sessions.length > 0 ? (
        <fieldset>
          <legend className="text-[0.875rem] font-[600] text-fog">Wunschtermin</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {sessionOptions.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={chosenSession === s} onClick={() => setSession(chosenSession === s ? "" : s)}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="rounded-[0.875rem] bg-anthracite p-4 text-[0.9375rem] text-fog ring-1 ring-iron">
          {course.name} läuft nach Absprache. Wir melden uns mit einem Termin.
        </p>
      )}

      <label className="flex items-center gap-3 text-[0.9375rem] text-fog">
        <input type="checkbox" checked={forChild} onChange={(e) => setForChild(e.target.checked)} className="size-5 accent-[var(--color-red)]" />
        Ich melde mein Kind an
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-[0.875rem] font-[600] text-fog">Dein Name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Vor- und Nachname" />
        </label>
        {forChild && (
          <label className="block">
            <span className="text-[0.875rem] font-[600] text-fog">Alter des Kindes</span>
            <input className={field} value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="z. B. 9" />
          </label>
        )}
      </div>

      <label className="block">
        <span className="text-[0.875rem] font-[600] text-fog">Noch etwas? (optional)</span>
        <textarea className={`${field} min-h-[6.5rem] resize-y`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Vorerfahrung, Fragen, Hansefit …" />
      </label>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <button type="submit" className="btn btn-primary !h-14 px-8 text-[1.0625rem]">
          <Mail size={18} />
          E-Mail öffnen
        </button>
        <p className="text-[0.8125rem] text-ash">Es wird nichts gespeichert oder automatisch versendet.</p>
      </div>
    </form>
  );
}

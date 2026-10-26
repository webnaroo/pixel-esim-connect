// Eigener, datenbasierter Text pro Reiseziel (Länder und Regionen). Quelle: destination-seo.ts.
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { DestinationDetail } from "@/lib/catalog.functions";
import { buildCountrySeo, buildRegionSeo, type SeoPlan } from "@/lib/destination-seo";

export function DestinationSeoText({ d }: { d: DestinationDetail }) {
  const seo = useMemo(() => {
    if (d.fixturePlans) return null;
    const plans: SeoPlan[] = d.plans.map((p) => ({ type: p.type, dataMb: p.dataMb, validityDays: p.validityDays, price: p.price, networks: p.networks, networkType: p.networkType, hotspot: p.hotspot, topUpable: p.topUpable }));
    return d.type === "country"
      ? buildCountrySeo({ slug: d.slug, name: d.name, plans })
      : buildRegionSeo({ slug: d.slug, name: d.name, plans, countryNames: d.countries.map((c) => c.name) });
  }, [d]);
  if (!seo) return null;
  return (
    <section className="container-page mt-14 max-w-3xl" aria-label={`Informationen zur eSIM für ${d.name}`}>
      {seo.sections.map((s) => (
        <div key={s.heading} className="mb-8">
          <h2 className="text-2xl">{s.heading}</h2>
          {s.paragraphs.map((p, i) => <p key={i} className="mt-3 text-ink-muted">{p}</p>)}
          {s.list && <ol className="mt-3 list-decimal space-y-1 pl-6 text-ink-muted">{s.list.map((x) => <li key={x}>{x}</li>)}</ol>}
        </div>
      ))}
      <div className="mb-8">
        <h2 className="text-2xl">Häufige Fragen zur eSIM für {d.name}</h2>
        <dl className="mt-3 space-y-4">
          {seo.faq.map((f) => (
            <div key={f.q}>
              <dt className="font-semibold text-ink">{f.q}</dt>
              <dd className="mt-1 text-ink-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-sm text-ink-muted">
        Mehr dazu: <Link to="/how-it-works" className="text-primary underline">So funktioniert GlobeSIM</Link>,{" "}
        <Link to="/ratgeber/$slug" params={{ slug: "esim-installieren-iphone" }} className="text-primary underline">eSIM auf dem iPhone installieren</Link>,{" "}
        <Link to="/ratgeber/$slug" params={{ slug: "esim-installieren-android-samsung-pixel" }} className="text-primary underline">eSIM auf Android installieren</Link> und{" "}
        <Link to="/device-compatibility" className="text-primary underline">Gerätekompatibilität prüfen</Link>.
      </p>
    </section>
  );
}

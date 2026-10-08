import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/layout";
import { SearchBox } from "@/components/search-box";
import { DestinationRow } from "@/components/catalog";
import { SegmentedControl } from "@/components/ui-kit";
import { destinationsQuery } from "@/lib/catalog.functions";

const CONTINENTS: Record<string, string> = { EU: "Europa", AS: "Asien", NA: "Nordamerika & Karibik", SA: "Südamerika", AF: "Afrika", OC: "Ozeanien" };

export const Route = createFileRoute("/destinations")({
  loader: ({ context }) => context.queryClient.ensureQueryData(destinationsQuery()),
  head: () => ({
    meta: [
      { title: "Alle Reiseziele – eSIM für Länder, Regionen und weltweit | GlobeSIM" },
      { name: "description", content: "Finde die passende eSIM für dein Reiseziel: über 200 Länder, Regionen wie Europa und Asien sowie weltweite Tarife. Preise inkl. MwSt." },
      { property: "og:title", content: "Alle Reiseziele | GlobeSIM" },
      { property: "og:description", content: "eSIM für Länder, Regionen und weltweit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Destinations,
});

function Destinations() {
  const { data } = useSuspenseQuery(destinationsQuery());
  const [tab, setTab] = useState<"country" | "region" | "global">("country");
  const list = data.filter((d) => d.type === tab);
  const grouped = tab === "country"
    ? Object.entries(CONTINENTS).map(([k, label]) => ({ label, items: list.filter((d) => d.continent === k).sort((a, b) => a.name.localeCompare(b.name, "de")) })).filter((g) => g.items.length)
    : [{ label: "", items: list }];

  return (
    <SiteLayout>
      <section className="container-page pt-10">
        <h1>Reiseziele</h1>
        <div className="mt-6 max-w-xl"><SearchBox /></div>
        <div className="mt-8">
          <SegmentedControl label="Art des Reiseziels" value={tab} onChange={setTab} options={[{ value: "country", label: "Länder" }, { value: "region", label: "Regionen" }, { value: "global", label: "Global" }]} />
        </div>
        {grouped.map((g) => (
          <div key={g.label} className="mt-10">
            {g.label && <h2 className="text-xl lg:text-2xl">{g.label}</h2>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((d) => <DestinationRow key={d.id} d={d} />)}
            </div>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}

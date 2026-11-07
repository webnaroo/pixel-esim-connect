import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CaretRight } from "@phosphor-icons/react";
import { Flag } from "@/components/brand";
import { DestinationRow, DestinationRowSkeleton } from "@/components/catalog";
import { LinkButton, SegmentedControl } from "@/components/ui-kit";
import { destinationsQuery, popularQuery, type DestinationListItem } from "@/lib/catalog.functions";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Section, stagger } from "./section";
import destinationPhotos from "@/assets/mobile-destinations.jpg";

// The artwork is one 4-panel strip. Only these four destinations have a photo; nothing else is invented.
const PHOTO_PANEL: Record<string, number> = { turkey: 0, "united-states": 1, thailand: 2, japan: 3 };
const FEATURED = Object.keys(PHOTO_PANEL);

function DestinationTile({ d, index }: { d: DestinationListItem; index: number }) {
  const panel = PHOTO_PANEL[d.slug];
  const name = d.slug === "united-states" ? "USA" : d.name;
  return (
    <Link
      to="/countries/$slug"
      params={{ slug: d.slug }}
      style={stagger("--reveal-i", index)}
      className="reveal group block min-w-0 overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,transform] duration-(--dur-hover) ease-ui-out hover:border-line-strong active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-primary/5">
        {panel != null ? (
          <>
            <div className="absolute inset-0 transition-transform duration-(--dur-sheet) ease-ui-out group-hover:scale-[1.04]">
              <img src={destinationPhotos} alt="" loading="lazy" width={1600} height={800} className="absolute top-0 h-full max-w-none object-cover" style={{ width: "400%", left: `${-panel * 100}%` }} />
            </div>
            {/* The flag sits on the photo so the name below gets the full card width. */}
            <Flag code={d.flagCode} size={28} className="absolute bottom-2 left-2 ring-2 ring-white" />
          </>
        ) : (
          <div className="grid h-full place-items-center"><Flag code={d.flagCode} size={32} /></div>
        )}
      </div>
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <p className="hyphens-auto break-words text-base font-semibold leading-5 text-ink">{name}</p>
          {d.fromPrice != null && <p className="tabular mt-1 whitespace-nowrap text-sm text-ink-muted">ab {formatPrice(d.fromPrice)}</p>}
        </div>
        <CaretRight aria-hidden size={16} className="mt-0.5 hidden shrink-0 text-ink-muted transition-transform duration-(--dur-hover) ease-ui-out group-hover:translate-x-0.5 sm:block" />
      </div>
    </Link>
  );
}

export function PopularDestinations() {
  const { data: all } = useSuspenseQuery(destinationsQuery());
  const { data: popular } = useSuspenseQuery(popularQuery());
  const [tab, setTab] = useState<"country" | "region" | "global">("country");
  const bySlug = new Map(all.map((d) => [d.slug, d]));
  const list =
    tab === "country"
      ? (popular.map((s) => bySlug.get(s)).filter(Boolean) as typeof all).slice(0, 8)
      : all.filter((d) => d.type === tab).slice(0, 8);
  const tiles = FEATURED.map((slug) => bySlug.get(slug)).filter((d): d is DestinationListItem => !!d && d.type === "country");

  return (
    <Section labelledBy="popular-h">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id="popular-h" className="min-w-0">Beliebte Reiseziele</h2>
        <Link to="/destinations" className="flex min-h-10 shrink-0 items-center gap-0.5 text-sm font-medium text-primary sm:hidden">Alle anzeigen <CaretRight size={14} aria-hidden /></Link>
        <div className="hidden sm:block">
          <SegmentedControl label="Art des Reiseziels" value={tab} onChange={setTab} options={[{ value: "country", label: "Länder" }, { value: "region", label: "Regionen" }, { value: "global", label: "Global" }]} />
        </div>
      </div>
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4", tab !== "country" && "sm:hidden")}>
        {tiles.map((d, i) => <DestinationTile key={d.id} d={d} index={i} />)}
      </div>
      <div className="hidden sm:block">
        {tab !== "country" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {list.length ? list.map((d) => <DestinationRow key={d.id} d={d} />) : [0, 1, 2, 3].map((i) => <DestinationRowSkeleton key={i} />)}
          </div>
        )}
      </div>
      <div className="mt-6">
        <LinkButton to="/destinations" variant="secondary" className="w-full sm:w-auto">Alle Reiseziele</LinkButton>
      </div>
    </Section>
  );
}

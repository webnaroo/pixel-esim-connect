import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { publicDb } from "./public-db.server";

export type ShopState = "not_configured" | "catalog_empty" | "ready_disabled" | "live";

export type DestinationListItem = {
  id: string;
  type: "country" | "region" | "global";
  slug: string;
  name: string;
  aliases: string[];
  flagCode: string | null;
  continent: string | null;
  sortOrder: number;
  fromPrice: number | null;
};

export type PlanItem = {
  id: string;
  type: "data" | "unlimited";
  dataMb: number | null;
  validityDays: number;
  networkType: string | null;
  networks: string[] | null;
  hotspot: boolean | null;
  voiceSms: { voice?: boolean; sms?: boolean; note?: string } | null;
  fairUse: { throttleAfterMb?: number; throttledSpeedKbps?: number; note?: string } | null;
  topUpable: boolean | null;
  throttleClaim: "unknown" | "none_confirmed" | "conflict";
  price: number;
  currency: string;
  badge: string | null;
};

export const getShopState = createServerFn({ method: "GET" }).handler(async (): Promise<{ state: ShopState }> => {
  const { providerSetupStatus } = await import("./providers/index.server");
  const status = providerSetupStatus();
  if (!status.configured) return { state: "not_configured" };
  const db = publicDb();
  const [{ count }, { data: setting }] = await Promise.all([
    db.from("public_plans").select("id", { count: "exact", head: true }),
    db.from("app_settings").select("value").eq("key", "shop_enabled").maybeSingle(),
  ]);
  if (!count) return { state: "catalog_empty" };
  if (setting?.value !== true) return { state: "ready_disabled" };
  return { state: "live" };
});

export const shopStateQuery = () =>
  queryOptions({ queryKey: ["shop-state"], queryFn: () => getShopState(), staleTime: 60_000 });

export const getDestinations = createServerFn({ method: "GET" }).handler(async (): Promise<DestinationListItem[]> => {
  const db = publicDb();
  const [{ data: dest, error }, { data: prices }] = await Promise.all([
    db.from("destinations").select("id,type,slug,name_de,aliases,flag_code,continent,sort_order").eq("is_active", true).order("sort_order").order("name_de"),
    db.from("destination_prices").select("destination_id,from_price"),
  ]);
  if (error) throw new Error("Reiseziele konnten nicht geladen werden.");
  const priceMap = new Map((prices ?? []).map((p) => [p.destination_id, p.from_price == null ? null : Number(p.from_price)]));
  return (dest ?? []).map((d) => ({
    id: d.id,
    type: d.type,
    slug: d.slug,
    name: d.name_de,
    aliases: d.aliases,
    flagCode: d.flag_code,
    continent: d.continent,
    sortOrder: d.sort_order,
    fromPrice: priceMap.get(d.id) ?? null,
  }));
});

export const destinationsQuery = () =>
  queryOptions({ queryKey: ["destinations"], queryFn: () => getDestinations(), staleTime: 24 * 60 * 60 * 1000 });

export const getPopularSlugs = createServerFn({ method: "GET" }).handler(async (): Promise<string[]> => {
  const { data } = await publicDb().from("app_settings").select("value").eq("key", "popular_destinations").maybeSingle();
  return Array.isArray(data?.value) ? (data.value as string[]) : [];
});

export const popularQuery = () =>
  queryOptions({ queryKey: ["popular"], queryFn: () => getPopularSlugs(), staleTime: 60 * 60 * 1000 });

export const getDestinationDetail = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const db = publicDb();
    const { data: d } = await db
      .from("destinations")
      .select("id,type,slug,name_de,flag_code,continent,iso_code")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!d) return null;

    const [{ data: plans }, { data: content }, { data: members }, { data: parents }] = await Promise.all([
      db.from("public_plans").select("id,type,data_mb,validity_days,network_type,networks,hotspot,voice_sms,fair_use,top_upable,sell_price,currency,badge,throttle_claim").eq("destination_id", d.id),
      db.from("destinations_content").select("intro,faq,network_info,seo_title,seo_description").eq("destination_id", d.id).maybeSingle(),
      d.type !== "country"
        ? db.from("destination_countries").select("country:destinations!destination_countries_country_id_fkey(slug,name_de,flag_code)").eq("region_id", d.id)
        : Promise.resolve({ data: [] as { country: { slug: string; name_de: string; flag_code: string | null } | null }[] }),
      d.type === "country"
        ? db.from("destination_countries").select("region:destinations!destination_countries_region_id_fkey(slug,name_de,type)").eq("country_id", d.id)
        : Promise.resolve({ data: [] as { region: { slug: string; name_de: string; type: string } | null }[] }),
    ]);

    let related: { slug: string; name: string; flagCode: string | null }[] = [];
    if (d.type === "country" && d.continent) {
      const { data: rel } = await db.from("destinations").select("slug,name_de,flag_code").eq("type", "country").eq("continent", d.continent).neq("id", d.id).order("sort_order").limit(6);
      related = (rel ?? []).map((r) => ({ slug: r.slug, name: r.name_de, flagCode: r.flag_code }));
    }

    const planItems: PlanItem[] = (plans ?? []).map((p) => ({
      id: p.id!,
      type: p.type!,
      dataMb: p.data_mb,
      validityDays: p.validity_days!,
      networkType: p.network_type,
      networks: p.networks,
      hotspot: p.hotspot,
      voiceSms: (p.voice_sms as PlanItem["voiceSms"]) ?? null,
      fairUse: (p.fair_use as PlanItem["fairUse"]) ?? null,
      topUpable: p.top_upable,
      throttleClaim: p.throttle_claim as PlanItem["throttleClaim"],
      price: Number(p.sell_price),
      currency: p.currency ?? "EUR",
      badge: p.badge,
    }));

    return {
      id: d.id,
      type: d.type,
      slug: d.slug,
      name: d.name_de,
      flagCode: d.flag_code,
      ...(await withPreviewPlans(d.slug, planItems)),
      content: content ? { intro: content.intro, seoTitle: content.seo_title, seoDescription: content.seo_description, faq: (Array.isArray(content.faq) ? content.faq : []) as { q: string; a: string }[] } : null,
      countries: (members ?? []).flatMap((m) => (m.country ? [{ slug: m.country.slug, name: m.country.name_de, flagCode: m.country.flag_code }] : [])).sort((a, b) => a.name.localeCompare(b.name, "de")),
      regions: (parents ?? []).flatMap((p) => (p.region ? [{ slug: p.region.slug, name: p.region.name_de }] : [])),
      related,
    };
  });

/** Preview-only sample plans (VITE_USE_FIXTURES=true, never in the published build), labelled "Testdaten". */
async function withPreviewPlans(slug: string, plans: PlanItem[]): Promise<{ plans: PlanItem[]; fixturePlans: boolean }> {
  const { USE_FIXTURES } = await import("./format");
  if (plans.length || !USE_FIXTURES) return { plans, fixturePlans: false };
  const { previewPlans } = await import("./fixtures/plans");
  return { plans: previewPlans(slug), fixturePlans: true };
}

export type DestinationDetail = NonNullable<Awaited<ReturnType<typeof getDestinationDetail>>>;

export const destinationQuery = (slug: string) =>
  queryOptions({ queryKey: ["destination", slug], queryFn: () => getDestinationDetail({ data: { slug } }) });

/** FAQ answers: price/coverage/throttle statements come only from DB values via placeholders; unfillable entries are hidden. */
export const getFaqs = createServerFn({ method: "GET" }).handler(async () => {
  const { fillFaq } = await import("./faq-rules");
  const { parseClaimTexts } = await import("./throttle");
  const { formatPrice } = await import("./format");
  const db = publicDb();
  const [{ data }, { data: plans }, { data: claimRow }] = await Promise.all([
    db.from("faqs").select("id,question,answer,category").order("sort_order"),
    db.from("public_plans").select("sell_price,currency,destination_id,type,throttle_claim").gt("sell_price", 0),
    db.from("app_settings").select("value").eq("key", "unlimited_claim").maybeSingle(),
  ]);
  const ps = plans ?? [];
  const min = ps.length ? ps.reduce((a, p) => (Number(p.sell_price) < Number(a.sell_price) ? p : a)) : null;
  const texts = parseClaimTexts(claimRow?.value);
  const confirmed = ps.some((p) => p.type === "unlimited" && p.throttle_claim === "none_confirmed");
  const ctx = {
    minPrice: min ? formatPrice(Number(min.sell_price), min.currency ?? "EUR") : null,
    destinationCount: new Set(ps.map((p) => p.destination_id)).size || null,
    unlimitedClaim: confirmed && texts ? `Unlimited ${texts.label}${texts.qualifier ? ` ${texts.qualifier}` : ""}` : null,
  };
  return (data ?? []).flatMap((f) => {
    const answer = fillFaq(f.answer, ctx);
    const question = fillFaq(f.question, ctx);
    return answer && question ? [{ ...f, answer, question }] : [];
  });
});

export const faqsQuery = () => queryOptions({ queryKey: ["faqs"], queryFn: () => getFaqs(), staleTime: 60 * 60 * 1000 });

/** Editable claim texts; returned only when at least one active plan is confirmed throttle-free. */
export const getUnlimitedClaim = createServerFn({ method: "GET" }).handler(async () => {
  const { parseClaimTexts } = await import("./throttle");
  const db = publicDb();
  const [{ count }, { data: row }] = await Promise.all([
    db.from("public_plans").select("id", { count: "exact", head: true }).eq("type", "unlimited").eq("throttle_claim", "none_confirmed"),
    db.from("app_settings").select("value").eq("key", "unlimited_claim").maybeSingle(),
  ]);
  const texts = parseClaimTexts(row?.value);
  return { texts, anyConfirmed: (count ?? 0) > 0 };
});
export const unlimitedClaimQuery = () => queryOptions({ queryKey: ["unlimited-claim"], queryFn: () => getUnlimitedClaim(), staleTime: 5 * 60_000 });

// Preview-only sample plans (VITE_USE_FIXTURES=true). Always labelled "Testdaten", never purchasable, no real tariffs or prices.
import type { PlanItem } from "../catalog.functions";

const base = { networkType: null, networks: null, hotspot: null, voiceSms: null, topUpable: null, currency: "EUR", badge: null } as const;
export function previewPlans(slug: string): PlanItem[] {
  const id = (s: string) => `fixture-${slug}-${s}`;
  return [
    { ...base, id: id("d1"), type: "data", dataMb: 1024, validityDays: 7, fairUse: null, price: 1.49, throttleClaim: "unknown" },
    { ...base, id: id("d3"), type: "data", dataMb: 3072, validityDays: 15, fairUse: null, price: 2.49, throttleClaim: "unknown" },
    { ...base, id: id("d5"), type: "data", dataMb: 5120, validityDays: 30, fairUse: null, price: 3.49, throttleClaim: "unknown" },
    { ...base, id: id("u7"), type: "unlimited", dataMb: null, validityDays: 7, fairUse: null, price: 4.49, throttleClaim: "none_confirmed" },
    { ...base, id: id("u15"), type: "unlimited", dataMb: null, validityDays: 15, fairUse: null, price: 5.49, throttleClaim: "unknown" },
    { ...base, id: id("u30"), type: "unlimited", dataMb: null, validityDays: 30, fairUse: { note: "Testdaten: Drosselungshinweis" }, price: 6.49, throttleClaim: "conflict" },
  ];
}

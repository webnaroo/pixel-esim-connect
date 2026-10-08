// Pure business rules for the admin area (server enforces them; UI only mirrors).

/** Catalog sync aborts when the provider returns fewer than this share of the previously active plans. */
export const SYNC_MIN_SHARE = 0.5;

export function evaluateSyncThreshold(previousActive: number, fetched: number): { abort: boolean; message?: string } {
  if (previousActive > 0 && fetched < previousActive * SYNC_MIN_SHARE) {
    return {
      abort: true,
      message: `Sync abgebrochen: eSIMerge lieferte ${fetched} Tarife, vorher waren ${previousActive} aktiv (unter 50 %). Es wurde nichts geändert.`,
    };
  }
  return { abort: false };
}

export type ShopChecklist = { providerReachable: boolean; providerSandbox: boolean; catalogCount: number; stripeConfigured: boolean };

export function shopChecklistMissing(c: ShopChecklist): string[] {
  const missing: string[] = [];
  if (!c.providerReachable) missing.push("Provider erreichbar");
  // A sandbox key never delivers real eSIMs: the shop can never go live with it.
  if (c.providerSandbox) missing.push("eSIMerge Live-Zugang (aktuell Sandbox)");
  if (!(c.catalogCount > 0)) missing.push("Katalog größer 0");
  if (!c.stripeConfigured) missing.push("Stripe konfiguriert");
  return missing;
}

export const canEnableShop = (c: ShopChecklist) => shopChecklistMissing(c).length === 0;

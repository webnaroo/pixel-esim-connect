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

export type ShopChecklist = { providerReachable: boolean; providerSandbox: boolean; catalogCount: number; stripeConfigured: boolean; stripeMissing?: string[]; emailVerified?: boolean; emailTestSent?: boolean; replyConfirmed?: boolean; legalPublished?: boolean; fxValid?: boolean; webhookReady?: boolean; providerAuthOk?: boolean };

export function shopChecklistMissing(c: ShopChecklist): string[] {
  const missing: string[] = [];
  if (!c.providerReachable) missing.push("Provider erreichbar");
  if (c.providerAuthOk === false) missing.push("eSIMerge-Zugang gültig");
  // A sandbox key never delivers real eSIMs: the shop can never go live with it.
  if (c.providerSandbox) missing.push("eSIMerge Live-Zugang (aktuell Sandbox)");
  if (!(c.catalogCount > 0)) missing.push("Katalog größer 0");
  if (c.stripeMissing?.length) missing.push(...c.stripeMissing);
  else if (!c.stripeConfigured) missing.push("Stripe konfiguriert");
  if (c.emailVerified === false) missing.push("E-Mail-Domain notify.globesim.de verifiziert");
  if (c.emailTestSent === false) missing.push("Test-E-Mail gesendet");
  if (c.replyConfirmed === false) missing.push("Antwortadresse support@globesim.de bestätigt");
  if (c.fxValid === false) missing.push("Wechselkurs aktuell");
  if (c.webhookReady === false) missing.push("eSIMerge-Webhook eingerichtet");
  if (c.legalPublished === false) missing.push("Rechtsseiten freigegeben");
  return missing;
}

export const canEnableShop = (c: ShopChecklist) => shopChecklistMissing(c).length === 0;

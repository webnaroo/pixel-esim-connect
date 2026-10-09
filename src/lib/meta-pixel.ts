/**
 * Meta Pixel — loads ONLY after marketing consent (TTDSG §25 / DSGVO).
 * Before consent: no script, no cookies, no requests to Meta.
 * Events are deduplicated by a key: once per page load (ViewContent/InitiateCheckout)
 * or permanently per order (Purchase, stored in localStorage).
 */
export const META_PIXEL_ID = "1794858788373135";
const CONSENT_KEY = "globesim_consent_v1";
const PURCHASE_KEY = "globesim_px_purchases";

export type Consent = { marketing: boolean; decidedAt: string };

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

const listeners = new Set<() => void>();
const firedThisPage = new Set<string>();

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    return typeof c?.marketing === "boolean" ? c : null;
  } catch { return null; }
}

export function saveConsent(marketing: boolean) {
  const before = readConsent()?.marketing;
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ marketing, decidedAt: new Date().toISOString() }));
  if (marketing) { loadPixel(); trackPageView(); }
  else if (before) {
    // Withdrawal: Meta's cookies must go; reload so the loaded script is gone too.
    for (const n of ["_fbp", "_fbc"]) document.cookie = `${n}=; Max-Age=0; path=/; domain=.${location.hostname.replace(/^www\./, "")}`, document.cookie = `${n}=; Max-Age=0; path=/`;
    location.reload();
    return;
  }
  listeners.forEach((l) => l());
}

export function onConsentChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function openConsentSettings() { window.dispatchEvent(new Event("globesim:consent-open")); }

const allowed = () => readConsent()?.marketing === true;

/** Meta's official base snippet, run only after consent. */
export function loadPixel() {
  if (typeof window === "undefined" || !allowed() || window.fbq) return;
  const n: Fbq = function (...args: unknown[]) { n.callMethod ? n.callMethod(...args) : n.queue!.push(args); } as Fbq;
  window.fbq = n; window._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  const s = document.createElement("script");
  s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  n("init", META_PIXEL_ID);
}

let lastPath: string | null = null;
/** Called on initial load and on every client-side navigation; same URL twice = one PageView. */
export function trackPageView(path = typeof location !== "undefined" ? location.pathname + location.search : "") {
  if (!allowed()) return;
  loadPixel();
  if (path === lastPath) return;
  lastPath = path;
  firedThisPage.clear();
  window.fbq?.("track", "PageView");
}

function send(event: string, params: Record<string, unknown>, eventID?: string) {
  if (!allowed()) return false;
  loadPixel();
  window.fbq?.("track", event, params, eventID ? { eventID } : undefined);
  return true;
}

export function trackOncePerPage(event: "ViewContent" | "InitiateCheckout" | "AddToCart", key: string, params: Record<string, unknown>) {
  const k = `${event}:${key}`;
  if (firedThisPage.has(k)) return;
  if (send(event, params)) firedThisPage.add(k);
}

/** Purchase: once per order ever on this device; eventID = order id for later server-side deduplication. */
export function trackPurchaseOnce(orderId: string, value: number, currency: string, contentId?: string) {
  if (!allowed() || !Number.isFinite(value) || value <= 0) return;
  let done: string[] = [];
  try { done = JSON.parse(localStorage.getItem(PURCHASE_KEY) ?? "[]"); } catch { /* ignore */ }
  if (done.includes(orderId)) return;
  if (send("Purchase", { value: Math.round(value * 100) / 100, currency: currency.toUpperCase(), content_type: "product", ...(contentId ? { content_ids: [contentId] } : {}), num_items: 1 }, `purchase_${orderId}`)) {
    localStorage.setItem(PURCHASE_KEY, JSON.stringify([...done, orderId].slice(-50)));
  }
}

/** Server-confirmed payment states (set only by the verified Stripe webhook). */
export const PAID_STATUSES = ["paid", "fulfilling", "fulfilled", "needs_review", "fulfillment_failed"] as const;
export function isPurchaseTrackable(o: { status: string; isTest: boolean; amount: number }) {
  return !o.isTest && o.amount > 0 && (PAID_STATUSES as readonly string[]).includes(o.status);
}

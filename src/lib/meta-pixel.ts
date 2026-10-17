/**
 * Meta Pixel — loads ONLY after marketing consent (TTDSG §25 / DSGVO).
 * Before consent: no script, no cookies, no requests to Meta.
 * Events are deduplicated by a key: once per page load (ViewContent/InitiateCheckout)
 * or permanently per order (Purchase, stored in localStorage).
 * TikTok Pixel runs in this same file and follows the same consent + dedup rules.
 */
export const META_PIXEL_ID = "1794858788373135";
const CONSENT_KEY = "globesim_consent_v1";
const PURCHASE_KEY = "globesim_px_purchases";

export type Consent = { marketing: boolean; decidedAt: string };

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...a: unknown[]) => void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: unknown;
};
declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const listeners = new Set<() => void>();
const firedThisPage = new Set<string>();

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    return typeof c?.marketing === "boolean" ? c : null;
  } catch {
    return null;
  }
}

export function saveConsent(marketing: boolean) {
  const before = readConsent()?.marketing;
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ marketing, decidedAt: new Date().toISOString() }));
  if (marketing) {
    loadPixel();
    trackPageView();
  } else if (before) {
    // Withdrawal: Meta's cookies must go; reload so the loaded script is gone too.
    for (const n of ["_fbp", "_fbc", "_ttp"])
      ((document.cookie = `${n}=; Max-Age=0; path=/; domain=.${location.hostname.replace(/^www\./, "")}`),
        (document.cookie = `${n}=; Max-Age=0; path=/`));
    location.reload();
    return;
  }
  listeners.forEach((l) => l());
}

export function onConsentChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function openConsentSettings() {
  document.querySelector<HTMLElement>("[data-cc='c-settings']")?.click();
}

declare global {
  interface Window {
    __gsMetaConsent?: boolean;
  }
}
/** Consent comes from the prive.eu consent tool: it unblocks the masked "Facebook" script in __root, which sets this flag. */
const allowed = () => typeof window !== "undefined" && window.__gsMetaConsent === true;

/** Meta's official base snippet, run only after consent. */
export function loadPixel() {
  loadTikTokPixel(); // TIKTOK: loads once, only with consent
  if (typeof window === "undefined" || !allowed() || window.fbq) return;
  const n: Fbq = function (...args: unknown[]) {
    n.callMethod ? n.callMethod(...args) : n.queue!.push(args);
  } as Fbq;
  window.fbq = n;
  window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  n("init", META_PIXEL_ID);
}

/* ===== TikTok Pixel — loads ONLY after marketing consent ===== */
export const TIKTOK_PIXEL_ID = "DB9R1GJC77U2CDFHKMGG";
declare global {
  interface Window {
    ttq?: any;
    TiktokAnalyticsObject?: string;
    __gsTikTokConsent?: boolean;
  }
}
/** Uses its own consent flag if the consent tool sets one; otherwise the same marketing consent as Meta. */
const allowedTT = () => typeof window !== "undefined" && (window.__gsTikTokConsent ?? window.__gsMetaConsent) === true;
let ttLoaded = false;

/** TikTok's official base snippet, run only after consent. ttq.page() is NOT called here; trackPageView does it (avoids a double PageView). */
export function loadTikTokPixel() {
  if (typeof window === "undefined" || !allowedTT() || ttLoaded) return;
  ttLoaded = true;
  (function (w: any, d: Document, t: string) {
    w.TiktokAnalyticsObject = t;
    const ttq: any = (w[t] = w[t] || []);
    ttq.methods = [
      "page",
      "track",
      "identify",
      "instances",
      "debug",
      "on",
      "off",
      "once",
      "ready",
      "alias",
      "group",
      "enableCookie",
      "disableCookie",
      "holdConsent",
      "revokeConsent",
      "grantConsent",
    ];
    ttq.setAndDefer = function (obj: any, e: string) {
      obj[e] = function () {
        obj.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (id: string) {
      const inst = ttq._i[id] || [];
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(inst, ttq.methods[n]);
      return inst;
    };
    ttq.load = function (id: string, opts?: unknown) {
      const url = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[id] = [];
      ttq._i[id]._u = url;
      ttq._t = ttq._t || {};
      ttq._t[id] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[id] = opts || {};
      const s = d.createElement("script");
      s.type = "text/javascript";
      s.async = true;
      s.src = url + "?sdkid=" + id + "&lib=" + t;
      const first = d.getElementsByTagName("script")[0];
      first.parentNode!.insertBefore(s, first);
    };
    ttq.load(TIKTOK_PIXEL_ID);
  })(window, document, "ttq");
}

/** Meta event name -> TikTok event name. */
const TT_EVENT: Record<string, string> = {
  ViewContent: "ViewContent",
  InitiateCheckout: "InitiateCheckout",
  AddToCart: "AddToCart",
  Purchase: "CompletePayment",
};

function ttqSend(event: string, params: Record<string, unknown>, eventID?: string) {
  if (!allowedTT()) return;
  loadTikTokPixel();
  const name = TT_EVENT[event];
  if (!name || !window.ttq) return;
  const ids = Array.isArray(params.content_ids) ? (params.content_ids as unknown[]).map(String) : [];
  const data: Record<string, unknown> = {
    content_type: "product",
    ...(typeof params.value === "number" && Number.isFinite(params.value) ? { value: params.value } : {}),
    ...(typeof params.currency === "string" ? { currency: params.currency } : {}),
    ...(ids.length ? { contents: ids.map((id) => ({ content_id: id, content_type: "product", quantity: 1 })) } : {}),
  };
  if (eventID) window.ttq.track(name, data, { event_id: eventID });
  else window.ttq.track(name, data);
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
  if (allowedTT()) window.ttq?.page(); // TIKTOK
}

function send(event: string, params: Record<string, unknown>, eventID?: string) {
  if (!allowed()) return false;
  loadPixel();
  window.fbq?.("track", event, params, eventID ? { eventID } : undefined);
  ttqSend(event, params, eventID); // TIKTOK
  return true;
}

export function trackOncePerPage(
  event: "ViewContent" | "InitiateCheckout" | "AddToCart",
  key: string,
  params: Record<string, unknown>,
) {
  const k = `${event}:${key}`;
  if (firedThisPage.has(k)) return;
  if (send(event, params)) firedThisPage.add(k);
}

/** Purchase: once per order ever on this device; eventID = order id for later server-side deduplication. */
export function trackPurchaseOnce(orderId: string, value: number, currency: string, contentId?: string) {
  if (!allowed() || !Number.isFinite(value) || value <= 0) return;
  let done: string[] = [];
  try {
    done = JSON.parse(localStorage.getItem(PURCHASE_KEY) ?? "[]");
  } catch {
    /* ignore */
  }
  if (done.includes(orderId)) return;
  if (
    send(
      "Purchase",
      {
        value: Math.round(value * 100) / 100,
        currency: currency.toUpperCase(),
        content_type: "product",
        ...(contentId ? { content_ids: [contentId] } : {}),
        num_items: 1,
      },
      `purchase_${orderId}`,
    )
  ) {
    localStorage.setItem(PURCHASE_KEY, JSON.stringify([...done, orderId].slice(-50)));
  }
}

/** Server-confirmed payment states (set only by the verified Stripe webhook). */
export const PAID_STATUSES = ["paid", "fulfilling", "fulfilled", "needs_review", "fulfillment_failed"] as const;
export function isPurchaseTrackable(o: { status: string; isTest: boolean; amount: number }) {
  return !o.isTest && o.amount > 0 && (PAID_STATUSES as readonly string[]).includes(o.status);
}

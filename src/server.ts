import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { cacheKeyFor, canServeFromCache, freshness, isStorable } from "./lib/edge-cache";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

type WorkerCtx = { waitUntil?: (p: Promise<unknown>) => void };

async function render(request: Request, env: unknown, ctx: unknown): Promise<Response> {
  try {
    const handler = await getServerEntry();
    const response = await handler.fetch(request, env, ctx);
    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}

const CACHED_AT = "x-cached-at";

/** Speichert eine frische Antwort im Cloudflare-Cache. Fehler dabei dürfen nie die Seite stören. */
async function store(edge: Cache, key: string, response: Response): Promise<void> {
  try {
    const copy = new Response(response.clone().body, response);
    copy.headers.set(CACHED_AT, String(Date.now()));
    copy.headers.set("Cache-Control", "public, max-age=600");
    await edge.put(new Request(key), copy);
  } catch {
    /* Cache nicht verfügbar */
  }
}

function tag(response: Response, state: "HIT" | "STALE" | "MISS" | "BYPASS"): Response {
  const out = new Response(response.body, response);
  out.headers.set("x-edge-cache", state);
  out.headers.delete(CACHED_AT);
  // Browser und Zwischenserver halten die Seite nicht fest; der Cache sitzt nur hier im Worker. Nicht gespeicherte Antworten (Fehler, 404) bleiben unverändert.
  if (state !== "BYPASS") out.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  return out;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const edge = (globalThis as { caches?: { default?: Cache } }).caches?.default;
    const key = edge && canServeFromCache({ method: request.method, hasAuthorization: request.headers.has("authorization") }) ? cacheKeyFor(new URL(request.url)) : null;
    if (!edge || !key) return render(request, env, ctx);

    try {
      const hit = await edge.match(new Request(key));
      if (hit) {
        const age = (Date.now() - Number(hit.headers.get(CACHED_AT))) / 1000;
        const state = freshness(age);
        if (state === "fresh") return tag(hit, "HIT");
        if (state === "stale") {
          // Alte Seite sofort ausliefern, im Hintergrund neu laden.
          const wait = (ctx as WorkerCtx | undefined)?.waitUntil?.bind(ctx);
          wait?.(render(new Request(request), env, ctx).then((fresh) => (isStorable({ status: fresh.status, contentType: fresh.headers.get("content-type"), hasSetCookie: fresh.headers.has("set-cookie"), cacheControl: fresh.headers.get("cache-control") }) ? store(edge, key, fresh) : undefined)));
          return tag(hit, "STALE");
        }
      }
    } catch {
      /* ohne Cache weiter */
    }

    const response = await render(request, env, ctx);
    if (!isStorable({ status: response.status, contentType: response.headers.get("content-type"), hasSetCookie: response.headers.has("set-cookie"), cacheControl: response.headers.get("cache-control") })) return tag(response, "BYPASS");
    const waitStore = (ctx as WorkerCtx | undefined)?.waitUntil?.bind(ctx);
    if (waitStore) waitStore(store(edge, key, response));
    else await store(edge, key, response);
    return tag(response, "MISS");
  },
};

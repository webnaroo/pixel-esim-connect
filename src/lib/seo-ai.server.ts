import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeAnalysis, seoReportInput } from "./seo-analysis";
import { createSeoResponsesCall } from "./ai/responses.server";
import { AI_BLOCKING_STATUSES, upstreamErrorMessage } from "./ai/gemini.server";

function jsonError(message: string, status: number) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleSeoAnalysis(request: Request, config: { apiKey: string | undefined; dbUrl: string | undefined; publicKey: string | undefined }) {
  if (!config.dbUrl || !config.publicKey) return jsonError("Anmeldung nicht verfügbar.", 503);
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Anmeldung erforderlich.", 401);
  const key = config.publicKey;
  const userDb = createClient<Database>(config.dbUrl, key, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth }, fetch: (input, init) => {
      const headers = new Headers(init?.headers); headers.set("apikey", key);
      if (headers.get("Authorization") === `Bearer ${key}` && key.startsWith("sb_")) headers.delete("Authorization");
      return fetch(input, { ...init, headers });
    } },
  });
  const { data: user, error: authError } = await userDb.auth.getUser(auth.slice(7));
  if (authError || !user.user) return jsonError("Anmeldung erforderlich.", 401);
  const role = await userDb.rpc("has_role", { _user_id: user.user.id, _role: "admin" });
  if (role.error || !role.data) return jsonError("Admin-Rolle erforderlich.", 403);
  const requestOrigin = request.headers.get("Origin");
  if (!requestOrigin || requestOrigin !== new URL(request.url).origin) return jsonError("Ungültiger Anfrageursprung.", 403);
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const state = await db.from("seo_ai_state").select("blocked,reason,status_code").eq("id", true).maybeSingle();
  if (state.error) return jsonError("KI-Status konnte nicht geprüft werden.", 503);
  if (state.data?.blocked) return jsonError(state.data.reason ?? "KI-Zugriff pausiert. Nach Behebung ausdrücklich freigeben.", state.data.status_code ?? 403);
  if (!config.apiKey) return jsonError("KI ist noch nicht eingerichtet (GEMINI_API_KEY fehlt).", 401);
  if (Number(request.headers.get("Content-Length") ?? 0) > 180000) return jsonError("Bericht ist zu groß.", 413);
  let parsed;
  try {
    const body = await request.text();
    if (body.length > 170000) return jsonError("Bericht ist zu groß.", 413);
    parsed = seoReportInput.parse(JSON.parse(body));
  } catch { return jsonError("Bitte Titel und Bericht mit 20 bis 40.000 Zeichen eingeben.", 400); }
  const latest = await db.from("seo_runs").select("result,created_at").eq("kind", "audit").eq("status", "completed").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const inserted = await db.from("seo_runs").insert({ actor_id: user.user.id, kind: "analysis", status: "running", title: parsed.title, input_report: parsed.report }).select("id").single();
  if (inserted.error) return jsonError("Analyse konnte nicht gespeichert werden.", 503);
  const runId = inserted.data.id;
  let upstreamStatus = 500;
  let safeMessage = "KI-Analyse fehlgeschlagen. Es wurde kein Ergebnis erstellt.";
  let providerRefused = false;
  const { result } = createSeoResponsesCall(request, config.apiKey, parsed.report, latest.data, async (response) => {
    if (response.ok) return;
    upstreamStatus = response.status;
    safeMessage = await upstreamErrorMessage(response, safeMessage);
    if (AI_BLOCKING_STATUSES.includes(response.status)) {
      await db.from("seo_ai_state").upsert({ id: true, blocked: true, reason: safeMessage, status_code: response.status, updated_at: new Date().toISOString() });
    }
  });
  // Read the first provider event before committing HTTP headers: preserve terminal denial status.
  const iterator = result.fullStream[Symbol.asyncIterator]();
  const persistFailure = async (message: string, cancelled = false) => {
    await db.from("seo_runs").update({ status: cancelled ? "cancelled" : "failed", error: message }).eq("id", runId);
  };
  let first;
  try {
    first = await iterator.next();
    // SDK emits a local start event before the upstream HTTP request is completed.
    while (!first.done && (first.value.type === "start" || first.value.type === "start-step")) first = await iterator.next();
    if (first.done || first.value.type === "error") {
      await persistFailure(safeMessage);
      return jsonError(safeMessage, upstreamStatus);
    }
  } catch {
    const cancelled = request.signal.aborted;
    await persistFailure(cancelled ? "Analyse abgebrochen." : safeMessage, cancelled);
    return jsonError(cancelled ? "Analyse abgebrochen." : safeMessage, cancelled ? 499 : upstreamStatus);
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: unknown) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        emit({ type: "progress", message: "Bericht wird ausgewertet…" });
        let next: Awaited<ReturnType<typeof iterator.next>> = first;
        while (!next.done) {
          const event = next.value;
          if (event.type === "error") throw new Error(safeMessage);
          if (event.type === "abort") throw new Error("Analyse abgebrochen.");
          if (event.type === "reasoning-delta") emit({ type: "progress", message: "Prioritäten werden geprüft…" });
          if (event.type === "finish" && event.finishReason === "content-filter") providerRefused = true;
          next = await iterator.next();
        }
        if (providerRefused) throw new Error("Das Modell hat diese Anfrage abgelehnt.");
        const analysis = normalizeAnalysis(await result.output);
        if (!analysis.recommendations.length) throw new Error("Keine konkreten Empfehlungen erstellt. Bitte Daten prüfen.");
        const saved = await db.from("seo_runs").update({ status: "completed", pages: [...new Set(analysis.recommendations.map((r) => r.page).filter(Boolean))], result: analysis }).eq("id", runId);
        if (saved.error) throw new Error("Ergebnis konnte nicht gespeichert werden.");
        emit({ type: "result", analysis });
      } catch (error) {
        const cancelled = request.signal.aborted;
        const message = cancelled ? "Analyse abgebrochen." : upstreamStatus !== 500 ? safeMessage : error instanceof Error ? error.message : safeMessage;
        await persistFailure(message, cancelled);
        emit({ type: "error", status: cancelled ? 499 : upstreamStatus, message });
      } finally { controller.close(); }
    },
    cancel: async () => { await iterator.return?.(); },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
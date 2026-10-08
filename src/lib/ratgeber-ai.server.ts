// Admin-only Ratgeber AI route handler (generate draft, regenerate section/FAQ, suggestions). Never publishes.
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import type { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./ai/run-id.server.ts";
import { AI_RULES, aiRequestSchema, allowedPaths, cleanText, draftOut, draftRow, faqOut, sectionOut, suggestOut, type AiContext } from "./ratgeber-ai";
import { LENGTHS, POST_TYPES, parseFaq, parseLinks, parseSections, parseSources } from "./ratgeber";
import { computeScore, DEFAULT_WORDLIST } from "./ratgeber-score";

const jsonError = (message: string, status: number) => Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });

export async function handleRatgeberAi(request: Request, config: { apiKey: string | undefined; dbUrl: string | undefined; publicKey: string | undefined }) {
  if (!config.dbUrl || !config.publicKey) return jsonError("Anmeldung nicht verfügbar.", 503);
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return jsonError("Anmeldung erforderlich.", 401);
  const key = config.publicKey;
  const userDb = createClient<Database>(config.dbUrl, key, {
    auth: { persistSession: false },
    global: { headers: { Authorization: auth }, fetch: (input, init) => {
      const h = new Headers(init?.headers); h.set("apikey", key);
      if (h.get("Authorization") === `Bearer ${key}` && key.startsWith("sb_")) h.delete("Authorization");
      return fetch(input, { ...init, headers: h });
    } },
  });
  const { data: user, error: authError } = await userDb.auth.getUser(auth.slice(7));
  if (authError || !user.user) return jsonError("Anmeldung erforderlich.", 401);
  const role = await userDb.rpc("has_role", { _user_id: user.user.id, _role: "admin" });
  if (role.error || !role.data) return jsonError("Admin-Rolle erforderlich.", 403);
  if (request.headers.get("Origin") !== new URL(request.url).origin) return jsonError("Ungültiger Anfrageursprung.", 403);
  if (!config.apiKey) return jsonError("Lovable AI ist noch nicht eingerichtet.", 401);

  let req;
  try { req = aiRequestSchema.parse(JSON.parse(await request.text())); } catch { return jsonError("Ungültige Eingabe.", 400); }

  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const state = await db.from("seo_ai_state").select("blocked,reason,status_code").eq("id", true).maybeSingle();
  if (state.data?.blocked) return jsonError(state.data.reason ?? "KI-Zugriff pausiert.", state.data.status_code ?? 403);

  // Context: real destinations and published posts only.
  const [{ data: dests }, { data: plans }, { data: posts }, { data: wl }] = await Promise.all([
    db.from("destinations").select("id,slug,iso_code,name_de,type").eq("is_active", true),
    db.from("public_plans").select("destination_id,type,throttle_claim"),
    db.from("blog_posts").select("title,slug").in("status", ["published", "scheduled"]).lte("published_at", new Date().toISOString()),
    db.from("app_settings").select("value").eq("key", "blog_wordlist").maybeSingle(),
  ]);
  const withPlans = new Set((plans ?? []).map((p) => p.destination_id));
  const ctx: AiContext = {
    destinations: (dests ?? []).filter((d) => withPlans.has(d.id)).map((d) => ({
      iso: (d.iso_code ?? "").toUpperCase(), name: d.name_de, path: `/${d.type === "country" ? "countries" : "regions"}/${d.slug}`,
      unlimited_confirmed: (plans ?? []).some((p) => p.destination_id === d.id && p.type === "unlimited" && p.throttle_claim === "none_confirmed"),
    })),
    posts: (posts ?? []).map((p) => ({ title: p.title, path: `/ratgeber/${p.slug}` })),
  };
  const wordlist = Array.isArray(wl?.value) ? (wl.value as string[]) : DEFAULT_WORDLIST;

  let post: Database["public"]["Tables"]["blog_posts"]["Row"] | null = null;
  if (req.mode !== "generate") {
    post = (await db.from("blog_posts").select("*").eq("id", req.postId).maybeSingle()).data;
    if (!post) return jsonError("Beitrag nicht gefunden.", 404);
    if (req.mode === "section" && !parseSections(post.sections)[req.index]) return jsonError("Abschnitt nicht gefunden.", 404);
  }
  const postData = post && { title: post.title, focus_keyword: post.focus_keyword, country: post.country_code, type: post.post_type, answer_summary: post.answer_summary, sections: parseSections(post.sections), faq: parseFaq(post.faq) };

  let schema: z.ZodType<unknown>; let task: unknown;
  if (req.mode === "generate") {
    schema = draftOut;
    task = { task: "Erstelle einen vollständigen Entwurf.", topic: req.topic, focus_keyword: req.keyword || null, country_iso: req.country.toUpperCase() || null, type: POST_TYPES[req.type], target_words: LENGTHS[req.length] };
  } else if (req.mode === "section") {
    schema = sectionOut;
    task = { task: `Schreibe ausschließlich Abschnitt Nr. ${req.index + 1} neu (gleiches Thema, bessere Qualität).`, post: postData };
  } else if (req.mode === "faq") {
    schema = faqOut;
    task = { task: "Schreibe die FAQ neu: 4–6 Einträge, jede Antwort 40–60 Wörter.", post: postData };
  } else {
    schema = suggestOut;
    task = { task: "Gib bis zu 8 konkrete Textvorschläge, die die Qualität verbessern. Ändere nichts selbst; area = betroffenes Feld oder Abschnitt.", post: postData, quality_report: post?.quality_report };
  }
  const allowed = allowedPaths(ctx);

  const gateway = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  let upstreamStatus = 500; let safeMessage = "KI-Anfrage fehlgeschlagen.";
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: config.apiKey,
    headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const res = await gateway.fetch(input, init);
      if (!res.ok) {
        upstreamStatus = res.status;
        try { const b = await res.clone().json() as { message?: string; error?: { message?: string } }; safeMessage = b.message ?? b.error?.message ?? safeMessage; } catch { /* keep status */ }
        if ([402, 403].includes(res.status)) await db.from("seo_ai_state").upsert({ id: true, blocked: true, reason: safeMessage, status_code: res.status, updated_at: new Date().toISOString() });
      }
      return res;
    },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    maxRetries: 0,
    abortSignal: request.signal,
    output: Output.object({ schema }),
    instructions: AI_RULES,
    messages: [{ role: "user", content: JSON.stringify({ ...task as object, context: { allowed_links: [...allowed], destinations: ctx.destinations, other_posts: ctx.posts } }) }],
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  });

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: unknown) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        emit({ type: "progress", message: "KI schreibt …" });
        let refused = false;
        for await (const ev of result.fullStream) {
          if (ev.type === "error") throw new Error(safeMessage);
          if (ev.type === "reasoning-delta") emit({ type: "progress", message: "KI plant den Text …" });
          if (ev.type === "text-delta") emit({ type: "progress", message: "Text wird erstellt …" });
          if (ev.type === "finish" && ev.finishReason === "content-filter") refused = true;
        }
        if (refused) throw new Error("Das Modell hat diese Anfrage abgelehnt.");
        const out = await result.output;
        const confirmed = !!post?.country_code && ctx.destinations.some((d) => d.iso === post!.country_code && d.unlimited_confirmed);
        const c = (s: string) => cleanText(s, allowed, confirmed);
        if (req.mode === "generate") {
          const row = draftRow(draftOut.parse(out), ctx, req, LENGTHS[req.length]);
          const { data: taken } = await db.from("blog_posts").select("slug").like("slug", `${row.slug}%`);
          const used = new Set((taken ?? []).map((t) => t.slug));
          let slug = row.slug; for (let i = 2; used.has(slug); i++) slug = `${row.slug}-${i}`;
          const score = computeScore({ ...row, slug, sources: [], updated_at: new Date().toISOString() }, wordlist);
          const ins = await db.from("blog_posts").insert({ ...row, slug, author_name: null, quality_score: score.total, quality_report: score as never, generation_meta: { model: "openai/gpt-6-astra", topic: req.topic, keyword: req.keyword, type: req.type, length: req.length, at: new Date().toISOString(), by: user.user.id } as never }).select("id").single();
          if (ins.error) throw new Error("Entwurf konnte nicht gespeichert werden.");
          await db.from("audit_log").insert({ actor_id: user.user.id, action: "blog_generated", entity: "blog_posts", entity_id: ins.data.id, meta: { topic: req.topic } });
          emit({ type: "result", postId: ins.data.id });
        } else if (req.mode === "section") {
          const s = sectionOut.parse(out);
          emit({ type: "result", section: { heading: c(s.heading), level: s.level, body_md: c(s.body_md) } });
        } else if (req.mode === "faq") {
          emit({ type: "result", faq: faqOut.parse(out).faq.slice(0, 6).map((f) => ({ q: c(f.q), a: c(f.a) })) });
        } else {
          emit({ type: "result", suggestions: suggestOut.parse(out).suggestions.slice(0, 8) });
        }
      } catch (e) {
        const cancelled = request.signal.aborted;
        emit({ type: "error", status: cancelled ? 499 : upstreamStatus, message: cancelled ? "Abgebrochen." : upstreamStatus !== 500 ? safeMessage : e instanceof Error ? e.message : safeMessage });
      } finally { controller.close(); }
    },
  });
  void parseLinks; void parseSources;
  return withLovableAiGatewayRunIdHeader(new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } }), gateway);
}

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SITE_URL } from "./seo";

type AdminContext = { userId: string; supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null; error: unknown }> } };
async function adminDb(context: AdminContext) {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (role.error || !role.data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
export const getSeoOverview = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context);
  const [runs, state] = await Promise.all([
    db.from("seo_runs").select("id,kind,status,title,pages,result,error,created_at").order("created_at", { ascending: false }).limit(100),
    db.from("seo_ai_state").select("blocked,reason,status_code").eq("id", true).maybeSingle(),
  ]);
  if (runs.error || state.error) throw new Error("SEO-Verlauf konnte nicht geladen werden.");
  return { runs: runs.data ?? [], state: state.data };
});
export const seoOverviewQuery = () => queryOptions({ queryKey: ["admin", "seo"], queryFn: () => getSeoOverview() });

export const runSeoAudit = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context);
  const { auditPublicPages } = await import("./seo-audit");
  const origin = new URL(getRequest().url).origin;
  const inserted = await db.from("seo_runs").insert({ actor_id: context.userId, kind: "audit", status: "running", title: "Öffentliche Seitenprüfung" }).select("id").single();
  if (inserted.error) throw new Error("Prüfung konnte nicht gespeichert werden.");
  try {
    const pages = await auditPublicPages(origin);
    const result = { origin, pages, checked: pages.length, failed: pages.filter((p) => p.errors.length).length };
    const saved = await db.from("seo_runs").update({ status: "completed", pages: pages.map((p) => p.path), result }).eq("id", inserted.data.id);
    if (saved.error) throw new Error("Prüfergebnis konnte nicht gespeichert werden.");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prüfung fehlgeschlagen.";
    await db.from("seo_runs").update({ status: "failed", error: message }).eq("id", inserted.data.id);
    throw new Error(message);
  }
});

export const recordSeoChange = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ title: z.string().trim().min(3).max(160), pages: z.array(z.string().max(300)).min(1).max(50), note: z.string().trim().max(2000) }).parse(v))
  .handler(async ({ context, data }) => {
    const db = await adminDb(context);
    const pages = data.pages.map((p) => {
      const u = new URL(p, SITE_URL);
      if (u.origin !== SITE_URL || u.search || u.hash || !u.pathname.startsWith("/") || /^\/(admin|account|api|lovable)(\/|$)/.test(u.pathname)) throw new Error("Nur öffentliche GlobeSIM-Seiten eintragen.");
      return u.pathname;
    });
    const { error } = await db.from("seo_runs").insert({ actor_id: context.userId, kind: "change", title: data.title, pages, result: { note: data.note, source: "manual" } });
    if (error) throw new Error("Änderung konnte nicht gespeichert werden.");
    return { ok: true };
  });

export const resumeSeoAi = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = await adminDb(context);
  const { error } = await db.from("seo_ai_state").upsert({ id: true, blocked: false, reason: null, status_code: null, updated_at: new Date().toISOString() });
  if (error) throw new Error("Freigabe konnte nicht gespeichert werden.");
  return { ok: true };
});
import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicDb } from "./public-db.server";
import { COMPANY_FIELDS, fillLegal, isLegalSlug, LEGAL_SLUGS, parseCompanyInfo } from "./legal";
import { checkFaqText } from "./faq-rules";
import { isValidDomain, parseEmailSettings } from "./email-rules";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };
async function assertAdmin(ctx: unknown) {
  const c = ctx as Ctx;
  const { data } = await c.supabase.rpc("has_role", { _user_id: c.userId, _role: "admin" });
  if (!data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
}
async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
async function audit(actor: string, action: string, entity: string, entityId?: string) {
  await (await admin()).from("audit_log").insert({ actor_id: actor, action, entity, entity_id: entityId ?? null });
}

/* ---------- Legal (public: only published) ---------- */
export const getLegalIndex = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicDb().from("legal_pages").select("slug,title").eq("published", true);
  const order = LEGAL_SLUGS as readonly string[];
  return (data ?? []).sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
});
export const legalIndexQuery = () => queryOptions({ queryKey: ["legal-index"], queryFn: () => getLegalIndex(), staleTime: 10 * 60_000 });

async function renderLegal(db: ReturnType<typeof publicDb>, slug: string, onlyPublished: boolean) {
  if (!isLegalSlug(slug)) return null;
  let q = db.from("legal_pages").select("slug,title,body_md,published,updated_at").eq("slug", slug);
  if (onlyPublished) q = q.eq("published", true);
  const [{ data: page }, { data: info }] = await Promise.all([q.maybeSingle(), db.from("app_settings").select("value").eq("key", "company_info").maybeSingle()]);
  if (!page) return null;
  const { text, missing } = fillLegal(page.body_md, parseCompanyInfo(info?.value));
  return { slug: page.slug, title: page.title, text, missing, published: page.published, updatedAt: page.updated_at };
}

export const getLegalPage = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ slug: z.string().max(40) }).parse(i))
  .handler(async ({ data }) => renderLegal(publicDb(), data.slug, true));
export const legalPageQuery = (slug: string) => queryOptions({ queryKey: ["legal", slug], queryFn: () => getLegalPage({ data: { slug } }) });

/** Admin preview of unpublished pages. */
export const getLegalPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ slug: z.string().max(40) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    return renderLegal((await admin()) as unknown as ReturnType<typeof publicDb>, data.slug, false);
  });

/* ---------- Admin: content overview ---------- */
export const getContentAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const [{ data: legal }, { data: settings }, { data: faqs }, { data: posts }] = await Promise.all([
      db.from("legal_pages").select("slug,title,body_md,published,updated_at"),
      db.from("app_settings").select("key,value").in("key", ["company_info", "email_settings"]),
      db.from("faqs").select("id,category,question,answer,sort_order").order("sort_order"),
      db.from("blog_posts").select("id,slug,title,body_md,published_at,created_at").order("created_at", { ascending: false }),
    ]);
    const order = LEGAL_SLUGS as readonly string[];
    return {
      legal: (legal ?? []).sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug)),
      company: parseCompanyInfo(settings?.find((s) => s.key === "company_info")?.value),
      email: parseEmailSettings(settings?.find((s) => s.key === "email_settings")?.value),
      faqs: faqs ?? [],
      posts: posts ?? [],
    };
  });
export const contentAdminQuery = () => queryOptions({ queryKey: ["admin", "content"], queryFn: () => getContentAdmin() });

export const saveLegalPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ slug: z.enum(LEGAL_SLUGS), title: z.string().trim().min(2).max(120), body: z.string().max(100_000), published: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (await admin()).from("legal_pages").update({ title: data.title, body_md: data.body, published: data.published, updated_by: context.userId, updated_at: new Date().toISOString() }).eq("slug", data.slug);
    if (error) throw new Error("Speichern fehlgeschlagen.");
    await audit(context.userId, data.published ? "legal_published" : "legal_saved", "legal_pages", data.slug);
    return { ok: true };
  });

const companySchema = z.object(Object.fromEntries(COMPANY_FIELDS.map((f) => [f.key, z.string().trim().max(300).optional()])) as Record<string, z.ZodOptional<z.ZodString>>);
export const saveCompanyInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => companySchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await (await admin()).from("app_settings").upsert({ key: "company_info", value: parseCompanyInfo(data) as never, updated_at: new Date().toISOString() });
    await audit(context.userId, "company_info_saved", "app_settings", "company_info");
    return { ok: true };
  });

/** Only the domain is editable here; "verified" is set only once the sender domain is actually set up. */
export const saveEmailSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ sender_domain: z.string().trim().toLowerCase().max(253) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.sender_domain && !isValidDomain(data.sender_domain)) return { ok: false as const, error: "Ungültige Domain." };
    const db = await admin();
    const { data: cur } = await db.from("app_settings").select("value").eq("key", "email_settings").maybeSingle();
    const prev = parseEmailSettings(cur?.value);
    const verified = prev.verified && prev.sender_domain === data.sender_domain;
    await db.from("app_settings").upsert({ key: "email_settings", value: { sender_domain: data.sender_domain, verified } as never, updated_at: new Date().toISOString() });
    await audit(context.userId, "email_settings_saved", "app_settings", "email_settings");
    return { ok: true as const };
  });

/* ---------- FAQ ---------- */
export const saveFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid().optional(), category: z.string().trim().min(1).max(60), question: z.string().trim().min(3).max(300), answer: z.string().trim().min(3).max(5000), sort_order: z.number().int() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const errors = [...new Set([...checkFaqText(data.question), ...checkFaqText(data.answer)])];
    if (errors.length) return { ok: false as const, errors };
    const db = await admin();
    const row = { category: data.category, question: data.question, answer: data.answer, sort_order: data.sort_order };
    const { error } = data.id ? await db.from("faqs").update(row).eq("id", data.id) : await db.from("faqs").insert(row);
    if (error) throw new Error("Speichern fehlgeschlagen.");
    await audit(context.userId, "faq_saved", "faqs", data.id);
    return { ok: true as const, errors: [] as string[] };
  });

export const deleteFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await (await admin()).from("faqs").delete().eq("id", data.id);
    await audit(context.userId, "faq_deleted", "faqs", data.id);
    return { ok: true };
  });

/* ---------- Blog ---------- */
export const getBlogList = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicDb().from("blog_posts").select("slug,title,body_md,published_at").not("published_at", "is", null).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false });
  return (data ?? []).map((p) => ({ slug: p.slug, title: p.title, excerpt: p.body_md.replace(/[#*_>`]/g, "").slice(0, 180), publishedAt: p.published_at! }));
});
export const blogListQuery = () => queryOptions({ queryKey: ["blog"], queryFn: () => getBlogList(), staleTime: 5 * 60_000 });

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ slug: z.string().max(120) }).parse(i))
  .handler(async ({ data }) => {
    const { data: p } = await publicDb().from("blog_posts").select("slug,title,body_md,published_at,seo").eq("slug", data.slug).not("published_at", "is", null).lte("published_at", new Date().toISOString()).maybeSingle();
    return p;
  });
export const blogPostQuery = (slug: string) => queryOptions({ queryKey: ["blog", slug], queryFn: () => getBlogPost({ data: { slug } }) });

export const saveBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid().optional(), slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: nur a-z, 0-9 und Bindestriche").max(120), title: z.string().trim().min(3).max(200), body: z.string().max(100_000), published: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const existing = data.id ? (await db.from("blog_posts").select("published_at").eq("id", data.id).maybeSingle()).data : null;
    const row = { slug: data.slug, title: data.title, body_md: data.body, published_at: data.published ? (existing?.published_at ?? new Date().toISOString()) : null };
    const { error } = data.id ? await db.from("blog_posts").update(row).eq("id", data.id) : await db.from("blog_posts").insert(row);
    if (error) throw new Error(error.code === "23505" ? "Dieser Slug ist schon vergeben." : "Speichern fehlgeschlagen.");
    await audit(context.userId, "blog_saved", "blog_posts", data.id ?? data.slug);
    return { ok: true };
  });

export const deleteBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await (await admin()).from("blog_posts").delete().eq("id", data.id);
    await audit(context.userId, "blog_deleted", "blog_posts", data.id);
    return { ok: true };
  });

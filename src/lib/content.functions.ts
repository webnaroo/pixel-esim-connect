import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicDb } from "./public-db.server";
import { COMPANY_FIELDS, fillLegal, isLegalSlug, LEGAL_SLUGS, parseCompanyInfo } from "./legal";
import { checkFaqText } from "./faq-rules";
import { isValidDomain, parseEmailSettings } from "./email-rules";
import { allText, berlinToUtc, coverFileError, faqItemSchema, isCoverPath, linkSchema, livePriceIsos, MIN_PUBLISH_SCORE, parseFaq, parseLinks, parseSections, parseSources, publishBlockers, sectionSchema, sourceSchema } from "./ratgeber";
import { computeScore, DEFAULT_WORDLIST } from "./ratgeber-score";

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
      db.from("blog_posts").select("id,slug,title,body_md,published_at,created_at,meta_title,meta_description,answer_summary,sections,faq,author_name,status,country_code,cover_url,updated_at").order("created_at", { ascending: false }),
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

/* ---------- Ratgeber (blog) ---------- */
const POST_COLS = "id,slug,title,meta_title,meta_description,answer_summary,sections,faq,sources,author_name,published_at,updated_at,status,country_code,cover_url,cover_image_alt,body_md,internal_links";
const ADMIN_COLS = "id,slug,title,meta_title,meta_description,answer_summary,sections,faq,sources,author_name,published_at,updated_at,created_at,status,country_code,cover_url,cover_image_alt,body_md,internal_links,focus_keyword,post_type,target_words,quality_score,quality_report,score_override_reason,scheduled_at,generation_meta";
const nowIso = () => new Date().toISOString();
const PUBLIC_STATUSES = ["published", "scheduled"];

export const getBlogList = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await publicDb().from("blog_posts").select("slug,title,meta_description,answer_summary,body_md,published_at,updated_at,country_code,cover_url,cover_image_alt").in("status", PUBLIC_STATUSES).not("published_at", "is", null).lte("published_at", nowIso()).order("published_at", { ascending: false });
  return (data ?? []).map((p) => ({ slug: p.slug, title: p.title, excerpt: p.meta_description || p.answer_summary || p.body_md.replace(/[#*_>`]/g, "").slice(0, 180), publishedAt: p.published_at!, updatedAt: p.updated_at, country: p.country_code, cover: p.cover_url, coverAlt: p.cover_image_alt }));
});
export const blogListQuery = () => queryOptions({ queryKey: ["blog"], queryFn: () => getBlogList(), staleTime: 5 * 60_000 });

async function isoSlugMap(db: ReturnType<typeof publicDb>, isos: string[]) {
  if (!isos.length) return {} as Record<string, string>;
  const { data } = await db.from("destinations").select("slug,iso_code").in("iso_code", isos).eq("type", "country").eq("is_active", true);
  return Object.fromEntries((data ?? []).map((d) => [d.iso_code!.toUpperCase(), d.slug])) as Record<string, string>;
}

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ slug: z.string().max(120) }).parse(i))
  .handler(async ({ data }) => {
    const db = publicDb();
    const { data: p } = await db.from("blog_posts").select(POST_COLS).eq("slug", data.slug).in("status", PUBLIC_STATUSES).not("published_at", "is", null).lte("published_at", nowIso()).maybeSingle();
    if (!p) return null;
    const isos = [...new Set([...(p.country_code ? [p.country_code.toUpperCase()] : []), ...livePriceIsos(allText({ ...p, sections: parseSections(p.sections), faq: [] }))])];
    const destinations = await isoSlugMap(db, isos);
    return { ...p, destinationSlug: p.country_code ? destinations[p.country_code.toUpperCase()] ?? null : null, destinations };
  });
export const blogPostQuery = (slug: string) => queryOptions({ queryKey: ["blog", slug], queryFn: () => getBlogPost({ data: { slug } }) });

/** Published guide for a country (internal link from destination page). */
export const getGuideForCountry = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ iso: z.string().max(3) }).parse(i))
  .handler(async ({ data }) => {
    const { data: p } = await publicDb().from("blog_posts").select("slug,title").eq("country_code", data.iso.toUpperCase()).in("status", PUBLIC_STATUSES).not("published_at", "is", null).lte("published_at", nowIso()).order("published_at", { ascending: false }).limit(1).maybeSingle();
    return p ?? null;
  });
export const guideForCountryQuery = (iso: string) => queryOptions({ queryKey: ["guide-country", iso], queryFn: () => getGuideForCountry({ data: { iso } }), staleTime: 10 * 60_000 });

/* ---- Admin ---- */
async function loadWordlist(db: Awaited<ReturnType<typeof admin>>) {
  const { data } = await db.from("app_settings").select("value").eq("key", "blog_wordlist").maybeSingle();
  return Array.isArray(data?.value) ? (data.value as string[]) : DEFAULT_WORDLIST;
}
type PostRow = { id: string; slug: string; title: string; status: string; published_at: string | null; updated_at: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toScoreInput(row: PostRow) {
  const p = row as unknown as { focus_keyword: string | null; meta_title: string | null; meta_description: string | null; answer_summary: string | null; body_md: string | null; sections: unknown; faq: unknown; sources: unknown; internal_links: unknown; cover_url: string | null; cover_image_alt: string | null; author_name: string | null; target_words: number };
  return {
    title: row.title, slug: row.slug, focus_keyword: p.focus_keyword, meta_title: p.meta_title, meta_description: p.meta_description,
    answer_summary: p.answer_summary, body_md: p.body_md, sections: parseSections(p.sections), faq: parseFaq(p.faq), sources: parseSources(p.sources),
    internal_links: parseLinks(p.internal_links), cover_url: p.cover_url, cover_image_alt: p.cover_image_alt, author_name: p.author_name,
    target_words: p.target_words || 1400, published_at: row.published_at, updated_at: row.updated_at,
  };
}
async function snapshot(db: Awaited<ReturnType<typeof admin>>, postId: string, actor: string) {
  const { data: cur } = await db.from("blog_posts").select(ADMIN_COLS).eq("id", postId).maybeSingle();
  if (!cur) return;
  await db.from("blog_post_versions").insert({ post_id: postId, actor_id: actor, snapshot: cur as never });
  const { data: old } = await db.from("blog_post_versions").select("id").eq("post_id", postId).order("created_at", { ascending: false }).range(10, 200);
  if (old?.length) await db.from("blog_post_versions").delete().in("id", old.map((o) => o.id));
}

export const getBlogAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const [{ data: posts }, wordlist, { data: dests }] = await Promise.all([
      db.from("blog_posts").select(ADMIN_COLS).order("updated_at", { ascending: false }),
      loadWordlist(db),
      db.from("destinations").select("iso_code,name_de,slug").eq("type", "country").eq("is_active", true).order("name_de"),
    ]);
    return { posts: posts ?? [], wordlist, countries: (dests ?? []).filter((d) => d.iso_code).map((d) => ({ iso: d.iso_code!.toUpperCase(), name: d.name_de, slug: d.slug })) };
  });
export const blogAdminQuery = () => queryOptions({ queryKey: ["admin", "blog"], queryFn: () => getBlogAdmin() });

const coverUrl = z.string().trim().refine((s) => s.startsWith("https://") || isCoverPath(s), "Bildadresse ungültig").nullable();
export const blogInput = z.object({
  id: z.string().uuid(),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: nur a-z, 0-9 und Bindestriche").max(120),
  title: z.string().trim().min(3).max(200),
  meta_title: z.string().trim().max(80).nullable(),
  meta_description: z.string().trim().max(200).nullable(),
  answer_summary: z.string().trim().max(1000).nullable(),
  author_name: z.string().trim().max(120).nullable(),
  country_code: z.string().trim().regex(/^[A-Za-z]{2}$/).nullable(),
  focus_keyword: z.string().trim().max(80).nullable(),
  post_type: z.enum(["guide", "explainer", "howto", "comparison"]),
  target_words: z.number().int().min(300).max(5000),
  cover_url: coverUrl,
  cover_image_alt: z.string().trim().max(200).nullable(),
  body: z.string().max(100_000),
  sections: z.array(sectionSchema).max(30),
  faq: z.array(faqItemSchema).max(30),
  sources: z.array(sourceSchema).max(30),
  internal_links: z.array(linkSchema).max(20),
  autosave: z.boolean().default(false),
});

export const createBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const slug = `neuer-beitrag-${Date.now().toString(36)}`;
    const { data, error } = await (await admin()).from("blog_posts").insert({ slug, title: "Neuer Beitrag", body_md: "", status: "draft", published_at: null }).select("id").single();
    if (error) throw new Error("Anlegen fehlgeschlagen.");
    await audit(context.userId, "blog_created", "blog_posts", data.id);
    return { id: data.id };
  });

/** Saves content only; status changes go through setBlogStatus. Live posts that become invalid are moved back to draft. */
export const saveBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => blogInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: existing } = await db.from("blog_posts").select("status,published_at,score_override_reason").eq("id", data.id).maybeSingle();
    if (!existing) throw new Error("Beitrag nicht gefunden.");
    if (!data.autosave) await snapshot(db, data.id, context.userId);
    const row = {
      slug: data.slug, title: data.title, body_md: data.body, meta_title: data.meta_title || null, meta_description: data.meta_description || null,
      answer_summary: data.answer_summary || null, author_name: data.author_name || null, country_code: data.country_code?.toUpperCase() || null,
      focus_keyword: data.focus_keyword || null, post_type: data.post_type, target_words: data.target_words,
      cover_url: data.cover_url || null, cover_image_alt: data.cover_image_alt || null,
      sections: data.sections, faq: data.faq, sources: data.sources, internal_links: data.internal_links,
    };
    const score = computeScore({ ...row, updated_at: nowIso(), published_at: existing.published_at }, await loadWordlist(db));
    let status = existing.status;
    if (status === "published" || status === "scheduled") {
      if (publishBlockers(row, score.total, existing.score_override_reason).length) status = "draft";
    }
    const { error } = await db.from("blog_posts").update({ ...row, quality_score: score.total, quality_report: score as never, status, ...(status === "draft" ? { published_at: null } : {}) }).eq("id", data.id);
    if (error) throw new Error(error.code === "23505" ? "Dieser Slug ist schon vergeben." : "Speichern fehlgeschlagen.");
    if (!data.autosave) await audit(context.userId, "blog_saved", "blog_posts", data.id);
    return { ok: true, score, status, unpublished: status !== existing.status };
  });

export const setBlogStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid(),
    action: z.enum(["publish", "schedule", "draft", "review", "archive"]),
    at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).optional(),
    overrideReason: z.string().trim().max(500).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: p } = await db.from("blog_posts").select(ADMIN_COLS).eq("id", data.id).maybeSingle();
    if (!p) throw new Error("Beitrag nicht gefunden.");
    const update: Record<string, unknown> = {};
    if (data.action === "publish" || data.action === "schedule") {
      const si = toScoreInput(p as PostRow);
      const score = computeScore(si, await loadWordlist(db));
      const reason = data.overrideReason || null;
      const b = publishBlockers(si, score.total, reason);
      if (b.length) throw new Error(`Veröffentlichen nicht möglich: ${b.join(" ")}`);
      let when = nowIso();
      if (data.action === "schedule") {
        if (!data.at) throw new Error("Datum und Uhrzeit fehlen.");
        when = berlinToUtc(data.at);
        if (new Date(when) <= new Date()) throw new Error("Der geplante Zeitpunkt muss in der Zukunft liegen.");
      } else if (p.published_at && new Date(p.published_at) <= new Date()) when = p.published_at;
      Object.assign(update, { status: data.action === "schedule" ? "scheduled" : "published", published_at: when, scheduled_at: data.action === "schedule" ? when : null, quality_score: score.total, quality_report: score, score_override_reason: score.total < MIN_PUBLISH_SCORE ? reason : null });
      await db.from("audit_log").insert({ actor_id: context.userId, action: data.action === "schedule" ? "blog_scheduled" : "blog_published", entity: "blog_posts", entity_id: data.id, meta: { score: score.total, when, ...(score.total < MIN_PUBLISH_SCORE ? { score_override_reason: reason } : {}) } });
    } else {
      Object.assign(update, { status: data.action, published_at: null, scheduled_at: null });
      await audit(context.userId, `blog_${data.action}`, "blog_posts", data.id);
    }
    const { error } = await db.from("blog_posts").update(update as never).eq("id", data.id);
    if (error) throw new Error("Status konnte nicht geändert werden.");
    return { ok: true };
  });

export const duplicateBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: p } = await db.from("blog_posts").select(ADMIN_COLS).eq("id", data.id).maybeSingle();
    if (!p) throw new Error("Beitrag nicht gefunden.");
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = p as Record<string, unknown>;
    const { data: ins, error } = await db.from("blog_posts").insert({ ...rest, slug: `${p.slug}-kopie-${Date.now().toString(36)}`.slice(0, 120), title: `${p.title} (Kopie)`.slice(0, 200), status: "draft", published_at: null, scheduled_at: null, score_override_reason: null } as never).select("id").single();
    if (error) throw new Error("Duplizieren fehlgeschlagen.");
    await audit(context.userId, "blog_duplicated", "blog_posts", ins.id);
    return { id: ins.id };
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

export const getBlogVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: v } = await (await admin()).from("blog_post_versions").select("id,created_at,snapshot").eq("post_id", data.id).order("created_at", { ascending: false }).limit(10);
    return (v ?? []).map((x) => ({ id: x.id, created_at: x.created_at, title: (x.snapshot as { title?: string }).title ?? "", score: (x.snapshot as { quality_score?: number }).quality_score ?? null }));
  });

export const restoreBlogVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), versionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: v } = await db.from("blog_post_versions").select("snapshot").eq("id", data.versionId).eq("post_id", data.id).maybeSingle();
    if (!v) throw new Error("Version nicht gefunden.");
    await snapshot(db, data.id, context.userId);
    const s = v.snapshot as Record<string, unknown>;
    const keep = ["slug", "title", "meta_title", "meta_description", "answer_summary", "sections", "faq", "sources", "author_name", "country_code", "cover_url", "cover_image_alt", "body_md", "internal_links", "focus_keyword", "post_type", "target_words", "quality_score", "quality_report"];
    // Restored content is never live automatically.
    const { error } = await db.from("blog_posts").update({ ...Object.fromEntries(keep.filter((k) => k in s).map((k) => [k, s[k]])), status: "draft", published_at: null, scheduled_at: null } as never).eq("id", data.id);
    if (error) throw new Error(error.code === "23505" ? "Slug dieser Version ist inzwischen vergeben." : "Wiederherstellen fehlgeschlagen.");
    await audit(context.userId, "blog_version_restored", "blog_posts", data.id);
    return { ok: true };
  });

/** Client converts to WebP (≤ 1600 px); server re-checks size and WebP signature before storing. */
export const uploadBlogCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid(), webpBase64: z.string().max(2_800_000) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const bin = Uint8Array.from(atob(data.webpBase64), (c) => c.charCodeAt(0));
    const err = coverFileError({ type: "image/webp", size: bin.byteLength });
    if (err) throw new Error(err);
    const sig = String.fromCharCode(...bin.slice(0, 4)) + String.fromCharCode(...bin.slice(8, 12));
    if (sig !== "RIFFWEBP") throw new Error("Datei ist kein gültiges WebP-Bild.");
    const name = `${crypto.randomUUID()}.webp`;
    const db = await admin();
    const { error } = await db.storage.from("blog-covers").upload(name, bin, { contentType: "image/webp", upsert: false });
    if (error) throw new Error("Upload fehlgeschlagen.");
    const path = `/bild/ratgeber/${name}`;
    await db.from("blog_posts").update({ cover_url: path }).eq("id", data.id);
    await audit(context.userId, "blog_cover_uploaded", "blog_posts", data.id);
    return { path };
  });

export const saveBlogWordlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ words: z.array(z.string().trim().min(2).max(60)).max(200) }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await (await admin()).from("app_settings").upsert({ key: "blog_wordlist", value: [...new Set(data.words)] as never, updated_at: nowIso() });
    await audit(context.userId, "blog_wordlist_saved", "app_settings", "blog_wordlist");
    return { ok: true };
  });

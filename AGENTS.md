<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Every src/routes/api/public/* route calls guardPublicRoute() first — they bypass auth; signature/token and rate limit are the only protection.
- eSIM activation columns are not granted to client roles; read them only server-side after verifying ownership — prevents leaking installable eSIMs.
- The shop_enabled setting is writable only by the server (RLS excludes it for clients); setShopEnabled re-checks the checklist before enabling — the switch must not be bypassable from the browser.
- Pricing, sync-threshold and shop-checklist rules live as pure functions (src/lib/pricing.ts, src/lib/admin-rules.ts) with tests; server code calls them — keeps business rules testable without I/O.
- Fulfillment goes only through fulfillOrder() (src/lib/fulfillment.ts) with the DB claim function claim_order_for_fulfillment — the atomic claim plus a fixed provider idempotency key is what prevents double delivery.
- Webhooks are deduplicated via webhook_events (source, event_id) with processWebhookOnce(); on handler failure the record is removed so the provider's retry can succeed.
- All payment calls go through src/lib/payments.server.ts — one place to wire the payment provider; checkout never accepts a client price (strict schema in checkout-rules.ts).
- Guest order/installation pages are authorised only by a signed, expiring token (guest-token.ts, GUEST_TOKEN_SECRET); activation data is returned only after token verification.
- eSIMerge has no webhooks; order/eSIM status is polled by /api/public/cron/esim-status-poll (pg_cron, 5 min) — the provider webhook route only returns 501.
- An unclear provider outcome on createOrder (timeout/network) sets orders.status needs_review and is never retried automatically — protects against double orders; only HTTP rejections are retried.
- eSIMerge mapping is derived only from captured sandbox responses (sandbox.fixtures.ts); unmappable plans are recorded in sync_runs.unmapped, never dropped silently.
- Comparison visibility rules (source, 90-day age, GlobeSIM conditions) live in src/lib/comparison.ts with tests and are mirrored by RLS on comparison_facts — nothing unsourced or stale can reach the public page.
- The "ohne Drosselung" claim follows src/lib/throttle.ts (plans.throttle_claim); texts come from app_settings.unlimited_claim, never hardcoded — a catalog throttle hint flips a confirmed plan to conflict on sync.
- Legal pages live in legal_pages and render only when published (RLS); company data comes from app_settings.company_info via placeholders in src/lib/legal.ts — never hardcode or invent legal/company data.
- The root loader preloads legalIndexQuery into the shared query cache and the footer consumes it with useSuspenseQuery — published legal links must match during SSR and hydration.
- FAQ texts may state prices, coverage or throttling only through DB placeholders (src/lib/faq-rules.ts, checked on save; unfillable entries are hidden) — keeps public claims tied to real data.
- Customer emails go only through src/lib/email.server.ts and only with a verified sender domain (email-rules.ts); otherwise orders get email_status pending_domain — no mail from an unverified domain.
- Email templates live in src/lib/email-templates; /lovable/* routes self-authenticate and bypass app redirects/CSRF — previews work without a public send endpoint.
- Account deletion anonymises orders (kept for tax) and clears eSIM installation data before deleting the login (src/lib/anonymize.ts) — GDPR without losing bookkeeping records.
- Admin list views (admin-lists.functions.ts) never select activation code, LPA or QR columns — installation data is visible only to the owner via getMyInstallData.
- FX uses only ECB XML or ECB-based Frankfurter fallback; all prices use loadFx().lookup and tested fx.ts rules — no rate, no price.
- plans is closed to client roles; public pages read public.public_plans (released columns, active+priced only); admin code reads plans only via supabaseAdmin after has_role — keeps cost prices and raw provider data server-only.
- Public pages use shared SEO helpers with leaf-only canonicals; sitemap uses the public origin, paginated reads, 503 on errors — no preview URLs or incomplete inventories.
- SEO AI streams through an admin-verified route with durable access blocks; admin history stores analyses, audits and content-trigger/manual changes — no private report leaks or false application claims.
- SEO tests and admin audits share one sitemap-driven validator; shared Markdown wraps long words — consistent checks, no overflow.
- esim_devices: public read (active) via RLS, writes only via admin server fns; rules in src/lib/devices.ts — no invented device data.
- Ratgeber posts (blog_posts) are public only with status=published (RLS + server fns); src/lib/ratgeber.ts publishBlockers() checks completeness+score only; AI omits unsure claims, no markers (owner decision). All active destinations count as available; prices only via {{LIVE_PREISE:ISO}}.

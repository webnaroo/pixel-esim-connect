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
- Pricing uses tested pure rules, shared server context, digest-confirmed atomic saves and metadata/overrides; recalculation preserves visibility. Price queries refresh every 30 seconds.
- Fulfillment goes only through fulfillOrder() (src/lib/fulfillment.ts) with the DB claim function claim_order_for_fulfillment — the atomic claim plus a fixed provider idempotency key is what prevents double delivery.
- Webhooks are deduplicated via webhook_events (source, event_id) with processWebhookOnce(); on handler failure the record is removed so the provider's retry can succeed.
- All payment calls go through src/lib/payments.server.ts; refunds use one Stripe key per order (auto-refund.ts rules, run by the 5-min status poll); Stripe sets payment method order.
- Checkout access is checked through checkoutAccess after server-side role verification; closed-shop live admin payments require explicit real-payment consent and is_test follows the payment environment, to prevent accidental charges and misclassified payments.
- Guest order/installation pages are authorised only by a signed, expiring token (guest-token.ts, GUEST_TOKEN_SECRET); activation data is returned only after token verification.
- eSIMerge webhooks: valid-signed events stored once (tests ignored); new status only from GET order via esimerge-order.ts rules; bad signatures only counted.
- eSIMerge errors follow src/lib/esimerge-errors.ts (code-based, same idempotency key on retries, unclear → needs_review; never store error.message) — prevents double orders and leaks.
- eSIMerge refunds: portal-only, no API endpoint (probed); admin copies the request text, audit_log provider_refund_requested — never invent a refund call.
- eSIMerge mapping is derived only from captured sandbox responses (sandbox.fixtures.ts); unmappable plans are recorded in sync_runs.unmapped, never dropped silently.
- Comparison visibility rules (source, 90-day age, GlobeSIM conditions) live in src/lib/comparison.ts with tests and are mirrored by RLS on comparison_facts — nothing unsourced or stale reaches the public page.
- The "ohne Drosselung" claim follows src/lib/throttle.ts (plans.throttle_claim); texts come from app_settings.unlimited_claim, never hardcoded — a catalog throttle hint flips a confirmed plan to conflict on sync.
- Legal pages live in legal_pages and render only when published (RLS); company data comes from app_settings.company_info via placeholders in src/lib/legal.ts — never hardcode or invent these.
- Root loader preloads legalIndexQuery; footer reads it via useSuspenseQuery — legal links match SSR/hydration.
- FAQ texts may state prices, coverage or throttling only through DB placeholders (src/lib/faq-rules.ts, checked on save; unfillable entries are hidden) — keeps public claims tied to real data.
- Customer emails go only through src/lib/email.server.ts and only with a verified sender domain (email-rules.ts); otherwise orders get email_status pending_domain — no mail from an unverified domain.
- Account deletion anonymises orders (kept for tax) and clears eSIM install data before deleting the login — GDPR-safe.
- Admin list views (admin-lists.functions.ts) never select activation code, LPA or QR columns — installation data only for the owner via getMyInstallData.
- FX uses only ECB XML or ECB-based Frankfurter fallback; all prices use loadFx().lookup and tested fx.ts rules — no rate, no price.
- plans is closed to client roles; public pages read public.public_plans (released columns, active+priced only); admin reads plans only via supabaseAdmin after has_role — cost prices and raw provider data stay server-only.
- esim_devices: public read (active), admin-only writes; rules in devices.ts — no invented device data.
- Ratgeber posts (blog_posts) are public only with status=published (RLS + server fns); src/lib/ratgeber.ts publishBlockers() checks completeness+score only; AI omits unsure claims, no markers (owner decision). All active destinations count as available; prices only via {{LIVE_PREISE:ISO}}.
- eSIM install UI only in esim-install-panel.tsx (rules: install-device.ts), shared by account and /install.
- SEO: shared helpers, leaf-only canonicals; sitemap uses public origin, paginated reads, 503 on errors; tests and admin audits share one validator; SEO AI runs only via an admin-verified route with history.
- Meta Pixel only via src/lib/meta-pixel.ts after consent; Purchase only for server-paid non-test orders, once per order — no duplicate purchases.
- Subdirectories have their own AGENTS.md — read it before changing files there.
- Android-App-Funktionen (Push, Fingerabdruck-Sperre, Offline-eSIMs): Push nur über src/lib/push.server.ts (Texte aus push.ts, nie Aktivierungsdaten), Gerätetabelle push_devices nur über Serverfunktionen; Offline-Daten nur auf dem Gerät, beim Abmelden gelöscht (native-app.ts).
- GlobeMoney (Guthaben pro Kauf, src/lib/loyalty.ts): alles wird aus orders abgeleitet (credit_earned, credit_used), kein zweites Konto. Gutschrift nur über awardLoyalty() nach bestätigter Zahlung (Webhook), nur Konten, nie Testbestellungen. Einsetzen nur über die DB-Funktion claim_loyalty_credit (service_role, Sperre pro Konto); der Betrag kommt nie aus dem Browser. Stornierte, abgelaufene und erstattete Bestellungen geben Guthaben frei. Statuslisten in loyalty.ts und in drizzle/migrations/0033_globemoney.sql immer gemeinsam ändern.
- GlobeMoney von Hand (Admin): nur über adjustLoyaltyCredit (loyalty-admin.functions.ts, assertAdmin, Grund Pflicht, höchstens 500 € pro Buchung, Abziehen nie über den Kontostand, Audit-Log loyalty_adjusted). Buchungen liegen in loyalty_adjustments (nur service_role) und fließen über loyalty_balance in den Kontostand; sie ändern die Stufe nicht.

- GlobeMoney bezahlt ganze Bestellungen: Betrag nur serverseitig (maxRedeemCents in loyalty.ts, checkout.functions.ts); Rest unter 0,50 € Stripe-Minimum wird mit Guthaben gedeckt; Bestellung mit Betrag 0 wird vom Server als bezahlt markiert (Audit paid_with_credit), nie vom Browser. Rückerstattung ohne Stripe-Zahlung nur über refundOrderNow (Guthaben wird frei). Admin-Gutschriften zählen für die Stufe, wenn counts_for_tier (Migration 0036).
- Empfehlen & Verdienen (src/lib/referral*.ts, Migration 0037): 2 € GlobeMoney: der Geworbene sofort bei applyReferral (Rabatt auf den ersten Kauf), der Werber über rewardReferral() nach bestätigter Zahlung (Webhook), einmal pro geworbenem Konto (atomarer Anspruch auf referrals.rewarded_at), ohne Mindestbetrag (nur in bar bezahlte Bestellung), höchstens 25 belohnte Empfehlungen pro Werber; Buchungen in loyalty_adjustments ohne Stufenwirkung; Zuordnung nur über applyReferral (nur Konten ohne bezahlte Bestellung, nie der eigene Code).
- Länder- und Regionsseiten bekommen einen eigenen Text (src/lib/destination-seo.ts, destination-highlights.ts): nur echte Katalogdaten (Preise, Laufzeiten, Datenvolumen, Netze nur wenn geliefert) plus redaktionelle Orte; keine Aussagen zu Abdeckung, Geschwindigkeit, "sofort" oder Unlimited-Drosselung. Ländernamen ohne Artikel ("eSIM Türkei"). Meta-Titel/-Beschreibung stammen aus denselben Daten, solange destinations_content keine eigenen Werte hat.
- Organization-Markup (seo.ts organizationJsonLd) und /llms.txt (llms-txt.ts) lesen Firmendaten aus company_info (öffentlich wie im Impressum); keine Firmendaten im Code. Standard-Vorschaubild public/og-globesim-1200x630.png (kein Preis darauf).
- Öffentliche Seiten (edge-cache.ts, in src/server.ts): 60 s frisch + 5 min veraltet im Cloudflare-Cache, nur anonyme GET ohne Authorization, nur HTML 200 ohne Cookies; Konto, Kasse, Bestellung, Admin, API, Seiten mit Abfrageparametern (außer Tracking) werden nie gespeichert. Preise rechnet die Kasse immer neu auf dem Server.

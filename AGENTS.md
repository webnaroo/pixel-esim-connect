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

- Every server route under src/routes/api/public/* must call guardPublicRoute() (src/lib/public-route-guard.server.ts) before any work — these routes bypass auth, so signature/token check and DB-backed rate limiting are the only protection.
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

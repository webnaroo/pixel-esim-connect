# eSIMerge integration (sandbox-verified 2026-10-08)

## Connection
- `ESIMERGE_BASE_URL` = `https://portal.esimerge.com/api/public`, endpoint paths carry `/v1` (verified 200; the `/v1`-in-base variant was not needed).
- Auth: `Authorization: Bearer <ESIMERGE_API_KEY>`. Keys starting `esm_sk_test_` = sandbox (admin banner, shop switch blocked server-side, orders `is_sandbox=true`).

## Endpoints used
| Purpose | Call |
|---|---|
| ping | `GET /v1/catalog?limit=1` |
| plans | `GET /v1/catalog` (limit/offset, `has_more`, `next_offset`; default limit 1000) |
| availability | `GET /v1/catalog/:id` |
| order | `POST /v1/orders` body `{ "plan_id" }` + **required** `Idempotency-Key` header |
| order status + eSIM | `GET /v1/orders/:id` (eSIM embedded) |
| eSIM | `GET /v1/esims/:id` |
| usage | `GET /v1/esims/:id/usage` (cached 5 min in `esims.usage_cache`) |

No endpoints for countries, regions, top-up, cancel, refund. **No webhooks**: `/api/public/webhooks/esimerge` answers 501 (503 while no secret is set); status comes from the cron `esim-status-poll` (every 5 min).

## Idempotency (verified)
POST without the header returns 400 "Idempotency-Key header is required". Same key twice returns the same order with header `idempotent-replayed: true`. We send `orders.idempotency_key` on every attempt, plus the DB claim lock.
Still: timeouts/network errors on POST set `needs_review` (no automatic retry); only HTTP 4xx/5xx answers are retried (1/5/25 min).

## Mapping (src/lib/providers/esimerge/mapping.ts)
- Cost price: `price_usd`, currency `USD` (other currencies → unmapped). Needs FX USD→EUR in admin, otherwise no price and plan inactive.
- Volume `data_mb` (MB), validity `validity_days`.
- `type`: `fixed` → data; `calling` → data + `voice_sms {minutes, sms}`; `unlimited` → unlimited, `data_mb` 0, `fair_usage` text kept as `fair_use.note`.
- `scope`: `country` → `country_code` ISO-2; `region` → `region_code` matched to region destinations by code (EU → europe), no country list, region page only; `global` → global destination.
- eSIM: `qr_code` is the LPA string; `smdp_address`, `activation_code`, `iccid`, `ios_install_url`, `android_install_url` (contain LPA → server-only columns). Install data is returned immediately in the POST response; eSIM `status` goes pending → active (~60 s in sandbox).
- Unmappable entries are stored with reason in `sync_runs.unmapped` and shown in admin.

## Fixtures
`sandbox.fixtures.ts`: real sandbox responses, secrets replaced by placeholders; tests only.

## Refunds (portal only — no API endpoint, probed 2026-10-09)
The partner portal has a **Request refund** button per order, but the public API has no refund call. Control calls in the same run: `GET /v1/catalog?limit=1` → 200, `GET /v1/orders/:id` → 200.
Probed with the sandbox key (all against a nonexistent order id, so nothing could change):
`GET|POST /v1/refunds`, `GET|POST /v1/refund`, `GET|POST /v1/orders/:id/refund`, `GET /v1/orders/:id/refunds`, `POST /v1/orders/:id/actions/refund`, `POST /v1/esims/:id/refund`, `PATCH|DELETE /v1/orders/:id` → all `406 {"error":"Only HTML requests are supported here"}` (the portal HTML catch-all, i.e. not an API route).
`GET /v1/orders/refund` → `404 {"error":{"code":"order_not_found","message":"Order refund not found"}}` — that is the plain order route with `id = "refund"`, not a refund route.
Deep links are not possible either: the portal opens an order by an internal UUID (`/partner/orders/<uuid>`) and shows a `P9…` number, while the API only returns `esm_order_…` — no documented mapping.
`// TODO(ESIMERGE):` ask for a refund/cancel endpoint or a support address for refund requests. Until then admin → Bestellungen copies a ready-to-paste request, opens `portal.esimerge.com/partner/orders` and records `audit_log` action `provider_refund_requested`.

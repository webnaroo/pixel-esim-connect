// FIXTURES (Testdaten): real eSIMerge SANDBOX responses captured 2026-10-08.
// Tokens, ICCIDs, SM-DP+ addresses and activation codes are replaced with obvious placeholders.
// Used only by unit tests — never shown in the app.
export const SANDBOX_CATALOG = {
 "object": "list",
 "data": [
  {
   "id": "esm_plan_sa_5gb_30d",
   "object": "plan",
   "name": "Saudi Arabia 5GB / 30d",
   "name_ar": "Saudi Arabia 5 GB / 30 day",
   "scope": "country",
   "type": "fixed",
   "country_code": "SA",
   "country_name": "Saudi Arabia",
   "region_code": null,
   "data_mb": 5120,
   "minutes": null,
   "sms": null,
   "validity_days": 30,
   "quantity": 1,
   "price_sar": 37.5,
   "price_usd": 9.99,
   "currency": "USD",
   "fair_usage": null,
   "supports_topup": true,
   "networks": [
    "STC",
    "Mobily",
    "Zain"
   ],
   "coverage": [
    {
     "country_code": "SA",
     "country_name": "Saudi Arabia",
     "networks": [
      "STC",
      "Mobily",
      "Zain"
     ]
    }
   ],
   "coverage_count": 1,
   "description": "5GB data, 30 days validity",
   "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
   "id": "esm_plan_sa_10gb_30d",
   "object": "plan",
   "name": "Saudi Arabia 10GB / 30d",
   "name_ar": "Saudi Arabia 10 GB / 30 day",
   "scope": "country",
   "type": "fixed",
   "country_code": "SA",
   "country_name": "Saudi Arabia",
   "region_code": null,
   "data_mb": 10240,
   "minutes": null,
   "sms": null,
   "validity_days": 30,
   "quantity": 1,
   "price_sar": 63.75,
   "price_usd": 16.99,
   "currency": "USD",
   "fair_usage": null,
   "supports_topup": true,
   "networks": [
    "STC",
    "Mobily",
    "Zain"
   ],
   "coverage": [
    {
     "country_code": "SA",
     "country_name": "Saudi Arabia",
     "networks": [
      "STC",
      "Mobily",
      "Zain"
     ]
    }
   ],
   "coverage_count": 1,
   "description": "10GB data, 30 days validity",
   "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
   "id": "esm_plan_ae_3gb_15d",
   "object": "plan",
   "name": "UAE 3GB / 15d",
   "name_ar": "Emirates 3 GB / 15 day",
   "scope": "country",
   "type": "fixed",
   "country_code": "AE",
   "country_name": "United Arab Emirates",
   "region_code": null,
   "data_mb": 3072,
   "minutes": null,
   "sms": null,
   "validity_days": 15,
   "quantity": 1,
   "price_sar": 28.13,
   "price_usd": 7.5,
   "currency": "USD",
   "fair_usage": null,
   "supports_topup": true,
   "networks": [
    "Etisalat",
    "du"
   ],
   "coverage": [
    {
     "country_code": "AE",
     "country_name": "United Arab Emirates",
     "networks": [
      "Etisalat",
      "du"
     ]
    }
   ],
   "coverage_count": 1,
   "description": "3GB data, 15 days validity",
   "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
   "id": "esm_plan_tr_5gb_15d",
   "object": "plan",
   "name": "Turkey 5GB / 15d",
   "name_ar": "Turkey 5 GB / 15 day",
   "scope": "country",
   "type": "fixed",
   "country_code": "TR",
   "country_name": "Turkey",
   "region_code": null,
   "data_mb": 5120,
   "minutes": null,
   "sms": null,
   "validity_days": 15,
   "quantity": 1,
   "price_sar": 41.25,
   "price_usd": 11,
   "currency": "USD",
   "fair_usage": null,
   "supports_topup": true,
   "networks": [
    "Turkcell",
    "Vodafone TR"
   ],
   "coverage": [
    {
     "country_code": "TR",
     "country_name": "Turkey",
     "networks": [
      "Turkcell",
      "Vodafone TR"
     ]
    }
   ],
   "coverage_count": 1,
   "description": "5GB data, 15 days validity",
   "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
   "id": "esm_plan_eg_unlim_30d",
   "object": "plan",
   "name": "Egypt Unlimited / 30d",
   "name_ar": "Egypt unlimited / 30 day",
   "scope": "country",
   "type": "unlimited",
   "country_code": "EG",
   "country_name": "Egypt",
   "region_code": null,
   "data_mb": 0,
   "minutes": null,
   "sms": null,
   "validity_days": 30,
   "quantity": 1,
   "price_sar": 54.38,
   "price_usd": 14.5,
   "currency": "USD",
   "fair_usage": "20GB high-speed then throttled",
   "supports_topup": true,
   "networks": [
    "Orange EG",
    "Vodafone EG"
   ],
   "coverage": [
    {
     "country_code": "EG",
     "country_name": "Egypt",
     "networks": [
      "Orange EG",
      "Vodafone EG"
     ]
    }
   ],
   "coverage_count": 1,
   "description": "Unlimited data with 20GB fair usage",
   "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
   "id": "esm_plan_us_call_30d",
   "object": "plan",
   "name": "USA Calling 5GB + 100min",
   "name_ar": "America 5G connection + 100 D",
   "scope": "country",
   "type": "calling",
   "country_code": "US",
   "country_name": "United States",
   "region_code": null,
   "data_mb": 5120,
   "minutes": 100,
   "sms": 100,
   "validity_days": 30,
   "quantity": 1,
   "price_sar": 67.5,
   "price_usd": 18,
   "currency": "USD",
   "fair_usage": null,
   "supports_topup": false,
   "networks": [
    "T-Mobile",
    "AT&T"
   ],
   "coverage": [
    {
     "country_code": "US",
     "country_name": "United States",
     "networks": [
      "T-Mobile",
      "AT&T"
     ]
    }
   ],
   "coverage_count": 1,
   "description": "5GB data + 100 minutes + 100 SMS, 30 days",
   "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
   "id": "esm_plan_eu_5gb_15d",
   "object": "plan",
   "name": "Europe 5GB / 15d",
   "name_ar": "Europe 5 GB / 15 day",
   "scope": "region",
   "type": "fixed",
   "country_code": "",
   "country_name": "Europe",
   "region_code": "EU",
   "data_mb": 5120,
   "minutes": null,
   "sms": null,
   "validity_days": 15,
   "quantity": 1,
   "price_sar": 45,
   "price_usd": 12,
   "currency": "USD",
   "fair_usage": null,
   "supports_topup": true,
   "networks": [
    "Multi-network across 30+ countries"
   ],
   "coverage": [
    {
     "country_code": null,
     "country_name": "Europe",
     "networks": [
      "Multi-network across 30+ countries"
     ]
    }
   ],
   "coverage_count": 1,
   "description": "Covers 30+ European countries, 5GB / 15 days",
   "updated_at": "2026-01-01T00:00:00.000Z"
  },
  {
   "id": "esm_plan_global_3gb_15d",
   "object": "plan",
   "name": "Global 3GB / 15d",
   "name_ar": "Global 3 GB / 15 day",
   "scope": "global",
   "type": "fixed",
   "country_code": "GLOBAL",
   "country_name": "Global",
   "region_code": "GLOBAL",
   "data_mb": 3072,
   "minutes": null,
   "sms": null,
   "validity_days": 15,
   "quantity": 1,
   "price_sar": 90,
   "price_usd": 24,
   "currency": "USD",
   "fair_usage": null,
   "supports_topup": true,
   "networks": [
    "Roaming across 130+ countries"
   ],
   "coverage": [
    {
     "country_code": "GLOBAL",
     "country_name": "Global",
     "networks": [
      "Roaming across 130+ countries"
     ]
    }
   ],
   "coverage_count": 1,
   "description": "Global coverage across 130+ countries, 3GB / 15 days",
   "updated_at": "2026-01-01T00:00:00.000Z"
  }
 ],
 "count": 8,
 "total": 8,
 "updated_since": null,
 "meta": {
  "current_page": 1,
  "per_page": 1000,
  "last_page": 1,
  "total": 8,
  "from": 1,
  "to": 8
 },
 "links": {
  "first": "https://portal.esimerge.com/api/public/v1/catalog?page=1&per_page=1000",
  "prev": null,
  "next": null,
  "last": "https://portal.esimerge.com/api/public/v1/catalog?page=1&per_page=1000"
 },
 "limit": 1000,
 "offset": 0,
 "has_more": false,
 "next_offset": null,
 "request_id": "req_fixture"
} as const;
export const SANDBOX_ORDER = {
 "id": "esm_order_MvraUYoKCGrbvhZU7hM7H8",
 "object": "order",
 "status": "issued",
 "created_at": "2026-10-08T16:57:22.050Z",
 "customer_reference": null,
 "esim": {
  "id": "esm_esim_3vBBR1yP9rC9bXQge0eAiE",
  "object": "esim",
  "order_id": "esm_order_MvraUYoKCGrbvhZU7hM7H8",
  "status": "pending",
  "iccid": "8900000000000000000",
  "qr_code": "LPA:1$smdp.fixture.invalid$FIXTURE-CODE",
  "smdp_address": "smdp.fixture.invalid",
  "activation_code": "FIXTURE-CODE",
  "ios_install_url": "https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA:1$smdp.fixture.invalid$FIXTURE-CODE",
  "android_install_url": "https://esimsetup.android.com/esim_qrcode_provisioning?carddata=LPA:1$smdp.fixture.invalid$FIXTURE-CODE",
  "activated_at": null,
  "expires_at": null,
  "expired": false,
  "tracking_supported": true,
  "tracking_unsupported_reason": null,
  "events": [
   {
    "status": "new",
    "iccid": "8900000000000000000",
    "eid": null,
    "occurred_at": "2026-10-08T16:57:22.050Z"
   }
  ],
  "locations": [],
  "available_networks": [
   "Turkcell",
   "Vodafone TR"
  ],
  "coverage": [
   {
    "country_code": "TR",
    "country_name": "Turkey",
    "networks": [
     "Turkcell",
     "Vodafone TR"
    ]
   }
  ],
  "coverage_count": 1,
  "device": null,
  "plan": {
   "id": "esm_plan_tr_5gb_15d",
   "name": "Turkey 5GB / 15d",
   "type": "fixed",
   "scope": "country",
   "data_mb": 5120,
   "minutes": null,
   "sms": null,
   "validity_days": 15,
   "available_networks": [
    "Turkcell",
    "Vodafone TR"
   ]
  },
  "usage": {
   "data_used_mb": 0,
   "data_allowed_mb": 5120,
   "data_remaining_mb": 5120
  },
  "daily_usage": []
 },
 "request_id": "req_fixture"
} as const;
export const SANDBOX_USAGE = {
 "object": "usage",
 "esim_id": "esm_esim_3vBBR1yP9rC9bXQge0eAiE",
 "status": "pending",
 "tracking_supported": true,
 "tracking_unsupported_reason": null,
 "data_used_mb": 0,
 "data_allowed_mb": 5120,
 "data_remaining_mb": 5120,
 "total_used_mb": 0,
 "daily": [],
 "expires_at": null,
 "expired": false,
 "request_id": "req_fixture"
} as const;

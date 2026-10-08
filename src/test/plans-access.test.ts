// Live access check against the project database (skipped when no backend env is present).
// Visitors (anon key) and normal signed-in users must not read cost_price / raw from plans;
// the public view exposes only released columns.
import { describe, expect, it } from "vitest";

const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
const userToken = process.env["TEST_USER_ACCESS_TOKEN"]; // optional: a normal (non-admin) user's session token

const rest = (path: string, bearer?: string) =>
  fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key!, ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) } });

describe.skipIf(!url || !key)("plans access", () => {
  it("visitor cannot read cost_price from plans", async () => expect((await rest("plans?select=cost_price&limit=1")).ok).toBe(false));
  it("visitor cannot read raw from plans", async () => expect((await rest("plans?select=raw&limit=1")).ok).toBe(false));
  it("public view has no cost_price", async () => expect((await rest("public_plans?select=cost_price&limit=1")).ok).toBe(false));
  it("public view serves released columns", async () => expect((await rest("public_plans?select=id,sell_price,throttle_claim&limit=1")).ok).toBe(true));
  it.skipIf(!userToken)("normal user cannot read cost_price or raw", async () => {
    expect((await rest("plans?select=cost_price&limit=1", userToken)).ok).toBe(false);
    expect((await rest("plans?select=raw&limit=1", userToken)).ok).toBe(false);
  });
});

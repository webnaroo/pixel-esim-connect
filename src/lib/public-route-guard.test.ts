import { describe, expect, it } from "vitest";
import { hmacSha256Hex, verifyAuth } from "./public-route-guard.server";

describe("public route auth", () => {
  it("accepts a correct HMAC signature", async () => {
    const sig = await hmacSha256Hex("s3cret", '{"a":1}');
    expect(await verifyAuth({ kind: "hmac-sha256", header: "x-sig" }, "s3cret", new Headers({ "x-sig": sig }), '{"a":1}')).toBe(true);
  });
  it("rejects a signature over a tampered body", async () => {
    const sig = await hmacSha256Hex("s3cret", '{"a":1}');
    expect(await verifyAuth({ kind: "hmac-sha256", header: "x-sig" }, "s3cret", new Headers({ "x-sig": sig }), '{"a":2}')).toBe(false);
  });
  it("rejects a missing signature", async () => {
    expect(await verifyAuth({ kind: "hmac-sha256", header: "x-sig" }, "s3cret", new Headers(), "x")).toBe(false);
  });
  it("rejects a wrong bearer token", async () => {
    expect(await verifyAuth({ kind: "bearer" }, "tok", new Headers({ authorization: "Bearer nope" }), "")).toBe(false);
    expect(await verifyAuth({ kind: "bearer" }, "tok", new Headers({ authorization: "Bearer tok" }), "")).toBe(true);
  });
});

import { verifyStripeSignature as vss, hmacSha256Hex as hx } from "./public-route-guard.server";
describe("stripe signature", () => {
  const body = '{"id":"evt_1"}';
  it("accepts valid, rejects invalid, tampered and stale", async () => {
    const sig = await hx("whsec_test", `1000.${body}`);
    expect(await vss(`t=1000,v1=${sig}`, body, "whsec_test", 1100)).toBe(true);
    expect(await vss(`t=1000,v1=${"0".repeat(64)}`, body, "whsec_test", 1100)).toBe(false);
    expect(await vss(`t=1000,v1=${sig}`, body + " ", "whsec_test", 1100)).toBe(false);
    expect(await vss(`t=1000,v1=${sig}`, body, "whsec_test", 2000)).toBe(false);
    expect(await vss("", body, "whsec_test", 1000)).toBe(false);
  });
});

import { verifyAuth as verifyCron } from "./public-route-guard.server";
describe("fx cron endpoint auth", () => {
  it("rejects requests without token", async () => expect(await verifyCron({ kind: "bearer" }, "s3cret-token", new Headers(), "")).toBe(false));
  it("rejects a wrong token", async () => expect(await verifyCron({ kind: "bearer" }, "s3cret-token", new Headers({ authorization: "Bearer nope" }), "")).toBe(false));
});

import { verifyStandardWebhook } from "./public-route-guard.server";
describe("standard webhooks signature (Supabase auth hooks)", () => {
  const secretB64 = btoa("0123456789abcdef0123456789abcdef");
  const body = '{"user":{"email":"a@b.de"}}';
  const sign = async (id: string, ts: number, b: string) => {
    const key = await crypto.subtle.importKey("raw", Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${b}`)));
    return `v1,${btoa(String.fromCharCode(...sig))}`;
  };
  const headers = (id: string, ts: number, sig: string) => new Headers({ "webhook-id": id, "webhook-timestamp": String(ts), "webhook-signature": sig });

  it("accepts a valid signature, with or without the v1,whsec_ prefix", async () => {
    const sig = await sign("msg_1", 1000, body);
    expect(await verifyStandardWebhook(headers("msg_1", 1000, sig), body, `v1,whsec_${secretB64}`, 1100)).toBe(true);
    expect(await verifyStandardWebhook(headers("msg_1", 1000, sig), body, `whsec_${secretB64}`, 1100)).toBe(true);
  });
  it("accepts when one of several signatures matches", async () => {
    const sig = await sign("msg_1", 1000, body);
    expect(await verifyStandardWebhook(headers("msg_1", 1000, `v1,AAAA ${sig}`), body, `v1,whsec_${secretB64}`, 1100)).toBe(true);
  });
  it("rejects tampered body, other id, wrong secret, missing headers and stale timestamps", async () => {
    const sig = await sign("msg_1", 1000, body);
    const secret = `v1,whsec_${secretB64}`;
    expect(await verifyStandardWebhook(headers("msg_1", 1000, sig), body + " ", secret, 1100)).toBe(false);
    expect(await verifyStandardWebhook(headers("msg_2", 1000, sig), body, secret, 1100)).toBe(false);
    expect(await verifyStandardWebhook(headers("msg_1", 1000, sig), body, `v1,whsec_${btoa("another-secret-value-123456789012")}`, 1100)).toBe(false);
    expect(await verifyStandardWebhook(new Headers(), body, secret, 1100)).toBe(false);
    expect(await verifyStandardWebhook(headers("msg_1", 1000, sig), body, secret, 5000)).toBe(false);
  });
  it("is reachable through verifyAuth", async () => {
    const sig = await sign("msg_1", Math.floor(Date.now() / 1000), body);
    const h = headers("msg_1", Math.floor(Date.now() / 1000), sig);
    expect(await verifyAuth({ kind: "standard-webhooks" }, `v1,whsec_${secretB64}`, h, body)).toBe(true);
  });
});

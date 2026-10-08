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

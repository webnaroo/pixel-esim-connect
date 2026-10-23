import { describe, expect, it } from "vitest";
import { buildPushMessage, isSafeAppPath, isValidPushToken } from "./push";
import { buildServiceJwt, parseServiceAccount } from "./fcm-auth";

describe("push texts", () => {
  it("eSIM bereit nennt das Reiseziel und führt aufs Konto", () => {
    const m = buildPushMessage("esim_ready", { plan: "Ägypten" })!;
    expect(m.title).toBe("Deine eSIM ist bereit");
    expect(m.body).toContain("Ägypten");
    expect(m.path).toBe("/account");
  });
  it("Verbrauch: 80 und 100 Prozent, darunter keine Mitteilung", () => {
    expect(buildPushMessage("usage_alert", { threshold: 80 })!.title).toContain("80 %");
    expect(buildPushMessage("usage_alert", { threshold: 100 })!.title).toContain("aufgebraucht");
    expect(buildPushMessage("usage_alert", { threshold: 50 })).toBeNull();
  });
  it("Texte enthalten nie Installationsdaten", () => {
    for (const m of [buildPushMessage("esim_ready", { plan: "X" }), buildPushMessage("usage_alert", { threshold: 80 })]) {
      expect(JSON.stringify(m)).not.toMatch(/LPA|activation|QR/i);
    }
  });
});

describe("push Prüfregeln", () => {
  it("lässt nur eigene relative Pfade zu", () => {
    expect(isSafeAppPath("/account")).toBe(true);
    expect(isSafeAppPath("//evil.example")).toBe(false);
    expect(isSafeAppPath("https://evil.example")).toBe(false);
    expect(isSafeAppPath("/\\evil")).toBe(false);
    expect(isSafeAppPath(5)).toBe(false);
  });
  it("prüft Tokens", () => {
    expect(isValidPushToken("a".repeat(40))).toBe(true);
    expect(isValidPushToken("kurz")).toBe(false);
    expect(isValidPushToken("a b".repeat(20))).toBe(false);
  });
});

describe("Firebase-Anmeldung", () => {
  it("liest nur vollständige Dienstkonten", () => {
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(parseServiceAccount("kein json")).toBeNull();
    expect(parseServiceAccount(JSON.stringify({ project_id: "p" }))).toBeNull();
  });
  it("signiert ein JWT, das mit dem öffentlichen Schlüssel prüfbar ist", async () => {
    const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
    const der = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
    const jwt = await buildServiceJwt({ project_id: "p", client_email: "svc@p.iam.gserviceaccount.com", private_key: pem }, 1000);
    const [h, c, s] = jwt.split(".") as [string, string, string];
    const claims = JSON.parse(atob(c.replace(/-/g, "+").replace(/_/g, "/")));
    expect(claims).toMatchObject({ iss: "svc@p.iam.gserviceaccount.com", iat: 1000, exp: 4600 });
    const sig = Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (ch) => ch.charCodeAt(0));
    expect(await crypto.subtle.verify("RSASSA-PKCS1-v1_5", pair.publicKey, sig, new TextEncoder().encode(`${h}.${c}`))).toBe(true);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailSendError, formatFrom, sendResendEmail } from "./resend.server";

const msg = { from: { name: "GlobeSIM", address: "bestellung@notify.globesim.de" }, to: "kunde@example.com", subject: "Hallo", html: "<p>Hi</p>", text: "Hi", idempotencyKey: "order-1" };

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("formatFrom", () => {
  it("quotes the display name and rejects header injection", () => {
    expect(formatFrom({ name: 'Glo"be: SIM', address: "a@b.de" })).toBe('"Glo\\"be: SIM" <a@b.de>');
    expect(() => formatFrom({ name: "x\r\nBcc: evil@x.de", address: "a@b.de" })).toThrow();
    expect(() => formatFrom({ name: "x", address: "a@b.de>" })).toThrow();
  });
});

describe("sendResendEmail", () => {
  it("posts to Resend with bearer key, idempotency key and reply_to", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendResendEmail({ ...msg, replyTo: "support@globesim.de" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ Authorization: "Bearer re_test", "Idempotency-Key": "order-1" });
    expect(JSON.parse(init.body)).toMatchObject({ to: ["kunde@example.com"], subject: "Hallo", reply_to: "support@globesim.de" });
  });
  it("fails with 503 when no key is configured, without calling out", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(sendResendEmail(msg)).rejects.toMatchObject({ status: 503, code: "resend_not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("maps provider errors to status and code only (no message text) and marks 429/5xx retryable", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: "validation_error", message: "secret detail kunde@example.com" }), { status: 422 })));
    const err = (await sendResendEmail(msg).catch((e) => e)) as EmailSendError;
    expect(err).toBeInstanceOf(EmailSendError);
    expect(err).toMatchObject({ status: 422, code: "validation_error", retryable: false });
    expect(err.message).not.toContain("kunde@example.com");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 503 })));
    expect(await sendResendEmail(msg).catch((e) => e as EmailSendError)).toMatchObject({ status: 503, code: "send_failed", retryable: true });
  });
});

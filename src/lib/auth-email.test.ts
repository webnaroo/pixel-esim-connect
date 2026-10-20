import { describe, expect, it } from "vitest";
import { buildVerifyUrl, planAuthEmails, sendEmailHookSchema } from "./auth-email";

const SB = "https://proj.supabase.co/";
const hook = (over: Record<string, unknown>, user: Record<string, unknown> = {}) =>
  sendEmailHookSchema.parse({ user: { email: "a@b.de", ...user }, email_data: { token: "123456", token_hash: "H1", redirect_to: "https://globesim.de", ...over } });

describe("auth email planning", () => {
  it("builds the verify link on the Supabase URL with encoded redirect", () => {
    const u = new URL(buildVerifyUrl(SB, "abc", "signup", "https://globesim.de/reset-password?x=1"));
    expect(u.origin + u.pathname).toBe("https://proj.supabase.co/auth/v1/verify");
    expect(u.searchParams.get("token")).toBe("abc");
    expect(u.searchParams.get("type")).toBe("signup");
    expect(u.searchParams.get("redirect_to")).toBe("https://globesim.de/reset-password?x=1");
  });
  it("sends one verify mail for signup, recovery, magiclink and invite", () => {
    for (const t of ["signup", "recovery", "magiclink", "invite"]) {
      const [m, ...rest] = planAuthEmails(hook({ email_action_type: t }), SB)!;
      expect(rest).toHaveLength(0);
      expect(m!.to).toBe("a@b.de");
      expect(new URL(m!.confirmationUrl).searchParams.get("type")).toBe(t);
    }
  });
  it("reauthentication carries the code and no link", () => {
    const [m] = planAuthEmails(hook({ email_action_type: "reauthentication" }), SB)!;
    expect(m).toMatchObject({ to: "a@b.de", token: "123456", confirmationUrl: "" });
  });
  it("email change without secure mode only mails the new address (token_hash)", () => {
    const plan = planAuthEmails(hook({ email_action_type: "email_change" }, { new_email: "n@b.de" }), SB)!;
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ to: "n@b.de", oldEmail: "a@b.de", newEmail: "n@b.de" });
    expect(new URL(plan[0]!.confirmationUrl).searchParams.get("token")).toBe("H1");
  });
  it("secure email change mails both addresses with the crosswise tokens", () => {
    const plan = planAuthEmails(hook({ email_action_type: "email_change", token_hash_new: "H2" }, { new_email: "n@b.de" }), SB)!;
    expect(plan.map((m) => m.to).sort()).toEqual(["a@b.de", "n@b.de"]);
    const tokenFor = (to: string) => new URL(plan.find((m) => m.to === to)!.confirmationUrl).searchParams.get("token");
    expect(tokenFor("n@b.de")).toBe("H1");
    expect(tokenFor("a@b.de")).toBe("H2");
  });
  it("returns null for unknown action types", () => {
    expect(planAuthEmails(hook({ email_action_type: "something_new" }), SB)).toBeNull();
  });
  it("rejects payloads without a valid user email", () => {
    expect(sendEmailHookSchema.safeParse({ user: { email: "nope" }, email_data: { email_action_type: "signup" } }).success).toBe(false);
  });
});

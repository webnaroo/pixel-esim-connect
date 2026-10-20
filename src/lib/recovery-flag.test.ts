import { beforeEach, describe, expect, it } from "vitest";
import { clearRecovery, hashIsRecovery, recoveryPending, rememberRecoveryFromUrl } from "./recovery-flag";

describe("password recovery flag", () => {
  beforeEach(() => { sessionStorage.clear(); window.location.hash = ""; });

  it("recognises the recovery hash Supabase appends to the redirect", () => {
    expect(hashIsRecovery("#access_token=abc&expires_in=3600&refresh_token=r&token_type=bearer&type=recovery")).toBe(true);
    expect(hashIsRecovery("#type=recovery&access_token=abc")).toBe(true);
  });
  it("ignores other hashes, including the error redirect", () => {
    expect(hashIsRecovery("")).toBe(false);
    expect(hashIsRecovery("#access_token=abc&type=signup")).toBe(false);
    expect(hashIsRecovery("#error=access_denied&error_code=otp_expired")).toBe(false);
    expect(hashIsRecovery("#subtype=recovery")).toBe(false);
  });
  it("keeps the flag after the hash is cleared, until it is cleared explicitly", () => {
    window.location.hash = "#access_token=abc&type=recovery";
    rememberRecoveryFromUrl();
    window.location.hash = "";
    expect(recoveryPending()).toBe(true);
    clearRecovery();
    expect(recoveryPending()).toBe(false);
  });
  it("does not set the flag for a normal visit", () => {
    rememberRecoveryFromUrl();
    expect(recoveryPending()).toBe(false);
  });
});

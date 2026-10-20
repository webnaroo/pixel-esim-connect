// Remembers that this tab arrived through a password-recovery link.
// supabase-js consumes and clears the URL hash while it initialises, which can happen before the
// reset page mounts and listens for PASSWORD_RECOVERY, so the page could not tell a reset link from a plain visit.
const KEY = "globesim:password-recovery";

export const hashIsRecovery = (hash: string) => /(?:^|[#&])type=recovery(?:&|$)/.test(hash);

/** Call before the Supabase client is created. */
export function rememberRecoveryFromUrl(): void {
  try {
    if (hashIsRecovery(window.location.hash)) sessionStorage.setItem(KEY, "1");
  } catch { /* storage unavailable: the page still reacts to the PASSWORD_RECOVERY event */ }
}

export function recoveryPending(): boolean {
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function clearRecovery(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

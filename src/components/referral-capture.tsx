// Merkt sich ?ref=CODE aus dem Link und ordnet es dem Konto zu, sobald jemand angemeldet ist. Zeigt nichts an.
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { applyReferralCode } from "@/lib/referral.functions";
import { normalizeReferralCode } from "@/lib/referral";

const KEY = "globesim:ref";

export function ReferralCapture() {
  const { user } = useAuth();
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      const code = ref ? normalizeReferralCode(ref) : null;
      if (code) localStorage.setItem(KEY, code);
    } catch { /* Speicher gesperrt: dann eben ohne */ }
  }, []);
  useEffect(() => {
    if (!user) return;
    let code: string | null = null;
    try { code = localStorage.getItem(KEY); } catch { return; }
    if (!code) return;
    void applyReferralCode({ data: { code } })
      .catch(() => undefined)
      .finally(() => { try { localStorage.removeItem(KEY); } catch { /* egal */ } });
  }, [user]);
  return null;
}

// "Empfehlen & Verdienen" im Konto: Code, Link, Teilen, Stand.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { myReferralQuery } from "@/lib/referral.functions";
import { REFERRAL_MAX_REWARDS, REFERRAL_REWARD_CENTS, referralLink } from "@/lib/referral";
import { LOYALTY_NAME, toEuro } from "@/lib/loyalty";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui-kit";

export function ReferralCard() {
  const q = useQuery({ ...myReferralQuery(), retry: false });
  const [copied, setCopied] = useState(false);
  if (!q.data) return null;
  const d = q.data;
  const reward = formatPrice(toEuro(REFERRAL_REWARD_CENTS), "EUR");
  const link = referralLink(window.location.origin, d.code);
  const text = encodeURIComponent(`Hol dir deine eSIM für die Reise bei GlobeSIM. Mit meinem Link bekommst du ${reward} Guthaben auf deinen ersten Kauf: ${link}`);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* Browser verbietet Kopieren */ }
  };
  return (
    <section className="rounded-[14px] border border-line bg-surface p-5" aria-labelledby="referral-title">
      <h2 id="referral-title" className="text-xl">Empfehlen & Verdienen</h2>
      <p className="mt-1 text-sm text-ink-muted">Du bekommst {reward} {LOYALTY_NAME} für jeden Freund, der sich anmeldet und kauft. Dein Freund bekommt ebenfalls {reward}.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-ink-muted">Dein Empfehlungscode</div>
          <div className="tabular font-semibold tracking-wider text-ink">{d.code}</div>
        </div>
        <Button type="button" variant="secondary" onClick={copy}>{copied ? "Link kopiert" : "Link kopieren"}</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <a className="rounded-full border border-line px-4 py-2 font-medium text-ink" href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a className="rounded-full border border-line px-4 py-2 font-medium text-ink" href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`} target="_blank" rel="noopener noreferrer">Telegram</a>
        <a className="rounded-full border border-line px-4 py-2 font-medium text-ink" href={`mailto:?subject=${encodeURIComponent("Deine eSIM für die Reise")}&body=${text}`}>E-Mail</a>
      </div>
      <p className="mt-4 text-sm text-ink">Eingeladen: <span className="tabular font-medium">{d.invited}</span> · Belohnt: <span className="tabular font-medium">{d.rewarded}</span> · Verdient: <span className="tabular font-medium">{formatPrice(toEuro(d.earnedCents), "EUR")}</span></p>
      <p className="mt-3 text-xs text-ink-muted">Die Belohnung gibt es, sobald dein Freund mit einem neuen Konto zum ersten Mal etwas bezahlt hat, egal wie viel. Höchstens {REFERRAL_MAX_REWARDS} belohnte Empfehlungen pro Konto. Eigene Konten zählen nicht. Das Guthaben gilt nur im Shop und wird nicht ausgezahlt.</p>
    </section>
  );
}

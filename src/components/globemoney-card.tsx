// GlobeMoney-Karte im Konto: Guthaben, Stufe, Fortschritt zur nächsten Stufe.
import { useQuery } from "@tanstack/react-query";
import { myLoyaltyQuery } from "@/lib/loyalty.functions";
import { LOYALTY_NAME, LOYALTY_TIERS, toEuro } from "@/lib/loyalty";
import { formatPrice } from "@/lib/format";

export function GlobeMoneyCard() {
  const q = useQuery({ ...myLoyaltyQuery(), retry: false });
  if (!q.data) return null; // Fehler oder Laden: die Karte bleibt einfach weg, das Konto funktioniert weiter
  const d = q.data;
  const next = d.next;
  const current = LOYALTY_TIERS.find((t) => t.id === d.tier.id)!;
  const from = current.fromCents;
  const pct = next ? Math.min(100, Math.round(((d.spendCents - from) / (next.remainingCents + d.spendCents - from)) * 100)) : 100;
  return (
    <section className="rounded-[14px] border border-line bg-surface p-5" aria-labelledby="globemoney-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="globemoney-title" className="text-xl">{LOYALTY_NAME}</h2>
          <p className="mt-1 text-sm text-ink-muted">{d.tier.label} · {Math.round(d.tier.rate * 100)} % Cashback</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-ink-muted">Dein Guthaben</div>
          <div className="tabular text-3xl font-semibold text-ink">{formatPrice(toEuro(d.balanceCents), "EUR")}</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Fortschritt zur nächsten Stufe">
          <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-ink">
          {next ? `Noch ${formatPrice(toEuro(next.remainingCents), "EUR")} bis ${next.label}: ${Math.round(next.rate * 100)} % Cashback.` : "Du hast die höchste Stufe erreicht."}
        </p>
      </div>
      <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {LOYALTY_TIERS.map((t) => (
          <li key={t.id} className={`flex justify-between rounded-lg border px-3 py-2 ${t.id === d.tier.id ? "border-primary bg-muted text-ink" : "border-line text-ink-muted"}`}>
            <span>{t.label}{t.fromCents > 0 ? ` (ab ${formatPrice(toEuro(t.fromCents), "EUR")})` : ""}</span>
            <span className="tabular font-medium">{Math.round(t.rate * 100)} %</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-muted">Bei jedem Kauf bekommst du Guthaben, sobald die Zahlung bestätigt ist. Im Bezahlvorgang kannst du damit bezahlen, auch eine ganze Bestellung, wenn dein Guthaben reicht. Wird nur ein Teil damit bezahlt, bleiben mindestens 0,50 € in bar. Das Guthaben gilt nur im Shop und wird nicht ausgezahlt. Bei Erstattung oder Stornierung entfällt die Gutschrift der Bestellung.</p>
    </section>
  );
}

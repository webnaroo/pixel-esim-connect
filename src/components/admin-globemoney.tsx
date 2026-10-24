// Admin: GlobeMoney für Kunden per E-Mail-Adresse gutschreiben oder abziehen.
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adjustLoyaltyCredit, findLoyaltyCustomer } from "@/lib/loyalty-admin.functions";
import { LOYALTY_NAME } from "@/lib/loyalty";
import { formatPrice } from "@/lib/format";
import { Button, Input } from "./ui-kit";

type Customer = Awaited<ReturnType<typeof findLoyaltyCustomer>>;

export function AdminGlobeMoney() {
  const find = useServerFn(findLoyaltyCustomer);
  const adjust = useServerFn(adjustLoyaltyCredit);
  const [email, setEmail] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Fehlgeschlagen." }); }
    finally { setBusy(false); }
  };

  const search = () => run(async () => { setCustomer(await find({ data: { email } })); });
  const book = () => run(async () => {
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value === 0) throw new Error("Bitte einen Betrag in Euro eingeben (zum Beispiel 5 oder -2,50).");
    const verb = value > 0 ? "gutschreiben" : "abziehen";
    if (!confirm(`${formatPrice(Math.abs(value), "EUR")} ${LOYALTY_NAME} ${verb} bei ${customer?.email}?`)) return;
    const next = await adjust({ data: { email: customer!.email!, amount: value, reason } });
    setCustomer(next); setAmount(""); setReason("");
    setMsg({ ok: true, text: `Gebucht. Neues Guthaben: ${formatPrice(next.balanceCents / 100, "EUR")}.` });
  });

  return (
    <section className="mb-8 space-y-4 rounded-[14px] border border-line bg-surface p-5" aria-labelledby="gm-admin-title">
      <div>
        <h2 id="gm-admin-title" className="text-xl">{LOYALTY_NAME} buchen</h2>
        <p className="text-sm text-ink-muted">Kunden per E-Mail-Adresse suchen, dann Guthaben gutschreiben (Betrag positiv) oder abziehen (negativ). Jede Buchung wird mit Grund protokolliert. Höchstens 500 € pro Buchung.</p>
      </div>
      <form className="flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <label className="min-w-[240px] flex-1"><span className="sr-only">E-Mail-Adresse des Kunden</span><Input type="email" inputMode="email" placeholder="E-Mail-Adresse des Kunden" value={email} onChange={(e) => { setEmail(e.target.value); setCustomer(null); }} autoComplete="off" /></label>
        <Button type="submit" variant="secondary" loading={busy && !customer} disabled={!email.includes("@")}>Kunden suchen</Button>
      </form>
      {customer && (
        <div className="space-y-4 border-t border-line pt-4">
          <div className="text-sm">
            <div className="font-medium text-ink">{customer.email}{customer.name ? ` · ${customer.name}` : ""}</div>
            <div className="text-ink-muted">{customer.tier} · Guthaben <strong className="tabular text-ink">{formatPrice(customer.balanceCents / 100, "EUR")}</strong></div>
          </div>
          <form className="grid gap-3 sm:grid-cols-[160px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); void book(); }}>
            <label><span className="sr-only">Betrag in Euro</span><Input inputMode="decimal" placeholder="Betrag in € (z. B. 5 oder -2,50)" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label><span className="sr-only">Grund</span><Input placeholder="Grund (z. B. Kulanz nach Verzögerung)" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} /></label>
            <Button type="submit" loading={busy} disabled={!amount.trim() || reason.trim().length < 3}>Buchen</Button>
          </form>
          {customer.history.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-ink">Letzte Buchungen von Hand</h3>
              <ul className="mt-2 divide-y divide-line rounded-lg border border-line text-sm">
                {customer.history.map((h) => (
                  <li key={h.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                    <span className="text-ink-muted">{new Date(h.createdAt).toLocaleString("de-DE")} · {h.reason}</span>
                    <span className={`tabular font-medium ${h.amount < 0 ? "text-danger" : "text-primary"}`}>{h.amount > 0 ? "+" : "−"}{formatPrice(Math.abs(h.amount), "EUR")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-primary" : "text-danger"}`}>{msg.text}</p>}
    </section>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminOrdersQuery, refundOrder } from "@/lib/orders.functions";
import { Chip, ErrorBox, EmptyState } from "@/components/brand";
import { Button, Input } from "@/components/ui-kit";
import { formatPrice } from "@/lib/format";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => privateHead("Bestellungen verwalten", "Geschützte Bestell- und Erstattungsverwaltung von GlobeSIM."),
  component: AdminOrders,
  errorComponent: AdminError,
});

function AdminOrders() {
  const q = useQuery(adminOrdersQuery());
  const qc = useQueryClient();
  const refund = useServerFn(refundOrder);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  if (q.error) throw q.error;
  const all = q.data ?? [];
  const orders = all.filter((o) => (!status || o.status === status) && (!search || `${o.id} ${o.guest_email}`.toLowerCase().includes(search.toLowerCase())));
  const pendingMail = all.filter((o) => o.email_status === "pending_domain").length;
  const failed = orders.filter((o) => ["fulfillment_failed", "payment_mismatch", "needs_review"].includes(o.status));

  const doRefund = async (id: string) => {
    if (!confirm("Diese Bestellung wirklich erstatten?")) return;
    setBusy(id); setMsg(null);
    try { await refund({ data: { orderId: id } }); await qc.invalidateQueries({ queryKey: ["admin", "orders"] }); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Erstattung fehlgeschlagen."); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      {failed.length > 0 && (
        <div role="alert" className="rounded-lg border border-line border-l-4 border-l-warning bg-surface p-4 text-sm">
          {failed.length} Bestellung(en) brauchen deine Prüfung: Auslieferung nach allen Versuchen fehlgeschlagen oder gezahlter Betrag weicht ab. Bitte prüfen und erstatten.
        </div>
      )}
      {pendingMail > 0 && (
        <div role="alert" className="rounded-lg border border-line border-l-4 border-l-warning bg-surface p-4 text-sm">
          {pendingMail} Bestellung(en) mit „E-Mail ausstehend“: Es ist noch keine Absender-Domain verifiziert, deshalb gehen keine Mails an Kunden. Einstellung unter Inhalte › E-Mail.
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="min-w-[220px] flex-1"><span className="sr-only">Suchen</span><Input placeholder="E-Mail oder Bestellnummer" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <select aria-label="Status filtern" className="h-12 rounded-md border border-line bg-surface px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Alle Status</option>
          {["pending", "paid", "fulfilling", "fulfilled", "needs_review", "fulfillment_failed", "payment_mismatch", "refunded", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {msg && <ErrorBox message={msg} />}
      {q.isLoading ? <p className="text-ink-muted">Wird geladen …</p> : orders.length === 0 ? (
        <EmptyState title="Noch keine Bestellungen" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-left text-ink-muted">
              <tr><th className="p-3">Datum</th><th className="p-3">E-Mail</th><th className="p-3">Betrag</th><th className="p-3">Status</th><th className="p-3">Versuche</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="p-3 whitespace-nowrap">{new Date(o.created_at).toLocaleString("de-DE")}</td>
                  <td className="p-3">{o.guest_email}</td>
                  <td className="p-3 tabular">{formatPrice(Number(o.amount), o.currency)}</td>
                  <td className="p-3">
                    <Chip tone={o.status === "fulfilled" ? "active" : ["fulfillment_failed", "payment_mismatch", "needs_review"].includes(o.status) ? "warning" : "default"}>{o.status}</Chip>
                    {o.is_test && <span className="ml-2 text-xs text-ink-muted">Test</span>}
                    {o.email_status === "pending_domain" && <div className="mt-1 text-xs text-ink-muted">E-Mail ausstehend</div>}
                    {o.last_error && <div className="mt-1 text-xs text-ink-muted">{o.last_error}</div>}
                  </td>
                  <td className="p-3">{o.fulfillment_attempts}</td>
                  <td className="p-3 text-right">
                    {["fulfillment_failed", "payment_mismatch", "needs_review", "paid", "fulfilling"].includes(o.status) && (
                      <Button variant="secondary" className="h-10!" loading={busy === o.id} onClick={() => doRefund(o.id)}>Erstatten</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

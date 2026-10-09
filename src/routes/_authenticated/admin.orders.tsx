import { WEBHOOK_STATUS_LABEL, webhookReasonLabel } from "@/lib/webhook-labels";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminOrdersQuery, refundOrder } from "@/lib/orders.functions";
import { webhookEventsQuery } from "@/lib/admin.functions";
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
      <WebhookEvents />
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

const WH_STATUS = WEBHOOK_STATUS_LABEL;

function WebhookEvents() {
  const q = useQuery(webhookEventsQuery());
  const [type, setType] = useState("");
  const [st, setSt] = useState("");
  const [mode, setMode] = useState("");
  const all = q.data?.events ?? [];
  const failed = all.filter((e) => e.status === "failed" || e.event_type === "order.failed" || e.event_type === "order.topup.failed");
  const rows = all.filter((e) => (!type || e.event_type === type) && (!st || e.status === st) && (!mode || e.mode === mode));
  const types = [...new Set(all.map((e) => e.event_type))];
  const sel = "h-10 rounded-md border border-line bg-surface px-3 text-sm";
  return (
    <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-ink">eSIMerge-Webhooks</h2>
        <span className="text-sm text-ink-muted">Webhook-Geheimnis gesetzt: <strong>{q.data ? (q.data.secretSet ? "Ja" : "Nein") : "…"}</strong></span>
      </div>
      {(q.data?.alerts ?? []).length > 0 && (
        <div role="alert" className="space-y-1 rounded-lg border border-line border-l-4 border-l-warning p-3 text-sm">
          <p className="font-semibold text-ink">Hinweise von eSIMerge</p>
          <ul className="space-y-1">
            {q.data!.alerts.slice(0, 10).map((a) => (
              <li key={a.id}>
                <span className="text-ink-muted">{new Date(a.createdAt).toLocaleString("de-DE")} · Bestellung {a.orderId?.slice(0, 8)} · </span>
                {a.action === "cost_mismatch" ? a.message : a.action === "provider_order_cancelled" ? "Storniert – Erstatten prüfen" : a.message || "Fehlgeschlagen – Erstatten prüfen"}
              </li>
            ))}
          </ul>
        </div>
      )}
      {failed.length > 0 && (
        <div role="alert" className="rounded-lg border border-line border-l-4 border-l-warning p-3 text-sm">
          {failed.length} Webhook-Ereignis(se) mit Fehler oder fehlgeschlagener Bestellung/Aufladung. Betroffene Bestellungen unten prüfen und ggf. erstatten.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <select aria-label="Typ filtern" className={sel} value={type} onChange={(e) => setType(e.target.value)}><option value="">Alle Typen</option>{types.map((t) => <option key={t}>{t}</option>)}</select>
        <select aria-label="Status filtern" className={sel} value={st} onChange={(e) => setSt(e.target.value)}><option value="">Alle Status</option>{Object.entries(WH_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Modus filtern" className={sel} value={mode} onChange={(e) => setMode(e.target.value)}><option value="">Sandbox + Live</option><option value="sandbox">Sandbox</option><option value="live">Live</option></select>
      </div>
      {rows.length === 0 ? <p className="text-sm text-ink-muted">{q.isLoading ? "Wird geladen …" : "Noch keine Webhook-Ereignisse."}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-ink-muted"><tr><th className="p-2">Zeit</th><th className="p-2">Typ</th><th className="p-2">Modus</th><th className="p-2">Status</th><th className="p-2">Grund</th><th className="p-2">Delivery-ID</th><th className="p-2">Bestellung</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="p-2 whitespace-nowrap">{new Date(e.received_at).toLocaleString("de-DE")}</td>
                  <td className="p-2 font-mono text-xs">{e.event_type}</td>
                  <td className="p-2">{e.mode === "live" ? "Live" : "Sandbox"}</td>
                  <td className="p-2"><Chip tone={e.status === "processed" ? "active" : e.status === "failed" ? "warning" : "default"}>{WH_STATUS[e.status] ?? e.status}</Chip></td>
                  <td className="p-2 text-xs text-ink-muted">{webhookReasonLabel(e.error)}</td>
                  <td className="p-2 font-mono text-xs">{e.delivery_id ?? ""}</td>
                  <td className="p-2 font-mono text-xs">{e.order_id ? e.order_id.slice(0, 8) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

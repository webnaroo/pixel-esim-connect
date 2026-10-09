import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "@phosphor-icons/react";
import { confirmReplyTo, goLiveQuery, saveEmailSender, sendAdminTestEmail } from "@/lib/golive.functions";
import { adminOverviewQuery } from "@/lib/admin.functions";
import { Button, Input } from "@/components/ui-kit";
import { Chip } from "@/components/brand";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/golive")({
  head: () => privateHead("Go-Live", "E-Mail, Stripe Live und Testkauf im GlobeSIM-Admin vorbereiten."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(goLiveQuery()), context.queryClient.ensureQueryData(adminOverviewQuery())]),
  errorComponent: AdminError,
  component: GoLive,
});

function Row({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      {ok ? <CheckCircle size={22} className="shrink-0 text-mint" weight="fill" /> : <XCircle size={22} className="shrink-0 text-danger" weight="fill" />}
      <div><p className="font-medium">{label}</p>{detail && <p className="text-sm text-ink-muted">{detail}</p>}</div>
    </li>
  );
}

const card = "rounded-lg border border-line bg-surface p-6";

function GoLive() {
  const { data } = useSuspenseQuery(goLiveQuery());
  const { data: ov } = useSuspenseQuery(adminOverviewQuery());
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const saveSender = useServerFn(saveEmailSender);
  const confirm = useServerFn(confirmReplyTo);
  const sendTest = useServerFn(sendAdminTestEmail);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const e = data.email;
  const c = ov.checklist;

  async function onSave(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    setBusy("save");
    try { await saveSender({ data: { fromLocal: String(f.get("from")), replyTo: String(f.get("reply")) } }); toast.success("Absender gespeichert."); refresh(); }
    catch { toast.error("Bitte gültige Angaben eingeben."); }
    setBusy(null);
  }
  async function onTest() {
    setBusy("test");
    const r = await sendTest();
    setBusy(null);
    if (r.ok) toast.success(`Test-E-Mail gesendet an ${r.to}.`); else toast.error(`Nicht gesendet: ${r.reason}`);
    refresh();
  }

  return (
    <div className="grid gap-8">
      <section className={card}>
        <h2 className="text-xl">E-Mail</h2>
        <ul className="mt-2 divide-y divide-line">
          <Row ok={!!c.emailVerified} label={`E-Mail-Domain ${e.sender_domain || "notify.globesim.de"} verifiziert`} detail={c.emailVerified ? "ja" : "nein – keine Mails an Kunden"} />
          <Row ok={!!c.emailTestSent} label="Test-E-Mail gesendet" detail={e.test_result ? `${e.test_result.ok ? "Gesendet" : `Fehler: ${e.test_result.reason ?? "unbekannt"}`} · ${new Date(e.test_result.at).toLocaleString("de-DE")}` : "Noch nicht gesendet"} />
          <Row ok={!!c.replyConfirmed} label={`Antwortadresse ${e.reply_to} erreichbar (von dir bestätigt)`} detail={e.reply_confirmed_at ? `Bestätigt am ${new Date(e.reply_confirmed_at).toLocaleString("de-DE")}` : "Antworte auf die Test-E-Mail und bestätige danach hier."} />
        </ul>
        <form onSubmit={onSave} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm">Absender (vor dem @{e.sender_domain})<Input name="from" defaultValue={e.from_local} className="mt-1" /></label>
          <label className="text-sm">Antwortadresse (Reply-To)<Input name="reply" type="email" defaultValue={e.reply_to} className="mt-1" /></label>
          <Button type="submit" variant="secondary" loading={busy === "save"}>Speichern</Button>
        </form>
        <p className="mt-2 text-sm text-ink-muted">Kunden sehen als Absender <span className="font-mono">{e.fromAddress}</span>, Antworten gehen an <span className="font-mono">{e.reply_to}</span>.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button loading={busy === "test"} onClick={onTest}>Test-E-Mail senden{e.adminEmail ? ` (an ${e.adminEmail})` : ""}</Button>
          <Button variant="secondary" onClick={async () => { await confirm({ data: { confirmed: !e.reply_confirmed_at } }); refresh(); }}>
            {e.reply_confirmed_at ? "Bestätigung zurücknehmen" : "Antwort ist angekommen – bestätigen"}
          </Button>
        </div>

        <h3 className="mt-8 text-lg">Kunden-E-Mails</h3>
        <ul className="mt-2 divide-y divide-line">
          {data.mails.map((m) => (
            <li key={m.template} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-sm">Betreff: „{m.subject}“</p>
                <p className="text-sm text-ink-muted">{m.when} · {m.plainCodeFree ? "keine Aktivierungscodes im Text, nur signierter Link" : "Achtung: enthält Codes"}</p>
              </div>
              <Button variant="secondary" onClick={() => setPreview(preview === m.template ? null : m.template)}>{preview === m.template ? "Vorschau schließen" : "Vorschau"}</Button>
              {preview === m.template && <iframe title={`Vorschau ${m.name}`} srcDoc={m.html} sandbox="" className="h-[520px] w-full rounded-md border border-line bg-surface" />}
            </li>
          ))}
          <li className="py-3">
            <p className="font-medium">Registrierung / Passwort zurücksetzen</p>
            <p className="text-sm text-ink-muted">Diese Mails verschickt die Anmeldung. Sie sind noch nicht im GlobeSIM-Design angelegt und kommen derzeit als Standard-Mails. Siehe Anleitung im Chat.</p>
          </li>
        </ul>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center gap-3"><h2 className="text-xl">Stripe</h2><Chip tone={c.stripeMode === "live" ? "active" : "warning"}>Stripe: {c.stripeMode === "live" ? "Live" : "Test"}</Chip></div>
        <ul className="mt-2 divide-y divide-line">
          <Row ok={data.stripe.liveKey} label="Stripe Live aktiv" detail={data.stripe.liveKey ? "Live-Zugang vorhanden" : "Nur Testmodus"} />
          <Row ok={data.stripe.liveSecret} label="Live-Webhook-Geheimnis gesetzt" detail={data.stripe.liveSecret ? "gesetzt (Wert wird nie angezeigt)" : "fehlt"} />
          <Row ok={c.stripeLiveEvents > 0} label="Gültig signiertes Live-Event verarbeitet" detail={`${c.stripeLiveEvents} Live-Events`} />
        </ul>
        <p className="mt-3 text-sm text-ink-muted">Zahlungsarten: Die Kasse zeigt automatisch alle Zahlungsarten, die in deinem Stripe-Konto aktiviert sind (Karte, Apple Pay, Google Pay, SEPA, PayPal …). SEPA wird erst nach Zahlungseingang ausgeliefert.</p>
        {data.disputes.length > 0 && (
          <div role="alert" className="mt-4 rounded-md border-2 border-danger p-3">
            <p className="font-medium text-danger">Streitfälle / Rückbuchungen</p>
            <ul className="mt-1 text-sm">{data.disputes.map((d) => <li key={d.id}><span className="font-mono">{d.id.slice(0, 8)}</span> · {d.dispute_status} · Frist {d.dispute_due_by ? new Date(d.dispute_due_by).toLocaleDateString("de-DE") : "unbekannt"}</li>)}</ul>
            <p className="mt-1 text-xs text-ink-muted">Keine automatische Aktion. Bitte im Stripe-Dashboard beantworten.</p>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="text-xl">Kaufbeleg / Rechnung</h2>
        <p className="mt-1 text-sm text-ink-muted">Stripe verschickt den Zahlungsbeleg, wenn „Erfolgreiche Zahlungen“ in den Stripe-Kunden-E-Mails aktiviert ist. Unsere Bestellung enthält Bestellnummer, Netto, MwSt. und Brutto. Keine Rechtsberatung.</p>
        <ul className="mt-2 divide-y divide-line">
          {[["Firmenname", data.company?.["company_name"]], ["Anschrift", [data.company?.["street"], data.company?.["zip"], data.company?.["city"]].filter(Boolean).join(", ")], ["USt-IdNr.", data.company?.["vat_id"]], ["Bestellnummer", "wird je Bestellung vergeben"], ["Netto / MwSt. 19 % / Brutto", "aus der Bestellung"]].map(([l, v]) => (
            <Row key={l} ok={Boolean(v)} label={String(l)} detail={v ? String(v) : "fehlt"} />
          ))}
        </ul>
        {data.receiptGaps.length > 0 && <p className="mt-2 text-sm text-danger">Lücken: {data.receiptGaps.join(", ")}</p>}
        <p className="mt-2 text-sm text-ink-muted">Hinweis: Eine eigene Rechnung als PDF erstellt der Shop derzeit nicht. Netto/MwSt. erscheinen nur auf dem Stripe-Beleg, wenn du dort die Rechnungsstellung aktivierst.</p>
      </section>

      <section className={card}>
        <h2 className="text-xl">Testkauf (Live)</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>Shop bleibt aus. Melde dich als Admin an – nur Admins können bei ausgeschaltetem Shop bestellen.</li>
          <li>Wähle den kleinsten Tarif{data.smallestPlan ? `: ${data.smallestPlan.name} für ${data.smallestPlan.price.toFixed(2).replace(".", ",")} €` : ""} und zahle mit einer echten Karte.</li>
          <li>Prüfe: Bestellung unter <Link to="/admin/orders" className="text-primary underline">Bestellungen</Link> wird „bezahlt“, dann „geliefert“; die E-Mail „Deine eSIM ist bereit“ kommt an; der Link öffnet die Installationsseite.</li>
          <li>Unter <Link to="/admin/logs" className="text-primary underline">Logs</Link> erscheint ein Stripe-Live-Event als verarbeitet (Checklisten-Punkt wird grün).</li>
          <li>Erstatte die Bestellung von Hand unter „Bestellungen“ (Erstatten).</li>
          <li>Kontrolliere im Stripe-Dashboard (Live) unter Zahlungen: Status „Erstattet“, Betrag stimmt.</li>
        </ol>
      </section>
    </div>
  );
}

import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Circle } from "@phosphor-icons/react";
import { checkWizardStep, confirmWizard, decideAutoRefund, runLiveSync, switchShopOn, wizardQuery } from "@/lib/wizard.functions";
import { SHOP_CONFIRM_PHRASE } from "@/lib/golive-wizard";
import { Button, Input } from "@/components/ui-kit";

const WEBHOOK_URL = "https://globesim.de/api/public/webhooks/esimerge";

function Instructions({ n }: { n: number }) {
  const li = "list-decimal space-y-1 pl-5 text-sm";
  switch (n) {
    case 1: return <ol className={li}><li>Im eSIMerge-Portal: Developers → API Keys → Live-Schlüssel (beginnt mit esm_sk_live_) kopieren.</li><li>Im Chat öffnet sich der Secrets-Dialog für ESIMERGE_API_KEY – dort einfügen, nie in den Chat.</li><li>Hier „Prüfen“ drücken. Sandbox-Schlüssel werden abgelehnt.</li></ol>;
    case 2: return <ol className={li}><li>Portal: Developers → Webhooks → New endpoint.</li><li>URL: <span className="font-mono">{WEBHOOK_URL}</span>, Modus Live, alle Events auswählen, speichern.</li><li>Das angezeigte Geheimnis in den Secrets-Dialog ESIMERGE_WEBHOOK_SECRET_LIVE eintragen.</li><li>Im Portal beim neuen Endpunkt „Send test“ drücken, dann hier „Prüfen“ (bis zu 2 Minuten wiederholen).</li><li>Den alten Sandbox-Endpunkt im Portal löschen und unten bestätigen.</li></ol>;
    case 3: return <p className="text-sm">„Live-Sync starten“ holt den Live-Katalog. Tarife, die dort fehlen, werden deaktiviert (nicht gelöscht). Neue Tarife bleiben unsichtbar, bis du sie unter „Preise“ freigibst. Preise und Margen änderst nur du.</p>;
    case 4: return <p className="text-sm">Sandbox-Bestellungen und -Events sind in „Bestellungen“ und „Logs“ standardmäßig ausgeblendet (Häkchen bzw. Filter „Nur Sandbox/Test“ zeigt sie). Das Sandbox-Banner erscheint nur mit Sandbox-Schlüssel.</p>;
    case 5: return <ol className={li}><li>Stripe (Live) → Einstellungen → Zahlungsarten: Karte, Apple Pay, Google Pay, SEPA-Lastschrift, PayPal (falls angeboten) aktivieren.</li><li>Entwickler → Webhooks → Endpunkt mit „/api/public/payments/webhook?env=live“: Events checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, payment_intent.succeeded, payment_intent.payment_failed, charge.refunded, charge.dispute.created – fehlende hinzufügen. Den Endpunkt bei api.lovable.dev nicht löschen.</li><li>Einstellungen → Kunden-E-Mails: „Erfolgreiche Zahlungen“ und „Erstattungen“ einschalten.</li><li>Einstellungen → Unternehmen: Bankkonto und Firmenangaben kontrollieren.</li></ol>;
    case 6: return <p className="text-sm">Unten unter „E-Mail“: Test-E-Mail senden, darauf antworten. Ob die Antwort bei support@globesim.de ankommt, kann ich nicht sehen – bitte dort bestätigen.</p>;
    case 7: return <ol className={li}><li><strong>Hinweis:</strong> Echte Zahlung über Stripe Live und echtes Guthaben bei eSIMerge nötig.</li><li>Als Admin den kleinsten Tarif kaufen (Shop bleibt aus, Admins dürfen bestellen).</li><li>„Prüfen“: Bestellung, order.issued, Installationsdaten, E-Mail, Einkaufspreis.</li><li>Unter „Bestellungen“ von Hand erstatten, dann erneut „Prüfen“.</li></ol>;
    case 8: return <p className="text-sm">Wenn eSIMerge eine Bestellung eindeutig als fehlgeschlagen bestätigt und keine Installationsdaten ausgegeben wurden, erstattet der Shop die Zahlung nach 30 Minuten vollständig. Bei unklarem Ausgang oder „muss geprüft werden“ passiert nichts automatisch. Ist sie aus, erstattest du solche Fälle selbst unter „Bestellungen“.</p>;
    case 9: return <p className="text-sm">Erst wenn alle Punkte grün sind und du ausdrücklich bestätigst, wird der Shop eingeschaltet. Danach 15 Minuten Beobachtung.</p>;
  }
  return null;
}

export function GoLiveWizard() {
  const { data } = useSuspenseQuery(wizardQuery());
  const qc = useQueryClient();
  const check = useServerFn(checkWizardStep);
  const confirm = useServerFn(confirmWizard);
  const decide = useServerFn(decideAutoRefund);
  const sync = useServerFn(runLiveSync);
  const shopOn = useServerFn(switchShopOn);
  const firstOpen = data.steps.find((s) => !s.doneAt)?.n ?? 9;
  const [cur, setCur] = useState(firstOpen);
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const step = data.steps[cur - 1]!;
  const doneCount = data.steps.filter((s) => s.doneAt).length;
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } finally { setBusy(false); refresh(); } };

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl">Go-Live-Assistent</h2>
        <p className="text-sm text-ink-muted">{doneCount} von {data.steps.length} erledigt</p>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-line" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={data.steps.length}>
        <div className="h-2 rounded-full bg-primary" style={{ width: `${(doneCount / data.steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 flex flex-wrap gap-2">
        {data.steps.map((s) => (
          <li key={s.n}>
            <button type="button" onClick={() => setCur(s.n)} className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${s.n === cur ? "border-primary" : "border-line"}`}>
              {s.doneAt ? <CheckCircle size={14} weight="fill" className="text-mint" /> : <Circle size={14} className="text-ink-muted" />} {s.n}. {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-md border border-line p-4">
        <p className="text-sm text-ink-muted">Schritt {step.n} von {data.steps.length}</p>
        <h3 className="text-lg">{step.title}</h3>
        <div className="mt-3"><Instructions n={step.n} /></div>

        {step.n === 2 && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(data.confirmations["sandbox_endpoint_removed"])} onChange={(e) => run(() => confirm({ data: { key: "sandbox_endpoint_removed", value: e.target.checked } }))} /> Alter Sandbox-Endpunkt im Portal ist gelöscht</label>}
        {step.n === 5 && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(data.confirmations["stripe_dashboard"])} onChange={(e) => run(() => confirm({ data: { key: "stripe_dashboard", value: e.target.checked } }))} /> Klickliste im Stripe-Dashboard erledigt</label>}
        {step.n === 3 && (
          <div className="mt-3 space-y-2">
            <Button variant="secondary" loading={busy} onClick={() => run(async () => { const r = await sync(); if (r.status === "rejected") toast.error(r.message ?? "abgelehnt"); else toast.success(`Sync: ${r.status} · ${r.added} neu, ${r.updated} aktualisiert, ${r.deactivated} deaktiviert`); })}>Live-Sync starten</Button>
            <p className="text-sm">Aktive Tarife: {data.facts.catalog.activePlans} · Länder/Regionen: {data.facts.catalog.countries} · ohne Preis: {data.facts.catalog.unpriced} · ohne Marge: {data.facts.catalog.noMargin}</p>
            <p className="text-sm text-ink-muted">Stichprobe Türkei, Ägypten, USA, VAE, Saudi-Arabien und Freigabe neuer Tarife: Admin → Preise → Prüfliste.</p>
            {data.facts.catalog.noMargin > 0 && <p className="text-sm">Vorschlag: eine Margenregel für die betroffenen Länder oder Tariftypen unter „Preise“ anlegen. Ich ändere nichts ohne dein OK.</p>}
          </div>
        )}
        {step.n === 8 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" loading={busy} onClick={() => run(() => decide({ data: { enabled: false } }))}>Aus lassen</Button>
            <Button loading={busy} onClick={() => run(() => decide({ data: { enabled: true } }))}>Einschalten</Button>
            <p className="w-full text-sm text-ink-muted">Aktuell: {data.facts.autoRefund.enabled ? "an" : "aus"}{data.facts.autoRefund.decided ? "" : " (noch nicht entschieden)"}</p>
          </div>
        )}
        {step.n === 9 && (
          <div className="mt-3 space-y-2">
            {data.facts.shopMissing.length > 0 ? <ul className="list-disc pl-5 text-sm text-danger">{data.facts.shopMissing.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="text-sm text-mint">Alle Punkte der Shop-Checkliste sind grün.</p>}
            {!data.facts.shopEnabled && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm">Zur Bestätigung „{SHOP_CONFIRM_PHRASE}“ eintippen<Input value={phrase} onChange={(e) => setPhrase(e.target.value)} className="mt-1" /></label>
                <Button disabled={data.facts.shopMissing.length > 0 || phrase !== SHOP_CONFIRM_PHRASE} loading={busy} onClick={() => run(async () => { const r = await shopOn({ data: { confirmation: phrase } }); if (r.ok) toast.success("Shop eingeschaltet. Beobachtung läuft 15 Minuten."); else toast.error(`Nicht eingeschaltet: ${r.missing.join(", ")}`); })}>Shop jetzt einschalten</Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-md border border-line p-3 text-sm">
          <p className="font-medium">Geprüft: {step.result.checked.join(", ")}</p>
          <p className={`mt-1 flex items-center gap-2 ${step.result.ok ? "text-mint" : "text-danger"}`}>
            {step.result.ok ? <CheckCircle size={18} weight="fill" /> : <XCircle size={18} weight="fill" />}
            {step.result.ok ? "grün" : `rot: ${step.result.reason}`}
          </p>
          <p className="mt-1 text-ink-muted">Als Nächstes: {step.result.next}</p>
          {step.doneAt && <p className="mt-1 text-ink-muted">Abgehakt am {new Date(step.doneAt).toLocaleString("de-DE")}</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button loading={busy} onClick={() => run(async () => { const r = await check({ data: { step: step.n } }); if (r.ok) { toast.success("grün – Schritt abgehakt"); if (cur < data.steps.length) setCur(cur + 1); } else toast.error(`rot: ${r.reason}`); })}>Prüfen</Button>
          {cur > 1 && <Button variant="secondary" onClick={() => setCur(cur - 1)}>Zurück</Button>}
          {cur < data.steps.length && <Button variant="secondary" onClick={() => setCur(cur + 1)}>Weiter ansehen</Button>}
        </div>
      </div>

      {data.observe && (
        <div role="status" className="mt-6 rounded-md border-2 border-primary p-4 text-sm">
          <p className="font-medium">Beobachtungsmodus bis {new Date(data.observe.until).toLocaleTimeString("de-DE")}</p>
          <p>Neue Bestellungen: {data.observe.orders}</p>
          {data.observe.errors.length ? <ul className="mt-1 list-disc pl-5 text-danger">{data.observe.errors.map((e, i) => <li key={i}>{new Date(e.at).toLocaleTimeString("de-DE")} · {e.action} {e.message}</li>)}</ul> : <p className="text-ink-muted">Keine Fehler oder Warnungen bisher.</p>}
        </div>
      )}
    </section>
  );
}

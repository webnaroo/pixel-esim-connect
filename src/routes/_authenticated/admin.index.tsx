import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Warning } from "@phosphor-icons/react";
import { adminOverviewQuery, runSyncNow, setShopEnabled, setSyncEnabled } from "@/lib/admin.functions";
import { Button } from "@/components/ui-kit";
import { Chip } from "@/components/brand";
import { AdminError } from "./admin";
import { ComparisonRecheckHint } from "@/components/admin-comparison";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => privateHead("Admin-Übersicht", "Shop-Checkliste und Katalogstatus im GlobeSIM-Admin."),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminOverviewQuery()),
  errorComponent: AdminError,
  component: Overview,
});

const STATUS_LABEL: Record<string, string> = {
  ok: "OK", ok_with_warnings: "OK mit Hinweisen", aborted_threshold: "Abgebrochen (50 %-Schutz)", failed: "Fehler", skipped: "Übersprungen", running: "Läuft",
};

function Row({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      {ok ? <CheckCircle size={22} className="shrink-0 text-mint" weight="fill" /> : <XCircle size={22} className="shrink-0 text-danger" weight="fill" />}
      <div>
        <p className="font-medium">{label}</p>
        {detail && <p className="text-sm text-ink-muted">{detail}</p>}
      </div>
    </li>
  );
}

function Overview() {
  const { data } = useSuspenseQuery(adminOverviewQuery());
  const qc = useQueryClient();
  const toggleShop = useServerFn(setShopEnabled);
  const toggleSync = useServerFn(setSyncEnabled);
  const sync = useServerFn(runSyncNow);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "overview"] });
  const c = data.checklist;
  const latestAbort = data.runs.find((r) => r.status === "aborted_threshold");
  const latest = data.runs[0];

  async function onShop() {
    setBusy("shop");
    const r = await toggleShop({ data: { enabled: !data.shopEnabled } });
    setBusy(null);
    if (!r.ok) toast.error(`Shop kann nicht aktiviert werden. Offen: ${r.missing.join(", ")}`);
    else toast.success(data.shopEnabled ? "Shop deaktiviert." : "Shop aktiviert.");
    refresh();
  }
  async function onSync() {
    setBusy("sync");
    const r = await sync();
    setBusy(null);
    if (r.status === "ok") toast.success(`Sync fertig: ${r.added} neu, ${r.updated} aktualisiert, ${r.deactivated} deaktiviert.`);
    else toast.warning(r.message ?? STATUS_LABEL[r.status] ?? r.status);
    refresh();
  }

  const lastStats = (latest?.stats ?? null) as { plans?: number; data?: number; unlimited?: number; missingFx?: string[] } | null;
  const lastUnmapped = (latest?.unmapped ?? []) as { providerPlanId: string | null; reason: string }[];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {data.provider.sandbox && (
        <div role="alert" className="flex gap-3 rounded-lg border-2 border-warning bg-surface p-4 lg:col-span-2">
          <Warning size={22} className="shrink-0 text-warning" weight="fill" />
          <div>
            <p className="font-medium">eSIMerge Sandbox, es werden keine echten eSIMs geliefert</p>
            <p className="text-sm text-ink-muted">Der Shop lässt sich mit einem Sandbox-Zugang nicht aktivieren. Nur Admins können Testbestellungen aufgeben.</p>
          </div>
        </div>
      )}
      <ComparisonRecheckHint />
      {!c.fxValid || lastStats?.missingFx?.length ? (
        <div role="alert" className="flex gap-3 rounded-lg border border-warning bg-surface p-4 lg:col-span-2">
          <Warning size={22} className="shrink-0 text-warning" weight="fill" />
          <div>
            <p className="font-medium">Kein gültiger Wechselkurs{lastStats?.missingFx?.length ? `: ${lastStats.missingFx.map((x) => `${x} → EUR`).join(", ")}` : ""}</p>
            <p className="text-sm text-ink-muted">Ohne Kurs wird kein Preis angezeigt. Die Tarife bleiben unsichtbar, bis ein gültiger Kurs vorliegt. Unter „Preise“ kannst du jetzt aktualisieren.</p>
          </div>
        </div>
      ) : null}
      {latestAbort && latest?.id === latestAbort.id && (
        <div role="alert" className="flex gap-3 rounded-lg border border-warning bg-surface p-4 lg:col-span-2">
          <Warning size={22} className="shrink-0 text-warning" weight="fill" />
          <div>
            <p className="font-medium">Letzter Katalog-Sync wurde abgebrochen</p>
            <p className="text-sm text-ink-muted">{latestAbort.error}</p>
          </div>
        </div>
      )}

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl">Shop-Checkliste</h2>
        <ul className="mt-2 divide-y divide-line">
          <Row ok={c.providerReachable} label="Provider erreichbar" detail={c.providerMessage} />
          <Row ok={!c.providerSandbox} label="eSIMerge-Zugang" detail={data.provider.apiKeySet ? (c.providerSandbox ? "Sandbox (keine echten eSIMs)" : "Live") : "nicht gesetzt"} />
          <Row ok={c.catalogCount > 0} label="Katalog größer 0" detail={`${c.catalogCount} aktive Tarife`} />
          <Row ok={c.stripeConfigured} label="Stripe konfiguriert" detail={c.stripeConfigured ? "Schlüssel gesetzt" : "Stripe-Schlüssel nicht gesetzt"} />
          <Row ok={!!c.emailVerified} label="E-Mail-Absender-Domain" detail={c.emailVerified ? "Verifiziert" : "Nicht verifiziert: keine Mails an Kunden"} />
          <Row ok={!!c.fxValid} label="Wechselkurs aktuell" detail={c.fxValid ? "Gültiger Kurs USD→EUR" : "Kein gültiger Kurs: Tarife ohne Preis (Admin › Preise)"} />
          <Row ok={!!c.legalPublished} label="Rechtsseiten freigegeben" detail={c.legalPublished ? "Alle freigegeben" : "Noch Platzhalter (Admin › Inhalte)"} />
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Chip tone={data.shopEnabled ? "active" : "muted"}>{data.shopEnabled ? "Shop aktiv" : "Shop aus"}</Chip>
          <Button
            variant={data.shopEnabled ? "secondary" : "primary"}
            loading={busy === "shop"}
            disabled={!data.shopEnabled && data.missing.length > 0}
            onClick={onShop}
          >
            {data.shopEnabled ? "Shop deaktivieren" : "Shop aktivieren"}
          </Button>
        </div>
        {!data.shopEnabled && data.missing.length > 0 && <p className="mt-2 text-sm text-ink-muted">Erst möglich, wenn alle Punkte grün sind.</p>}
      </section>

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl">eSIMerge-Anbindung</h2>
        <ul className="mt-2 divide-y divide-line">
          <Row ok={data.provider.baseUrlSet} label="ESIMERGE_BASE_URL" detail={data.provider.baseUrlSet ? "gesetzt" : "nicht gesetzt"} />
          <Row ok={data.provider.apiKeySet} label="ESIMERGE_API_KEY" detail={data.provider.apiKeySet ? "gesetzt" : "nicht gesetzt"} />
          <Row ok label="Webhooks" detail="eSIMerge sendet keine Webhooks – Status wird alle 5 Minuten abgefragt" />
          <Row ok={data.provider.configMissing.length === 0} label="Endpunkte & Auth" detail={data.provider.configMissing.length ? `Offen: ${data.provider.configMissing.join(", ")}` : "vollständig"} />
          <Row ok={data.provider.mappingReady} label="Feld-Mapping" detail={data.provider.mappingReady ? "fertig (anhand echter Sandbox-Antworten)" : "wartet auf API-Doku"} />
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl">Katalog-Sync</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={busy === "auto"} onClick={async () => { setBusy("auto"); await toggleSync({ data: { enabled: !data.syncEnabled } }); setBusy(null); refresh(); }}>
              Automatisch: {data.syncEnabled ? "an" : "aus"}
            </Button>
            <Button loading={busy === "sync"} onClick={onSync}>Jetzt synchronisieren</Button>
          </div>
        </div>
        {data.runs.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Noch kein Sync gelaufen.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm tabular">
              <thead className="text-ink-muted">
                <tr><th className="py-2 pr-4 font-medium">Start</th><th className="pr-4 font-medium">Status</th><th className="pr-4 font-medium">Neu</th><th className="pr-4 font-medium">Aktualisiert</th><th className="pr-4 font-medium">Deaktiviert</th><th className="font-medium">Hinweis</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.runs.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.started_at).toLocaleString("de-DE")}</td>
                    <td className="pr-4 whitespace-nowrap"><Chip tone={r.status === "ok" ? "active" : r.status === "aborted_threshold" || r.status === "failed" ? "warning" : "muted"}>{STATUS_LABEL[r.status] ?? r.status}</Chip></td>
                    <td className="pr-4">{r.plans_added}</td>
                    <td className="pr-4">{r.plans_updated}</td>
                    <td className="pr-4">{r.plans_deactivated}</td>
                    <td className="text-ink-muted">{r.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lastStats && (
          <p className="mt-4 text-sm text-ink-muted">
            Letzter Lauf: {lastStats.plans ?? 0} Tarife zugeordnet ({lastStats.data ?? 0} Datenpakete, {lastStats.unlimited ?? 0} Unlimited), {lastUnmapped.length} nicht zuordenbar.
          </p>
        )}
        {lastUnmapped.length > 0 && (
          <div className="mt-3 rounded-md border border-warning p-3">
            <p className="text-sm font-medium">Nicht zuordenbare Tarife</p>
            <ul className="mt-1 text-sm text-ink-muted">
              {lastUnmapped.map((u, i) => <li key={i}><span className="font-mono">{u.providerPlanId ?? "ohne ID"}</span>: {u.reason}</li>)}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

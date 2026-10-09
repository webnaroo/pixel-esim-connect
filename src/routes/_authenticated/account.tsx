import { EsimInstallPanel } from "@/components/esim-install-panel";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { SiteLayout, signOut } from "@/components/layout";
import { Chip, EmptyState, ErrorBox } from "@/components/brand";
import { Button, Input, SegmentedControl } from "@/components/ui-kit";
import { UnlimitedLabel, UnlimitedNote } from "@/components/unlimited-claim";
import { deleteMyAccount, getMyInstallData, myAccountQuery, updateMyProfile } from "@/lib/account.functions";
import { getEsimUsage } from "@/lib/usage.functions";
import { formatPrice } from "@/lib/format";
import { DELETE_CONFIRM_WORD } from "@/lib/anonymize";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: (search: Record<string, unknown>): { tab?: "esims" | "orders" | "settings" } => {
    const tab = search["tab"];
    return tab === "orders" || tab === "settings" || tab === "esims" ? { tab } : {};
  },
  head: () => ({
    meta: [
      { title: "Mein Konto | GlobeSIM" },
      { name: "description", content: "Deine eSIMs, Bestellungen und Einstellungen bei GlobeSIM." },
      { property: "og:title", content: "Mein Konto | GlobeSIM" },
      { property: "og:description", content: "Deine eSIMs, Bestellungen und Einstellungen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Account,
});

type Tab = "esims" | "orders" | "settings";
type Data = Awaited<ReturnType<typeof import("@/lib/account.functions").getMyAccount>>;

const STATUS_DE: Record<string, string> = { pending: "Offen", paid: "Bezahlt", fulfilling: "Wird eingerichtet", fulfilled: "Geliefert", fulfillment_failed: "Fehlgeschlagen", refunded: "Erstattet", cancelled: "Abgebrochen", payment_mismatch: "In Prüfung", needs_review: "In Prüfung" };

function Account() {
  const { tab: initialTab } = Route.useSearch();
  const [tab, setTab] = useState<Tab>(initialTab ?? "esims");
  const q = useQuery(myAccountQuery());
  return (
    <SiteLayout>
      <section className="container-page max-w-3xl pb-20 pt-8">
        <h1 className="text-3xl">Mein Konto</h1>
        <div className="mt-6">
          <SegmentedControl label="Kontobereich" value={tab} onChange={setTab} options={[{ value: "esims", label: "Meine eSIMs" }, { value: "orders", label: "Bestellungen" }, { value: "settings", label: "Einstellungen" }]} />
        </div>
        <div className="mt-8">
          {q.error ? <ErrorBox message="Konto konnte nicht geladen werden." onRetry={() => q.refetch()} /> : !q.data ? <p className="text-ink-muted">Wird geladen …</p> : tab === "esims" ? <Esims data={q.data} /> : tab === "orders" ? <Orders data={q.data} /> : <Settings data={q.data} />}
        </div>
      </section>
    </SiteLayout>
  );
}

function planTitle(p: Data["orders"][number]["plan"]) {
  return [p.destination, p.type === "unlimited" ? null : p.data_mb ? `${p.data_mb >= 1024 ? `${Math.round(p.data_mb / 102.4) / 10} GB` : `${p.data_mb} MB`}` : null, p.validity_days ? `${p.validity_days} Tage` : null].filter(Boolean).join(" · ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}

function daysLeft(iso: string | null) {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return d;
}

function Esims({ data }: { data: Data }) {
  if (!data.esims.length) return <EmptyState title="Noch keine eSIMs">Sobald du eine eSIM kaufst, erscheint sie hier.</EmptyState>;
  return (
    <ul className="space-y-4">
      {data.esims.map((e) => <EsimCard key={e.orderId} e={e} />)}
    </ul>
  );
}

function EsimCard({ e }: { e: Data["esims"][number] }) {
  const usageFn = useServerFn(getEsimUsage);
  const installFn = useServerFn(getMyInstallData);
  const [usage, setUsage] = useState(e.usage);
  const [install, setInstall] = useState<Awaited<ReturnType<typeof getMyInstallData>> | undefined>(undefined);
  const left = daysLeft(e.expiresAt);
  useEffect(() => {
    if (!e.usageAvailable) return;
    usageFn({ data: { orderId: e.orderId } }).then((r) => r.ok && setUsage(r.usage)).catch(() => {});
  }, [e.orderId, e.usageAvailable, usageFn]);
  const pct = usage?.totalMb ? Math.min(100, Math.round((usage.usedMb / usage.totalMb) * 100)) : null;
  return (
    <li className="rounded-[14px] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-ink">
            {e.plan.type === "unlimited" ? <UnlimitedLabel throttleClaim={e.plan.throttle_claim} /> : null} {planTitle(e.plan)}
          </div>
          {e.plan.type === "unlimited" && <UnlimitedNote throttleClaim={e.plan.throttle_claim} />}
          {e.iccidTail && <div className="mt-1 text-xs text-ink-muted">ICCID endet auf {e.iccidTail}</div>}
        </div>
        <Chip tone={e.status === "ready" || e.status === "active" ? "active" : "default"}>{e.status === "ready" ? "Bereit" : e.status === "active" ? "Aktiv" : e.status === "expired" ? "Abgelaufen" : e.status}</Chip>
      </div>
      {e.usageThreshold ? <p className="mt-3 text-sm text-ink">{e.usageThreshold >= 100 ? "Dein Datenvolumen ist aufgebraucht." : `${e.usageThreshold} % deines Datenvolumens sind verbraucht.`}</p> : null}
      {pct !== null && usage && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Datenverbrauch">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-muted">{Math.round(usage.usedMb)} MB von {usage.totalMb} MB verbraucht</p>
        </div>
      )}
      <div className="mt-4">
        {install === undefined ? (
          <Button variant="secondary" onClick={() => installFn({ data: { orderId: e.orderId } }).then(setInstall).catch(() => setInstall(null))}>Installationsdaten anzeigen</Button>
        ) : install === null || !install.lpa ? (
          <p className="text-sm text-ink-muted">Installationsdaten sind noch nicht verfügbar.</p>
        ) : (
          <EsimInstallPanel data={{ ...install, lpa: install.lpa!, validityDays: e.plan.validity_days ?? null, activatedAt: e.activatedAt, installUntil: e.expiresAt }} />
        )}
      </div>
    </li>
  );
}

function Orders({ data }: { data: Data }) {
  if (!data.orders.length) return <EmptyState title="Noch keine Bestellungen" />;
  return (
    <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">
      {data.orders.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
          <div>
            <div className="font-medium text-ink">{o.plan.type === "unlimited" ? <UnlimitedLabel throttleClaim={o.plan.throttle_claim} /> : null} {planTitle(o.plan)}</div>
            <div className="text-xs text-ink-muted">{new Date(o.created_at).toLocaleDateString("de-DE")} · Nr. {o.id.slice(0, 8)}{o.email_status === "pending_domain" ? " · E-Mail ausstehend" : ""}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="tabular text-sm">{formatPrice(o.amount, o.currency)}</span>
            <Chip>{STATUS_DE[o.status] ?? o.status}</Chip>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Settings({ data }: { data: Data }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const save = useServerFn(updateMyProfile);
  const del = useServerFn(deleteMyAccount);
  const [name, setName] = useState(data.profile.name ?? "");
  const [locale, setLocale] = useState<"de" | "en">(data.profile.locale === "en" ? "en" : "de");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null);
    try { setMsg({ ok: true, text: await fn() }); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Fehler" }); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-10">
      {msg && (msg.ok ? <p role="status" className="text-sm text-success">{msg.text}</p> : <ErrorBox message={msg.text} />)}
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await save({ data: { name, locale } }); await qc.invalidateQueries({ queryKey: ["account"] }); return "Gespeichert."; }); }}>
        <h2 className="text-xl">Profil</h2>
        <p className="text-sm text-ink-muted">E-Mail: {data.profile.email}</p>
        <label className="block text-sm font-medium">Name<Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label className="block text-sm font-medium">Sprache
          <select className="mt-1 h-12 w-full rounded-md border border-line bg-surface px-3" value={locale} onChange={(e) => setLocale(e.target.value as "de" | "en")}>
            <option value="de">Deutsch</option><option value="en">English</option>
          </select>
        </label>
        <Button type="submit" loading={busy}>Speichern</Button>
      </form>

      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { if (pw.length < 8) throw new Error("Mindestens 8 Zeichen."); const { error } = await supabase.auth.updateUser({ password: pw }); if (error) throw new Error("Passwort konnte nicht geändert werden."); setPw(""); return "Passwort geändert."; }); }}>
        <h2 className="text-xl">Passwort ändern</h2>
        <label className="block text-sm font-medium">Neues Passwort<Input className="mt-1" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
        <Button type="submit" variant="secondary" loading={busy}>Passwort ändern</Button>
      </form>

      <Button variant="secondary" onClick={async () => { await signOut(); nav({ to: "/" }); }}>Abmelden</Button>

      <form className="space-y-3 rounded-[14px] border border-line p-5" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await del({ data: { confirm } }); if (!r.ok) throw new Error(r.error); await signOut(); nav({ to: "/" }); return "Konto gelöscht."; }); }}>
        <h2 className="text-xl">Konto löschen</h2>
        <p className="text-sm text-ink-muted">Dein Login und deine Profildaten werden gelöscht. Bestellungen müssen wir aus steuerlichen Gründen aufbewahren. Sie werden anonymisiert und sind danach nicht mehr mit dir verknüpft. Installationsdaten deiner eSIMs werden gelöscht.</p>
        <label className="block text-sm font-medium">Tippe {DELETE_CONFIRM_WORD} zur Bestätigung<Input className="mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label>
        <Button type="submit" variant="secondary" disabled={confirm.trim() !== DELETE_CONFIRM_WORD} loading={busy}>Konto endgültig löschen</Button>
      </form>
    </div>
  );
}

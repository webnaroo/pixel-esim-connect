import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Warning } from "@phosphor-icons/react";
import { devicesAdminQuery, importDevices, saveDevice, setDeviceActive } from "@/lib/devices.functions";
import { deviceKey, isStale, matchesDevice, oldestCheck, previewImport, type Device, type ImportPreview } from "@/lib/devices";
import { Button, Input } from "@/components/ui-kit";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/devices")({
  head: () => privateHead("Geräte", "eSIM-Geräteliste im GlobeSIM-Admin pflegen."),
  loader: ({ context }) => context.queryClient.ensureQueryData(devicesAdminQuery()),
  errorComponent: AdminError,
  component: DevicesAdmin,
});

type Form = { id?: string; manufacturer: string; model: string; release_year: string; esim_supported: boolean; notes: string; source_url: string; checked_at: string };
const blank = (): Form => ({ manufacturer: "", model: "", release_year: "", esim_supported: true, notes: "", source_url: "", checked_at: new Date().toISOString().slice(0, 10) });
const fmt = (d: string) => new Date(d).toLocaleDateString("de-DE");

function DevicesAdmin() {
  const { data } = useSuspenseQuery(devicesAdminQuery());
  const qc = useQueryClient();
  const save = useServerFn(saveDevice);
  const setActive = useServerFn(setDeviceActive);
  const doImport = useServerFn(importDevices);
  const [q, setQ] = useState("");
  const [mfr, setMfr] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "devices"] }); qc.invalidateQueries({ queryKey: ["esim-devices"] }); };

  const manufacturers = useMemo(() => [...new Set(data.map((d) => d.manufacturer))].sort((a, b) => a.localeCompare(b, "de")), [data]);
  const rows = data.filter((d) => (!mfr || d.manufacturer === mfr) && matchesDevice(d, q) !== false);
  const oldest = oldestCheck(data.filter((d) => d.active));
  const stale = data.filter((d) => d.active && isStale(d.checked_at)).length;

  async function onSave() {
    if (!form) return;
    setBusy(true);
    try {
      await save({ data: { id: form.id, device: { ...form, release_year: form.release_year || null } } });
      toast.success("Gespeichert."); setForm(null); refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function onFile(f: File | undefined) {
    if (!f) return;
    setPreview(previewImport(await f.text(), new Set(data.map((d) => deviceKey(d.manufacturer, d.model)))));
  }
  async function onImport() {
    if (!preview?.valid.length) return;
    setBusy(true);
    try {
      const r = await doImport({ data: { rows: preview.valid.map((v) => v.value) } });
      toast.success(`${r.inserted} importiert${r.skipped.length ? `, ${r.skipped.length} Doppelte übersprungen` : ""}.`);
      setPreview(null); refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Geräte</h2>
          <p className="text-sm text-ink-muted">{data.filter((d) => d.active).length} aktiv · älteste Prüfung: {oldest ? fmt(oldest) : "–"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-12 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium">
            CSV importieren<input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <Button onClick={() => setForm(blank())}>Gerät hinzufügen</Button>
        </div>
      </div>

      {stale > 0 && (
        <div role="alert" className="flex gap-2 rounded-lg border border-line border-l-4 border-l-warning bg-surface p-4 text-sm">
          <Warning size={18} aria-hidden className="shrink-0" /> {stale} Einträge wurden vor mehr als 12 Monaten geprüft. Bitte Quelle erneut prüfen.
        </div>
      )}

      {preview && (
        <section className="space-y-3 rounded-lg border border-line bg-surface p-4 text-sm">
          <h3 className="font-semibold">CSV-Vorschau</h3>
          <p>{preview.valid.length} gültig · {preview.duplicates.length} doppelt (werden übersprungen) · {preview.errors.length} fehlerhaft</p>
          {preview.errors.length > 0 && <ul className="list-disc pl-5 text-danger">{preview.errors.map((e) => <li key={`e${e.line}`}>Zeile {e.line}: {e.error}</li>)}</ul>}
          {preview.duplicates.length > 0 && <ul className="list-disc pl-5 text-ink-muted">{preview.duplicates.map((d) => <li key={`d${d.line}`}>Zeile {d.line}: {d.label} ist schon vorhanden</li>)}</ul>}
          {preview.valid.length > 0 && (
            <div className="max-h-64 overflow-auto"><table className="w-full text-left"><thead><tr className="text-ink-muted"><th>Hersteller</th><th>Modell</th><th>Jahr</th><th>eSIM</th><th>Geprüft</th></tr></thead>
              <tbody>{preview.valid.map((v) => <tr key={v.line}><td>{v.value.manufacturer}</td><td>{v.value.model}</td><td>{v.value.release_year ?? "–"}</td><td>{v.value.esim_supported ? "ja" : "nein"}</td><td>{fmt(v.value.checked_at)}</td></tr>)}</tbody></table></div>
          )}
          <div className="flex gap-2"><Button onClick={onImport} loading={busy} disabled={!preview.valid.length}>{preview.valid.length} speichern</Button><Button variant="secondary" onClick={() => setPreview(null)}>Abbrechen</Button></div>
        </section>
      )}

      {form && (
        <section className="grid gap-3 rounded-lg border border-line bg-surface p-4 text-sm sm:grid-cols-2">
          <h3 className="font-semibold sm:col-span-2">{form.id ? "Gerät bearbeiten" : "Gerät hinzufügen"}</h3>
          <label>Hersteller<Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></label>
          <label>Modell<Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label>
          <label>Erscheinungsjahr (optional)<Input inputMode="numeric" value={form.release_year} onChange={(e) => setForm({ ...form, release_year: e.target.value })} /></label>
          <label>Geprüft am<Input type="date" value={form.checked_at} onChange={(e) => setForm({ ...form, checked_at: e.target.value })} /></label>
          <label className="sm:col-span-2">Quelle (Link, Pflicht)<Input value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://" /></label>
          <label className="sm:col-span-2">Hinweis<Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.esim_supported} onChange={(e) => setForm({ ...form, esim_supported: e.target.checked })} /> unterstützt eSIM</label>
          <div className="flex gap-2 sm:col-span-2"><Button onClick={onSave} loading={busy}>Speichern</Button><Button variant="secondary" onClick={() => setForm(null)}>Abbrechen</Button></div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Suchen (ab 3 Zeichen)" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={mfr} onChange={(e) => setMfr(e.target.value)} className="h-12 rounded-md border border-line-strong bg-surface px-3 text-sm" aria-label="Hersteller filtern">
          <option value="">Alle Hersteller</option>{manufacturers.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>

      {data.length === 0 ? <p className="text-sm text-ink-muted">Noch keine Geräte. Importiere deine CSV.</p> : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-surface text-ink-muted"><tr><th className="p-3">Hersteller</th><th>Modell</th><th>Jahr</th><th>eSIM</th><th>Geprüft</th><th>Status</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((d: Device) => (
                <tr key={d.id} className={d.active ? "" : "opacity-50"}>
                  <td className="p-3">{d.manufacturer}</td><td>{d.model}</td><td>{d.release_year ?? "–"}</td><td>{d.esim_supported ? "ja" : "nein"}</td>
                  <td><a href={d.source_url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary">{fmt(d.checked_at)}</a>{isStale(d.checked_at) && <span className="ml-1 text-warning" title="Älter als 12 Monate">⚠</span>}</td>
                  <td>{d.active ? "aktiv" : "deaktiviert"}</td>
                  <td className="whitespace-nowrap pr-3 text-right">
                    <button className="text-primary" onClick={() => setForm({ id: d.id, manufacturer: d.manufacturer, model: d.model, release_year: d.release_year?.toString() ?? "", esim_supported: d.esim_supported, notes: d.notes ?? "", source_url: d.source_url, checked_at: d.checked_at })}>Bearbeiten</button>
                    <button className="ml-3 text-ink-muted" onClick={async () => { await setActive({ data: { id: d.id, active: !d.active } }); refresh(); }}>{d.active ? "Deaktivieren" : "Aktivieren"}</button>
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

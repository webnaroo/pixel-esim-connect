import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Warning } from "@phosphor-icons/react";
import { decideFxReview, fxAdminQuery, refreshFxNow, setFxBuffer, setManualFx } from "@/lib/fx.functions";
import { FX_WARN_DAYS, FX_MAX_DAYS } from "@/lib/fx";
import { Button, Input } from "./ui-kit";
import { usePriceConfirmation } from "./price-change-dialog";
import { Chip } from "./brand";

const SRC: Record<string, string> = { ecb: "EZB", fallback: "Frankfurter (EZB-Daten)", manual: "Manuell" };
const LIGHT: Record<string, { dot: string; label: string }> = {
  green: { dot: "bg-success", label: "aktuell" },
  yellow: { dot: "bg-warning", label: "etwas älter" },
  red: { dot: "bg-danger", label: "veraltet" },
};
const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("de-DE") : "–");
const n = (v: number, digits = 6) => v.toLocaleString("de-DE", { maximumFractionDigits: digits });

export function FxSection() {
  const confirmation = usePriceConfirmation();
  const q = useQuery(fxAdminQuery());
  const qc = useQueryClient();
  const refresh = useServerFn(refreshFxNow);
  const decide = useServerFn(decideFxReview);
  const manual = useServerFn(setManualFx);
  const buffer = useServerFn(setFxBuffer);
  const [busy, setBusy] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const reload = () => qc.invalidateQueries({ queryKey: ["admin"] });
  if (q.error) throw q.error;
  const data = q.data;

  const run = async (f: () => Promise<void>) => { setBusy(true); try { await f(); await reload(); } catch (e) { toast.error(e instanceof Error ? e.message : "Fehler"); } finally { setBusy(false); } };

  return (
    <section className="space-y-5 rounded-lg border border-line bg-surface p-6 lg:col-span-2">
      {confirmation.dialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Wechselkurse nach EUR</h2>
          <p className="mt-1 text-sm text-ink-muted">Automatisch alle 6 Stunden von der EZB, Ausweichquelle Frankfurter (ebenfalls EZB-Daten). Ohne gültigen Kurs (älter als {FX_MAX_DAYS} Tage oder keiner) haben Tarife keinen Preis und sind unsichtbar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button loading={busy} onClick={() => run(async () => { const r = await refresh(); if (r.ok) toast.success(`Kurs aktualisiert (${SRC[r.source] ?? r.source}, Stand ${d(r.publishedAt)})`); else toast.warning(r.warning); })}>Jetzt aktualisieren</Button>
          <Button variant="secondary" onClick={() => setShowManual((v) => !v)}>Kurs manuell setzen</Button>
        </div>
      </div>

      {!data ? <p className="text-ink-muted">Wird geladen …</p> : (
        <>
          {data.pending.map((p) => (
            <div key={p.id} role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-warning p-4">
              <Warning size={22} className="shrink-0 text-warning" weight="fill" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Prüfung nötig: neuer Kurs {p.from_currency}→EUR {n(p.rate)} weicht mehr als 5 % vom letzten ab.</p>
                <p className="text-ink-muted">Quelle {SRC[p.source] ?? p.source}, Stand {d(p.published_at)}. Bis zu deiner Entscheidung gilt der bisherige Kurs.</p>
              </div>
              <Button variant="secondary" className="h-10!" loading={busy} onClick={() => run(async () => { await decide({ data: { id: p.id, accept: true } }); toast.success("Kurs übernommen."); })}>Übernehmen</Button>
              <Button variant="ghost" className="h-10!" loading={busy} onClick={() => run(async () => { await decide({ data: { id: p.id, accept: false } }); toast.success("Kurs verworfen."); })}>Verwerfen</Button>
            </div>
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            {data.current.map((c) => {
              const e = c.effective;
              return (
                <div key={c.currency} className="rounded-[14px] border border-line p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{c.currency} → EUR</span>
                    {e ? <span className="inline-flex items-center gap-2"><span aria-hidden className={`size-2.5 rounded-full ${LIGHT[e.light]?.dot}`} /> {LIGHT[e.light]?.label}</span> : <Chip tone="warning">Kein gültiger Kurs</Chip>}
                  </div>
                  {e ? (
                    <dl className="mt-3 grid grid-cols-2 gap-y-1 tabular">
                      <dt className="text-ink-muted">Quellkurs</dt><dd>{n(e.sourceRate)}</dd>
                      <dt className="text-ink-muted">Aufschlag</dt><dd>{n(e.bufferPercent, 2)} %</dd>
                      <dt className="text-ink-muted">Verwendeter Kurs</dt><dd className="font-semibold">{n(e.usedRate)}</dd>
                      <dt className="text-ink-muted">Quelle</dt><dd>{SRC[e.source] ?? e.source}</dd>
                      <dt className="text-ink-muted">Stand</dt><dd>{e.manual ? "manuell gesetzt" : d(e.publishedAt)} ({Math.floor(e.ageDays)} Tage)</dd>
                    </dl>
                  ) : <p className="mt-2 text-ink-muted">Tarife in {c.currency} haben keinen Preis und sind unsichtbar. Bitte aktualisieren.</p>}
                  {e && e.ageDays > FX_WARN_DAYS && !e.manual && <p className="mt-2 font-medium">Warnung: Kurs älter als {FX_WARN_DAYS} Tage.</p>}
                </div>
              );
            })}
          </div>

          <form className="flex flex-wrap items-end gap-3" onSubmit={(ev) => { ev.preventDefault(); const v = Number(String(new FormData(ev.currentTarget).get("buffer")).replace(",", ".")); void confirmation.request({ kind: "settings", settings: { fx_buffer_percent: v } }); }}>
            <label className="text-sm font-medium">Sicherheitsaufschlag (%)<Input name="buffer" className="mt-1 w-32" defaultValue={String(data.buffer).replace(".", ",")} inputMode="decimal" /></label>
            <Button type="submit" variant="secondary" loading={busy}>Speichern</Button>
          </form>

          {showManual && <ManualForm busy={busy} onSubmit={(v) => run(async () => { const r = await manual({ data: v }); if (!r.ok) throw new Error(r.error); toast.success("Manueller Kurs gesetzt."); setShowManual(false); })} />}

          <div>
            <h3 className="text-base font-semibold">Verlauf (30 Tage)</h3>
            <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-line">
              <table className="w-full min-w-[520px] text-sm tabular">
                <thead className="sticky top-0 bg-muted text-left text-ink-muted"><tr><th className="p-2">Abgerufen</th><th className="p-2">Währung</th><th className="p-2">Kurs</th><th className="p-2">Quelle</th><th className="p-2">Stand</th><th className="p-2">Status</th><th className="p-2">Zuletzt geprüft</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {data.history.length === 0 && <tr><td colSpan={6} className="p-2 text-ink-muted">Noch keine Kurse.</td></tr>}
                  {data.history.map((h) => (
                    <tr key={h.id}><td className="p-2">{new Date(h.fetched_at).toLocaleString("de-DE")}</td><td className="p-2">{h.from_currency}</td><td className="p-2">{n(h.rate)}</td><td className="p-2">{SRC[h.source] ?? h.source}</td><td className="p-2">{h.source === "manual" ? `bis ${d(h.expires_at)}` : d(h.published_at)}</td><td className="p-2">{h.status === "active" ? "aktiv" : h.status === "pending_review" ? "Prüfung nötig" : "verworfen"}</td><td className="p-2">{h.source === "manual" ? "–" : new Date(h.last_checked_at ?? h.fetched_at).toLocaleString("de-DE")}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ManualForm({ busy, onSubmit }: { busy: boolean; onSubmit: (v: { from: string; rate: number; reason: string; expiresAt: string }) => void }) {
  const max = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const def = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  return (
    <form className="grid gap-3 rounded-[14px] border border-line p-4 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      onSubmit({ from: String(f.get("from")).toUpperCase().trim(), rate: Number(String(f.get("rate")).replace(",", ".")), reason: String(f.get("reason")), expiresAt: new Date(Math.min(new Date(`${String(f.get("expires"))}T23:59:00Z`).getTime(), Date.now() + 7 * 86_400_000 - 120_000)).toISOString() });
    }}>
      <p className="text-sm text-ink-muted sm:col-span-2">Notlösung: Der manuelle Kurs übersteuert den automatischen bis zum Ablaufdatum (höchstens 7 Tage). Der Aufschlag wird zusätzlich angewendet.</p>
      <label className="text-sm font-medium">Währung<Input name="from" className="mt-1" defaultValue="USD" maxLength={3} required /></label>
      <label className="text-sm font-medium">Kurs (1 Einheit = x EUR)<Input name="rate" className="mt-1" placeholder="0,89" inputMode="decimal" required /></label>
      <label className="text-sm font-medium sm:col-span-2">Begründung (Pflicht)<Input name="reason" className="mt-1" minLength={5} required /></label>
      <label className="text-sm font-medium">Gültig bis<Input name="expires" type="date" className="mt-1" defaultValue={def} max={max} required /></label>
      <div className="flex items-end"><Button type="submit" loading={busy}>Manuellen Kurs setzen</Button></div>
    </form>
  );
}

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Warning } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { factLight, type FactLight } from "@/lib/comparison";
import { Button, Input } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const adminComparisonQuery = {
  queryKey: ["admin", "comparison"],
  queryFn: async () => {
    const [c, r, f] = await Promise.all([
      supabase.from("competitors").select("*").order("sort_order"),
      supabase.from("comparison_rows").select("*").order("sort_order"),
      supabase.from("comparison_facts").select("*"),
    ]);
    const err = c.error ?? r.error ?? f.error;
    if (err) throw new Error(err.message);
    return { competitors: c.data!, rows: r.data!, facts: f.data! };
  },
};

export function ComparisonRecheckHint() {
  const { data } = useQuery(adminComparisonQuery);
  const now = new Date();
  const n = (data?.facts ?? []).filter((f) => f.enabled && factLight(f.checked_at, now) !== "green").length;
  if (!n) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-lg border border-warning bg-surface p-4 lg:col-span-2">
      <Warning size={22} className="shrink-0 text-warning" weight="fill" />
      <div>
        <p className="font-medium">{n} Vergleichsangaben müssen neu geprüft werden</p>
        <Link to="/admin/compare" className="text-sm text-primary underline">Zum Vergleich</Link>
      </div>
    </div>
  );
}

const LIGHT: Record<FactLight, { cls: string; label: string }> = {
  green: { cls: "bg-success", label: "Aktuell (unter 60 Tage)" },
  yellow: { cls: "bg-warning", label: "Bald neu prüfen (60–90 Tage)" },
  red: { cls: "bg-danger", label: "Abgelaufen, wird ausgeblendet" },
};
const today = () => new Date().toISOString().slice(0, 10);
const sel = "h-12 rounded-md border border-line-strong bg-surface px-3 text-base";

async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string, done: () => void) {
  const { error } = await p;
  if (error) toast.error(error.message);
  else { toast.success(ok); done(); }
}

export function AdminComparison() {
  const qc = useQueryClient();
  const { data, error } = useQuery(adminComparisonQuery);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "comparison"] });
  const [compId, setCompId] = useState<string>("");
  if (error) throw error;
  if (!data) return <p className="text-ink-muted">Lädt…</p>;
  const comp = data.competitors.find((c) => c.id === compId) ?? data.competitors[0];
  const now = new Date();

  return (
    <div className="space-y-12">
      <p className="max-w-2xl text-sm text-ink-muted">Nur sachlich nachprüfbare Angaben mit Quelle. Keine Bewertungen („besser“, „Testsieger“, „günstigste“), keine Preise ohne identischen Tarif. Angaben älter als 90 Tage werden automatisch ausgeblendet.</p>

      <section>
        <h2 className="text-xl">Anbieter</h2>
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
          {data.competitors.map((c) => <CompetitorEditor key={c.id} c={c} onSaved={refresh} />)}
        </ul>
      </section>

      <section>
        <h2 className="text-xl">Zeilen</h2>
        <p className="mt-1 text-sm text-ink-muted">Platzhalter im GlobeSIM-Text: {"{count}"} (Ziele mit aktiven Tarifen), {"{hours}"} (Support-Zeiten aus den Einstellungen).</p>
        <ul className="mt-4 space-y-3">
          {data.rows.map((r) => <RowEditor key={r.id} r={r} onSaved={refresh} />)}
          <RowEditor key="new" r={null} onSaved={refresh} />
        </ul>
      </section>

      {comp && (
        <section>
          <h2 className="text-xl">Fakten</h2>
          <label className="mt-3 block text-sm font-medium">Anbieter
            <select className={cn(sel, "ml-3")} value={comp.id} onChange={(e) => setCompId(e.target.value)}>
              {data.competitors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <ul className="mt-4 space-y-3">
            {data.rows.map((r) => {
              const f = data.facts.find((x) => x.row_id === r.id && x.competitor_id === comp.id) ?? null;
              return <FactEditor key={`${comp.id}-${r.id}`} rowId={r.id} question={r.question} competitorId={comp.id} f={f} light={f ? factLight(f.checked_at, now) : null} onSaved={refresh} />;
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

type Comp = { id: string; name: string; website_url: string | null; logo_url: string | null; enabled: boolean; sort_order: number };
function CompetitorEditor({ c, onSaved }: { c: Comp; onSaved: () => void }) {
  const [url, setUrl] = useState(c.website_url ?? "");
  async function onLogo(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/svg+xml"].includes(file.type)) return toast.error("Nur PNG oder SVG.");
    if (file.size > 200 * 1024) return toast.error("Maximal 200 KB.");
    const dataUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(file); });
    await run(supabase.from("competitors").update({ logo_url: dataUrl }).eq("id", c.id), "Logo gespeichert", onSaved);
  }
  return (
    <li className="grid gap-3 p-4 sm:grid-cols-[160px_1fr_auto] sm:items-center">
      <div className="flex items-center gap-3">
        {c.logo_url ? <img src={c.logo_url} alt={c.name} className="h-5 w-auto max-w-[96px] object-contain" /> : <span className="font-semibold">{c.name}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label={`Website ${c.name}`} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} className="max-w-xs" />
        <Button variant="secondary" onClick={() => run(supabase.from("competitors").update({ website_url: url || null }).eq("id", c.id), "Gespeichert", onSaved)}>Speichern</Button>
        <label className="cursor-pointer text-sm text-primary underline">Logo hochladen<input type="file" accept="image/png,image/svg+xml" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} /></label>
        {c.logo_url && <button className="text-sm text-ink-muted underline" onClick={() => run(supabase.from("competitors").update({ logo_url: null }).eq("id", c.id), "Logo entfernt", onSaved)}>Logo entfernen</button>}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.enabled} onChange={(e) => run(supabase.from("competitors").update({ enabled: e.target.checked }).eq("id", c.id), "Gespeichert", onSaved)} /> aktiv</label>
    </li>
  );
}

type RowRec = { id: string; sort_order: number; question: string; globesim_text: string; globesim_status: string; requires: string | null; enabled: boolean };
function RowEditor({ r, onSaved }: { r: RowRec | null; onSaved: () => void }) {
  const [v, setV] = useState({ sort_order: r?.sort_order ?? 99, question: r?.question ?? "", globesim_text: r?.globesim_text ?? "", globesim_status: r?.globesim_status ?? "neutral", requires: r?.requires ?? "", enabled: r?.enabled ?? false });
  const body = { ...v, requires: v.requires || null };
  function save() {
    if (!v.question.trim()) return toast.error("Frage fehlt.");
    run(r ? supabase.from("comparison_rows").update(body).eq("id", r.id) : supabase.from("comparison_rows").insert(body), "Zeile gespeichert", onSaved);
  }
  return (
    <li className="grid gap-2 rounded-lg border border-line p-4 sm:grid-cols-[70px_1fr_1fr]">
      <Input aria-label="Reihenfolge" type="number" value={v.sort_order} onChange={(e) => setV({ ...v, sort_order: Number(e.target.value) })} />
      <Input aria-label="Frage" placeholder={r ? "" : "Neue Frage"} value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} />
      <Input aria-label="GlobeSIM-Text" placeholder="GlobeSIM-Text" value={v.globesim_text} onChange={(e) => setV({ ...v, globesim_text: e.target.value })} />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <select aria-label="GlobeSIM-Status" className={sel} value={v.globesim_status} onChange={(e) => setV({ ...v, globesim_status: e.target.value })}><option value="check">Haken</option><option value="neutral">Neutral</option></select>
        <select aria-label="Bedingung" className={sel} value={v.requires} onChange={(e) => setV({ ...v, requires: e.target.value })}>
          <option value="">Keine Bedingung</option><option value="unlimited_plans">Aktive Unlimited-Tarife</option><option value="support_hours">Support-Zeiten gesetzt</option><option value="destination_count">Anzahl Ziele</option>
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} /> freigegeben</label>
        <Button variant="secondary" onClick={save}>{r ? "Speichern" : "Zeile anlegen"}</Button>
        {r && <button className="text-sm text-danger underline" onClick={() => confirm("Zeile samt Fakten löschen?") && run(supabase.from("comparison_rows").delete().eq("id", r.id), "Gelöscht", onSaved)}>Löschen</button>}
      </div>
    </li>
  );
}

type Fact = { id: string; text: string; status: string; source_url: string; checked_at: string; enabled: boolean };
function FactEditor({ rowId, question, competitorId, f, light, onSaved }: { rowId: string; question: string; competitorId: string; f: Fact | null; light: FactLight | null; onSaved: () => void }) {
  const [v, setV] = useState({ text: f?.text ?? "", status: f?.status ?? "neutral", source_url: f?.source_url ?? "", checked_at: f?.checked_at ?? today(), enabled: f?.enabled ?? true });
  function save() {
    if (!v.text.trim()) return toast.error("Text fehlt.");
    if (!/^https:\/\/\S+$/.test(v.source_url)) return toast.error("Quelle (https-Link) ist Pflicht.");
    if (!v.checked_at) return toast.error("Prüfdatum ist Pflicht.");
    const body = { ...v, row_id: rowId, competitor_id: competitorId };
    run(f ? supabase.from("comparison_facts").update(body).eq("id", f.id) : supabase.from("comparison_facts").insert(body), "Fakt gespeichert", onSaved);
  }
  return (
    <li className="rounded-lg border border-line p-4">
      <div className="flex items-center gap-2">
        {light && <span className={cn("size-3 rounded-full", LIGHT[light].cls)} role="img" aria-label={LIGHT[light].label} title={LIGHT[light].label} />}
        <p className="text-sm font-semibold">{question}</p>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_160px]">
        <Input aria-label="Angabe" placeholder="Angabe laut Anbieter" value={v.text} onChange={(e) => setV({ ...v, text: e.target.value })} />
        <Input aria-label="Quelle" placeholder="https://… (Pflicht)" value={v.source_url} onChange={(e) => setV({ ...v, source_url: e.target.value })} />
        <Input aria-label="Geprüft am" type="date" value={v.checked_at} onChange={(e) => setV({ ...v, checked_at: e.target.value })} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <select aria-label="Status" className={sel} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}><option value="check">Haken</option><option value="neutral">Strich</option><option value="cross">Kreuz</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} /> aktiv</label>
        <Button variant="secondary" onClick={save}>Speichern</Button>
        {f && <button className="text-sm text-danger underline" onClick={() => run(supabase.from("comparison_facts").delete().eq("id", f.id), "Gelöscht", onSaved)}>Löschen</button>}
      </div>
    </li>
  );
}

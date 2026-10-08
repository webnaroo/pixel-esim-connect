import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowClockwise, CheckCircle, FileArrowUp, MagnifyingGlass, Plus, Sparkle, Stop, WarningCircle } from "@phosphor-icons/react";
import { Button, Input, SegmentedControl } from "@/components/ui-kit";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { privateHead } from "@/lib/seo";
import { seoOverviewQuery, recordSeoChange, resumeSeoAi, runSeoAudit } from "@/lib/seo-admin.functions";
import { seoAnalysisSchema, seoReportInput, type SeoAnalysis } from "@/lib/seo-analysis";
import type { SeoPageCheck } from "@/lib/seo-audit";
import { AdminError } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  head: () => privateHead("SEO-Werkstatt", "Geschützte SEO-Analysen, öffentliche Seitenprüfungen und Änderungshistorie für GlobeSIM."),
  loader: ({ context }) => context.queryClient.ensureQueryData(seoOverviewQuery()),
  component: SeoAdmin, errorComponent: AdminError,
});

function Recommendations({ value }: { value: unknown }) {
  const parsed = seoAnalysisSchema.safeParse(value);
  if (!parsed.success) return null;
  const analysis = parsed.data;
  return <div className="space-y-4">
    <p className="text-sm">{analysis.summary}</p>
    {analysis.limitations.length > 0 && <div className="border-l-2 border-line-strong pl-4 text-sm text-ink-muted"><h4 className="font-medium text-ink">Datengrundlage & offene Fragen</h4><ul className="mt-2 list-disc pl-4">{analysis.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul></div>}
    <ol className="space-y-3">{analysis.recommendations.map((r, i) => <li key={i} className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3"><span className={r.priority === "P1" ? "font-semibold text-danger" : "font-semibold text-primary"}>{r.priority}</span><h4 className="min-w-0 flex-1 text-base font-semibold">{r.title}</h4><span className="text-xs text-ink-muted">Aufwand: {r.effort}</span></div>
      <p className="mt-1 break-all text-xs text-ink-muted">{r.page || "Seite noch zu bestimmen"}</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{[["Beobachtung", r.evidence], ["Maßnahme", r.action], ["Erwartete Wirkung", r.impact], ["Erfolg prüfen", r.verification]].map(([label, text]) => <div key={label}><dt className="font-medium">{label}</dt><dd className="mt-1 text-ink-muted">{text}</dd></div>)}</dl>
    </li>)}</ol>
  </div>;
}

function AuditResults({ value }: { value: unknown }) {
  if (!value || typeof value !== "object" || !("pages" in value) || !Array.isArray(value.pages)) return null;
  const pages = value.pages as SeoPageCheck[];
  const source = "origin" in value ? String(value.origin) : "";
  return <div>
    <p className="mb-3 break-all text-xs text-ink-muted">Geprüfter Stand: {source} · {pages.length} Seiten</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line text-ink-muted"><th className="py-2 pr-4">Seite</th><th className="py-2 pr-4">Ergebnis</th><th className="py-2">Strukturierte Daten</th></tr></thead><tbody>{pages.map((p) => <tr key={p.path} className="border-b border-line align-top">
      <td className="max-w-64 break-words py-3 pr-4">{p.path}<span className="mt-1 block text-xs text-ink-muted">HTTP {p.status}</span></td>
      <td className="py-3 pr-4">{p.errors.length ? <ul className="space-y-1 text-danger">{p.errors.map((e, i) => <li key={i}>{e}</li>)}</ul> : <span className="flex items-center gap-1 text-primary"><CheckCircle size={16} /> OK</span>}{p.warnings.map((w) => <p className="mt-1 text-xs text-ink-muted" key={w}>{w}</p>)}</td>
      <td className="max-w-60 py-3 text-xs text-ink-muted">{p.types.join(", ") || "—"}</td>
    </tr>)}</tbody></table></div>
  </div>;
}

function SeoAdmin() {
  const { data } = useSuspenseQuery(seoOverviewQuery());
  const cache = useQueryClient();
  const audit = useServerFn(runSeoAudit), saveChange = useServerFn(recordSeoChange), resume = useServerFn(resumeSeoAi);
  const [tab, setTab] = useState<"analysis" | "checks" | "history">("analysis");
  const [title, setTitle] = useState(""); const [report, setReport] = useState("");
  const [error, setError] = useState(""); const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false); const [checking, setChecking] = useState(false);
  const [analysis, setAnalysis] = useState<SeoAnalysis | null>(null);
  const [changeTitle, setChangeTitle] = useState(""); const [changePages, setChangePages] = useState(""); const [note, setNote] = useState(""); const [saving, setSaving] = useState(false);
  const controller = useRef<AbortController | null>(null); const fileInput = useRef<HTMLInputElement | null>(null);
  const refresh = () => cache.invalidateQueries({ queryKey: ["admin", "seo"] });
  const lastAudit = data.runs.find((r) => r.kind === "audit" && r.status === "completed");
  const lastAnalysis = data.runs.find((r) => r.kind === "analysis" && r.status === "completed");
  const changes = data.runs.filter((r) => r.kind === "change");

  async function analyze() {
    const input = seoReportInput.safeParse({ title, report });
    if (!input.success) { setError("Bitte Titel (3–120 Zeichen) und Bericht (20–40.000 Zeichen) eingeben."); return; }
    setError(""); setAnalysis(null); setBusy(true); setProgress("Analyse wird gestartet…");
    controller.current = new AbortController();
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Bitte erneut anmelden.");
      const response = await fetch("/api/seo-analysis", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session.access_token}` }, body: JSON.stringify(input.data), signal: controller.current.signal });
      if (!response.ok) {
        let message = `Analyse nicht verfügbar (HTTP ${response.status}).`;
        try { const body = await response.json(); if (typeof body.message === "string") message = body.message; } catch { /* Show safe fallback. */ }
        throw new Error(message);
      }
      if (!response.body) throw new Error("Keine Antwort empfangen.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let received = false;
      const consume = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "progress") setProgress(event.message);
        if (event.type === "result") { setAnalysis(seoAnalysisSchema.parse(event.analysis)); received = true; }
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; lines.forEach(consume);
      }
      buffer += decoder.decode(); consume(buffer);
      if (!received) throw new Error("Keine Empfehlungen empfangen.");
    } catch (e) { setError(controller.current?.signal.aborted ? "Analyse abgebrochen." : e instanceof Error ? e.message : "Analyse fehlgeschlagen."); }
    finally { controller.current = null; setBusy(false); setProgress(""); await refresh(); }
  }

  async function checkPages() {
    setChecking(true); setError("");
    try { await audit(); } catch (e) { setError(e instanceof Error ? e.message : "Prüfung fehlgeschlagen."); }
    finally { setChecking(false); await refresh(); }
  }

  return <div className="space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase text-primary">GlobeSIM</p><h2 className="mt-1 text-2xl">SEO-Werkstatt</h2></div><Button variant="secondary" loading={checking} onClick={checkPages}><MagnifyingGlass size={18} />Seiten prüfen</Button></div>
    <div className="grid grid-cols-3 gap-3 border-y border-line py-5 text-sm"><div><p className="text-ink-muted">Letzte Prüfung</p><p className="mt-1 font-medium">{lastAudit ? new Date(lastAudit.created_at).toLocaleDateString("de-DE") : "Noch keine"}</p></div><div><p className="text-ink-muted">Analysen im Verlauf</p><p className="mt-1 font-medium">{data.runs.filter((r) => r.kind === "analysis").length}</p></div><div><p className="text-ink-muted">Änderungen im Verlauf</p><p className="mt-1 font-medium">{changes.length}</p></div></div>
    <div className="overflow-x-auto"><SegmentedControl label="SEO-Bereiche" value={tab} onChange={setTab} options={[{ value: "analysis", label: "KI-Analyse" }, { value: "checks", label: "Prüfergebnisse" }, { value: "history", label: "Änderungsverlauf" }]} /></div>
    {error && <p role="alert" className="flex gap-2 break-words border-l-2 border-danger pl-3 text-sm text-danger"><WarningCircle size={18} className="shrink-0" />{error}</p>}
    {data.state?.blocked && <div className="space-y-3 border-l-2 border-danger pl-4 text-sm"><p className="text-danger">{data.state.reason}</p><Button variant="secondary" onClick={async () => { try { await resume(); await refresh(); } catch { setError("Freigabe fehlgeschlagen."); } }}><ArrowClockwise size={18} />Zugriff wiederhergestellt – freigeben</Button></div>}
    {tab === "analysis" && <div className="space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); void analyze(); }} className="max-w-4xl space-y-4">
        <div><label htmlFor="seo-title" className="mb-2 block text-sm font-medium">Analyse-Titel</label><Input id="seo-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Zum Beispiel: Search Console · September 2026" disabled={busy} /></div>
        <div><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><label htmlFor="seo-report" className="text-sm font-medium">Search-Console-Bericht oder SEO-Kennzahlen</label><Button type="button" variant="ghost" disabled={busy} onClick={() => fileInput.current?.click()}><FileArrowUp size={18} />Datei einlesen</Button></div>
          <input ref={fileInput} type="file" accept=".csv,.txt,.json" className="hidden" aria-label="SEO-Bericht hochladen" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 160000) { setError("Datei ist zu groß. Maximal 40.000 Zeichen eingeben."); return; } const text = await file.text(); if (text.length > 40000) { setError("Bericht enthält mehr als 40.000 Zeichen."); return; } setReport(text); if (!title) setTitle(file.name.slice(0, 120)); e.target.value = ""; }} />
          <Textarea id="seo-report" value={report} onChange={(e) => setReport(e.target.value)} disabled={busy} maxLength={40000} rows={12} placeholder="Zeitraum, Seiten, Suchanfragen, Klicks, Impressionen, CTR, durchschnittliche Position, Indexierungsprobleme…" className="min-h-64 bg-surface text-sm" />
          <p className="mt-2 text-xs text-ink-muted">{report.length.toLocaleString("de-DE")} / 40.000 Zeichen · Lovable AI verbraucht Workspace-Credits. Keine Passwörter oder personenbezogenen Daten eingeben.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" loading={busy} disabled={Boolean(data.state?.blocked)}><Sparkle size={18} />Prioritäten erstellen</Button>{busy && <Button type="button" variant="secondary" onClick={() => controller.current?.abort()}><Stop size={18} />Abbrechen</Button>}<p role="status" className="text-sm text-ink-muted">{progress}</p></div>
      </form>
      {(analysis || lastAnalysis) && <section className="border-t border-line pt-6"><h3 className="mb-4 text-lg">{analysis ? "Neue Empfehlungen" : lastAnalysis?.title}</h3><Recommendations value={analysis ?? lastAnalysis?.result} /></section>}
      <section className="border-t border-line pt-6"><h3 className="mb-3 text-lg">Gespeicherte Analysen</h3>{data.runs.filter((r) => r.kind === "analysis").length === 0 ? <p className="text-sm text-ink-muted">Noch keine Analyse gespeichert.</p> : data.runs.filter((r) => r.kind === "analysis").map((run) => <details className="border-b border-line py-3" key={run.id}><summary className="cursor-pointer text-sm"><span className="font-medium">{run.title}</span><span className="ml-3 text-ink-muted">{new Date(run.created_at).toLocaleString("de-DE")} · {statusLabel(run.status)}</span></summary><div className="mt-4">{run.error ? <p className="text-sm text-danger">{run.error}</p> : <Recommendations value={run.result} />}</div></details>)}</section>
    </div>}
    {tab === "checks" && <section className="space-y-5">{lastAudit ? <AuditResults value={lastAudit.result} /> : <p className="text-sm text-ink-muted">Noch keine öffentliche Seitenprüfung vorhanden.</p>}<h3 className="text-lg">Frühere Prüfungen</h3>{data.runs.filter((r) => r.kind === "audit").map((run) => <details key={run.id} className="border-b border-line py-3"><summary className="cursor-pointer text-sm">{new Date(run.created_at).toLocaleString("de-DE")} · {statusLabel(run.status)}</summary><div className="mt-4">{run.error ? <p className="text-danger">{run.error}</p> : <AuditResults value={run.result} />}</div></details>)}</section>}
    {tab === "history" && <section className="space-y-6">
      <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); setError(""); try { await saveChange({ data: { title: changeTitle, pages: changePages.split(/[\n,]/).map((s) => s.trim()).filter(Boolean), note } }); setChangeTitle(""); setChangePages(""); setNote(""); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen."); } finally { setSaving(false); } }} className="max-w-3xl space-y-3">
        <h3 className="text-lg">SEO-Änderung dokumentieren</h3><label htmlFor="change-title" className="block text-sm">Änderung</label><Input id="change-title" value={changeTitle} onChange={(e) => setChangeTitle(e.target.value)} required minLength={3} maxLength={160} />
        <label htmlFor="change-pages" className="block text-sm">Betroffene Seiten (ein Pfad je Zeile)</label><Textarea id="change-pages" value={changePages} onChange={(e) => setChangePages(e.target.value)} required placeholder="/&#10;/countries/turkey" />
        <label htmlFor="change-note" className="block text-sm">Notiz / Ergebnis</label><Textarea id="change-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} /><Button loading={saving}><Plus size={18} />Änderung speichern</Button>
      </form>
      <div className="border-t border-line pt-4"><h3 className="mb-3 text-lg">Kürzliche Änderungen</h3>{changes.length ? changes.map((run) => <div key={run.id} className="border-b border-line py-4"><p className="text-xs text-ink-muted">{new Date(run.created_at).toLocaleString("de-DE")}</p><h4 className="mt-1 text-base font-medium">{run.title}</h4><p className="mt-1 break-all text-sm text-primary">{run.pages.join(", ")}</p><p className="mt-2 text-sm text-ink-muted">{run.result && typeof run.result === "object" && !Array.isArray(run.result) ? String(run.result["note"] ?? "") : ""}</p>{run.pages.map((path) => {
        const newer = data.runs.find((r) => r.kind === "audit" && r.status === "completed" && r.created_at >= run.created_at && r.pages.includes(path));
        return <p key={path} className="mt-2 text-xs text-ink-muted">{path}: {newer ? `Geprüft am ${new Date(newer.created_at).toLocaleString("de-DE")} – siehe Prüfergebnisse` : "Seit Änderung noch nicht geprüft"}</p>;
      })}</div>) : <p className="text-sm text-ink-muted">Noch keine Änderung dokumentiert.</p>}</div>
    </section>}
  </div>;
}

function statusLabel(status: string) { return ({ running: "Gestartet", completed: "Abgeschlossen", failed: "Fehlgeschlagen", cancelled: "Abgebrochen" } as Record<string, string>)[status] ?? status; }
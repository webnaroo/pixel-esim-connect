import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { adminListQuery, type ListKind, type Row } from "@/lib/admin-lists.functions";
import { EmptyState } from "./brand";
import { Button, Input } from "./ui-kit";

export type Col = { key: string; label: string; render?: (row: Row) => React.ReactNode };

const fmt = (v: unknown) => {
  if (v === null || v === undefined || v === "") return "–";
  if (typeof v === "boolean") return v ? "ja" : "nein";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString("de-DE");
  return String(v);
};

export function AdminList({ kind, cols, filters, searchLabel = "Suchen" }: { kind: ListKind; cols: Col[]; filters?: { value: string; label: string }[]; searchLabel?: string }) {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => { const t = setTimeout(() => { setQ(input); setPage(0); }, 300); return () => clearTimeout(t); }, [input]);
  const res = useQuery(adminListQuery({ kind, q, filter, page }));
  if (res.error) throw res.error;
  const rows = res.data?.rows ?? [];
  const pages = res.data ? Math.max(1, Math.ceil(res.data.count / res.data.pageSize)) : 1;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <label className="min-w-[220px] flex-1"><span className="sr-only">{searchLabel}</span><Input placeholder={searchLabel} value={input} onChange={(e) => setInput(e.target.value)} /></label>
        {filters && (
          <label><span className="sr-only">Filter</span>
            <select aria-label="Filter" className="h-12 rounded-md border border-line bg-surface px-3 text-sm" value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }}>
              <option value="">Alle</option>
              {filters.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
        )}
      </div>
      {res.isLoading ? <p className="text-ink-muted">Wird geladen …</p> : rows.length === 0 ? <EmptyState title="Keine Einträge" /> : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted text-left text-ink-muted"><tr>{cols.map((c) => <th key={c.key} className="p-3 font-medium">{c.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-line bg-surface">
              {rows.map((r: Row, i: number) => <tr key={String(r["id"] ?? r["order_id"] ?? i)}>{cols.map((c) => <td key={c.key} className="p-3 align-top">{c.render ? c.render(r) : fmt(r[c.key])}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <Button variant="secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Zurück</Button>
        <span>Seite {page + 1} von {pages} · {res.data?.count ?? 0} Einträge</span>
        <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Weiter</Button>
      </div>
    </div>
  );
}

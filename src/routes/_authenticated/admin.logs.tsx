import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminList } from "@/components/admin-list";
import { SegmentedControl } from "@/components/ui-kit";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";

type K = "audit" | "api_logs" | "sync_runs" | "webhooks";

export const Route = createFileRoute("/_authenticated/admin/logs")({ head: () => privateHead("Protokolle", "Geschützte Audit-, API-, Sync- und Zahlungsprotokolle von GlobeSIM."), component: Logs, errorComponent: AdminError });

function Logs() {
  const [k, setK] = useState<K>("audit");
  return (
    <div className="space-y-6">
      <SegmentedControl label="Protokoll" value={k} onChange={setK} options={[{ value: "audit", label: "Audit-Log" }, { value: "api_logs", label: "API-Logs" }, { value: "sync_runs", label: "Sync-Läufe" }, { value: "webhooks", label: "Webhooks" }]} />
      {k === "audit" && <AdminList key={k} kind="audit" searchLabel="Aktion oder ID suchen" filters={["order", "plans", "app_settings", "legal_pages", "faqs", "blog_posts", "comparison_facts", "account"].map((v) => ({ value: v, label: v }))}
        cols={[{ key: "created_at", label: "Zeit" }, { key: "action", label: "Aktion" }, { key: "entity", label: "Bereich" }, { key: "entity_id", label: "ID" }, { key: "actor_id", label: "Von", render: (r) => (r["actor_id"] ? String(r["actor_id"]).slice(0, 8) : "System") }]} />}
      {k === "api_logs" && <AdminList key={k} kind="api_logs" searchLabel="Endpunkt suchen" filters={[{ value: "errors", label: "Nur Fehler" }]}
        cols={[{ key: "created_at", label: "Zeit" }, { key: "endpoint", label: "Endpunkt" }, { key: "status", label: "Status" }, { key: "latency_ms", label: "ms" }, { key: "error", label: "Fehler" }]} />}
      {k === "sync_runs" && <AdminList key={k} kind="sync_runs" searchLabel="Suchen" filters={[{ value: "ok", label: "OK" }, { value: "aborted", label: "Abgebrochen" }, { value: "error", label: "Fehler" }]}
        cols={[{ key: "started_at", label: "Start" }, { key: "status", label: "Status" }, { key: "plans_added", label: "Neu" }, { key: "plans_updated", label: "Aktualisiert" }, { key: "plans_deactivated", label: "Deaktiviert" }, { key: "error", label: "Fehler" }]} />}
      {k === "webhooks" && <AdminList key={k} kind="webhooks" searchLabel="Event-ID suchen" filters={[{ value: "stripe", label: "Stripe" }, { value: "provider", label: "eSIMerge" }, { value: "sandbox", label: "Nur Sandbox/Test" }]}
        cols={[{ key: "created_at", label: "Empfangen" }, { key: "source", label: "Quelle" }, { key: "event_type", label: "Typ" }, { key: "event_id", label: "Event-ID" }, { key: "mode", label: "Modus" }, { key: "status", label: "Status" }, { key: "reason", label: "Grund" }, { key: "processed_at", label: "Verarbeitet" }]} />}
    </div>
  );
}

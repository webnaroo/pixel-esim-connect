import { createFileRoute } from "@tanstack/react-router";
import { AdminList } from "@/components/admin-list";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";

// Activation codes, LPA and QR are never loaded in this view.
export const Route = createFileRoute("/_authenticated/admin/esims")({
  head: () => privateHead("eSIMs verwalten", "Geschützte eSIM-Statusübersicht von GlobeSIM."),
  component: () => (
    <AdminList kind="esims" searchLabel="ICCID oder Provider-Bestellnummer" filters={[{ value: "pending", label: "Ausstehend" }, { value: "ready", label: "Bereit" }, { value: "active", label: "Aktiv" }, { value: "expired", label: "Abgelaufen" }]}
      cols={[{ key: "order_id", label: "Bestellung", render: (r) => String(r["order_id"]).slice(0, 8) }, { key: "status", label: "Status" }, { key: "provider_status", label: "Provider-Status" }, { key: "iccid", label: "ICCID" }, { key: "provider_order_id", label: "Provider-Nr." }, { key: "expires_at", label: "Läuft ab" }, { key: "created_at", label: "Erstellt" }]} />
  ),
  errorComponent: AdminError,
});

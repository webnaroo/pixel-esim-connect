import { createFileRoute } from "@tanstack/react-router";
import { AdminList } from "@/components/admin-list";
import { formatPrice } from "@/lib/format";
import { AdminError } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  component: () => (
    <AdminList kind="plans" searchLabel="Tarif-ID suchen" filters={[{ value: "active", label: "Aktiv" }, { value: "inactive", label: "Inaktiv" }, { value: "data", label: "Datenpakete" }, { value: "unlimited", label: "Unlimited" }]}
      cols={[
        { key: "provider_plan_id", label: "Tarif-ID" },
        { key: "destination", label: "Reiseziel" },
        { key: "type", label: "Typ" },
        { key: "data_mb", label: "MB" },
        { key: "validity_days", label: "Tage" },
        { key: "cost_price", label: "Einkauf", render: (r) => `${r["cost_price"]} ${r["cost_currency"]}` },
        { key: "sell_price", label: "Verkauf", render: (r) => (Number(r["sell_price"]) > 0 ? formatPrice(Number(r["sell_price"]), String(r["currency"])) : "kein Preis") },
        { key: "is_active", label: "Aktiv" },
        { key: "throttle_claim", label: "Drosselung" },
        { key: "hotspot", label: "Hotspot" },
      ]} />
  ),
  errorComponent: AdminError,
});

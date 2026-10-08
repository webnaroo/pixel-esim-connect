import { createFileRoute } from "@tanstack/react-router";
import { AdminList } from "@/components/admin-list";
import { formatPrice } from "@/lib/format";
import { AdminError } from "./admin";

const eur = (v: unknown) => (v == null ? "–" : Number(v).toLocaleString("de-DE", { style: "currency", currency: "EUR" }));

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
        { key: "cost_eur", label: "Einkauf €", render: (r) => r["cost_eur"] == null ? "kein Kurs" : <>{eur(r["cost_eur"])}<br /><span className="text-xs text-ink-muted">Kurs {r["fx_rate"] == null ? "–" : Number(r["fx_rate"]).toLocaleString("de-DE", { maximumFractionDigits: 6 })}</span></> },
        { key: "net", label: "Netto", render: (r) => eur(r["net"]) },
        { key: "vat", label: "MwSt.", render: (r) => eur(r["vat"]) },
        { key: "sell_price", label: "Brutto", render: (r) => (Number(r["sell_price"]) > 0 ? formatPrice(Number(r["sell_price"]), String(r["currency"])) : "kein Preis") },
        { key: "fee", label: "Stripe", render: (r) => eur(r["fee"]) },
        { key: "result", label: "Ergebnis", render: (r) => r["result"] == null ? "–" : (
          <span className={r["below_min"] ? "font-semibold text-danger" : "font-semibold"}>{eur(r["result"])} · {Number(r["result_pct"]).toLocaleString("de-DE")} %{r["below_min"] ? <><br /><span className="text-xs">unter Mindestwert</span></> : null}</span>
        ) },
        { key: "is_active", label: "Aktiv" },
        { key: "throttle_claim", label: "Drosselung" },
        { key: "hotspot", label: "Hotspot" },
      ]} />
  ),
  errorComponent: AdminError,
});

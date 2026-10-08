import { createFileRoute } from "@tanstack/react-router";
import { AdminList } from "@/components/admin-list";
import { AdminError } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/customers")({
  component: () => (
    <AdminList kind="customers" searchLabel="E-Mail oder Name suchen" filters={[{ value: "admin", label: "Admins" }, { value: "support", label: "Support" }]}
      cols={[{ key: "email", label: "E-Mail" }, { key: "name", label: "Name" }, { key: "roles", label: "Rollen" }, { key: "orders", label: "Bestellungen" }, { key: "created_at", label: "Registriert" }]} />
  ),
  errorComponent: AdminError,
});

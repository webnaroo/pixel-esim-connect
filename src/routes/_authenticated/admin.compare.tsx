import { createFileRoute } from "@tanstack/react-router";
import { AdminComparison } from "@/components/admin-comparison";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/compare")({
  head: () => privateHead("Vergleich verwalten", "Anbieter und Quellen im GlobeSIM-Admin verwalten."),
  errorComponent: AdminError,
  component: AdminComparison,
});

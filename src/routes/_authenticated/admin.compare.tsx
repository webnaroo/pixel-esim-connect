import { createFileRoute } from "@tanstack/react-router";
import { AdminComparison } from "@/components/admin-comparison";
import { AdminError } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/compare")({
  errorComponent: AdminError,
  component: AdminComparison,
});

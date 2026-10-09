import { createFileRoute, Link, Outlet, redirect, type ErrorComponentProps } from "@tanstack/react-router";
import { SiteLayout } from "@/components/layout";
import { getMyRole } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  // Server-side role check on every admin navigation — only admins may enter.
  beforeLoad: async () => {
    const { isAdmin } = await getMyRole();
    if (!isAdmin) throw redirect({ to: "/account" });
  },
  head: () => ({
    meta: [
      { title: "Admin | GlobeSIM" },
      { name: "description", content: "GlobeSIM Verwaltung" },
      { property: "og:title", content: "Admin | GlobeSIM" },
      { property: "og:description", content: "GlobeSIM Verwaltung" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Übersicht", exact: true },
  { to: "/admin/golive", label: "Go-Live" },
  { to: "/admin/orders", label: "Bestellungen" },
  { to: "/admin/customers", label: "Kunden" },
  { to: "/admin/esims", label: "eSIMs" },
  { to: "/admin/plans", label: "Tarife" },
  { to: "/admin/pricing", label: "Preise" },
  { to: "/admin/unlimited", label: "Unlimited-Prüfung" },
  { to: "/admin/content", label: "Inhalte" },
  { to: "/admin/compare", label: "Inhalte › Vergleich" },
  { to: "/admin/devices", label: "Geräte" },
  { to: "/admin/seo", label: "SEO" },
  { to: "/admin/logs", label: "Logs" },
  { to: "/admin/explorer", label: "API-Explorer" },
] as const;

function AdminLayout() {
  return (
    <SiteLayout>
      <section className="container-page pb-20 pt-8">
        <h1 className="text-3xl">Admin</h1>
        <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Admin-Bereiche">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: "exact" in t }}
              className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-ink-muted"
              activeProps={{ className: "border-primary! text-ink!" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <Outlet />
        </div>
      </section>
    </SiteLayout>
  );
}

export function AdminError({ error }: ErrorComponentProps) {
  return (
    <div role="alert" className="rounded-lg border border-line border-l-4 border-l-danger bg-surface p-4 text-sm">
      {String((error as Error)?.message).includes("Admin") ? "Kein Zugriff: Dieses Konto hat keine Admin-Rolle." : String((error as Error)?.message)}
    </div>
  );
}

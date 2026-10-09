import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteLayout } from "@/components/layout";
import { EmptyState, FixtureBadge } from "@/components/brand";
import { LinkButton } from "@/components/ui-kit";
import { noindexHead, useOrderAccess } from "@/components/order-access";
import { EsimInstallPanel } from "@/components/esim-install-panel";

export const Route = createFileRoute("/install/$orderId")({
  validateSearch: z.object({ t: z.string().max(200).optional().default("") }),
  // Token page: never cached, never sent on as referrer.
  headers: () => ({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" }),
  head: () => ({ ...noindexHead("eSIM installieren – GlobeSIM", "So installierst du deine GlobeSIM-eSIM in wenigen Minuten."), meta: [...noindexHead("eSIM installieren – GlobeSIM", "So installierst du deine GlobeSIM-eSIM in wenigen Minuten.").meta, { name: "referrer", content: "no-referrer" }] }),
  component: InstallPage,
});

function InstallPage() {
  const { orderId } = Route.useParams();
  const { t } = Route.useSearch();
  const { order, loading, fixture } = useOrderAccess(orderId, t);

  return (
    <SiteLayout>
      <section className="container-page max-w-2xl pb-20 pt-6">
        {loading ? (
          <p className="text-ink-muted">Wird geladen …</p>
        ) : !order ? (
          <EmptyState title="Bitte logge dich ein, um deine eSIM zu sehen" action={<LinkButton to="/login" variant="primary">Einloggen</LinkButton>}>
            Dieser Link ist abgelaufen. In deinem Konto findest du deine eSIM jederzeit.
          </EmptyState>
        ) : !order.esim?.lpa ? (
          <EmptyState title="Deine eSIM wird noch erstellt" action={<LinkButton to="/help" variant="secondary">Hilfe anfordern</LinkButton>}>
            Sobald sie bereit ist, erscheint hier der QR-Code.
          </EmptyState>
        ) : (
          <>
            {(fixture || order.isTest) && (
              <div className="mb-4 flex items-center gap-2"><FixtureBadge /><span className="text-sm text-ink-muted">Dieser QR-Code ist ungültig und dient nur der Design-Prüfung.</span></div>
            )}
            <h1 className="text-2xl sm:text-3xl">eSIM installieren</h1>
            <div className="mt-4">
              <EsimInstallPanel data={{
                lpa: order.esim.lpa, smdp: order.esim.smdp, activationCode: order.esim.activationCode,
                iosUrl: order.esim.iosUrl, androidUrl: order.esim.androidUrl,
                validityDays: order.plan.validity_days ?? null, activatedAt: order.esim.activatedAt, installUntil: order.esim.installUntil,
              }} />
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

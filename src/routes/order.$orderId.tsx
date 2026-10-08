import { UnlimitedLabel, UnlimitedNote } from "@/components/unlimited-claim";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SiteLayout } from "@/components/layout";
import { EmptyState, FixtureBadge, Chip } from "@/components/brand";
import { LinkButton } from "@/components/ui-kit";
import { noindexHead, useOrderAccess } from "@/components/order-access";
import { formatData, formatDays, formatPrice } from "@/lib/format";

export const Route = createFileRoute("/order/$orderId")({
  validateSearch: z.object({ t: z.string().max(200).optional().default("") }),
  head: () => noindexHead("Bestellbestätigung – GlobeSIM", "Deine GlobeSIM-Bestellung im Überblick."),
  component: OrderPage,
});

const STATUS: Record<string, string> = {
  pending: "Zahlung ausstehend",
  paid: "Bezahlt – eSIM wird erstellt",
  fulfilling: "Wir richten deine eSIM gerade ein",
  needs_review: "Wir prüfen deine Bestellung – wir melden uns per E-Mail",
  fulfilled: "eSIM bereit",
  fulfillment_failed: "Verzögert – unser Support meldet sich",
  refunded: "Erstattet",
  cancelled: "Storniert",
};

function OrderPage() {
  const { orderId } = Route.useParams();
  const { t } = Route.useSearch();
  const { order, loading, fixture } = useOrderAccess(orderId, t);

  return (
    <SiteLayout>
      <section className="container-page max-w-2xl pb-20 pt-8">
        {loading ? (
          <p className="text-ink-muted">Bestellung wird geladen …</p>
        ) : !order ? (
          <EmptyState title="Link ungültig oder abgelaufen" action={<LinkButton to="/help" variant="secondary">Hilfe anfordern</LinkButton>}>
            Bitte nutze den Link aus deiner Bestell-E-Mail oder melde dich an.
          </EmptyState>
        ) : (
          <>
            {(fixture || order.isTest) && <div className="mb-4"><FixtureBadge /></div>}
            <p className="text-sm text-ink-muted">Bestellung {fixture ? "TEST" : order.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="mt-2 text-3xl">{order.status === "fulfilled" ? "Deine eSIM ist bereit" : "Danke für deine Bestellung"}</h1>
            <div className="mt-4"><Chip tone={order.status === "fulfilled" ? "active" : order.status === "fulfillment_failed" ? "warning" : "default"}>{STATUS[order.status] ?? order.status}</Chip></div>

            <dl className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
              <Row k="Reiseziel" v={order.plan.destination ?? "–"} />
              <Row k="Tarif" v={<>{order.plan.type === "unlimited" ? <UnlimitedLabel throttleClaim={order.plan.throttle_claim} /> : formatData(order.plan.data_mb ?? null)} · {formatDays(order.plan.validity_days ?? 0)}{order.plan.type === "unlimited" && <UnlimitedNote throttleClaim={order.plan.throttle_claim} />}</>} />
              <Row k="E-Mail" v={order.email} />
              <Row k="Betrag" v={fixture ? "Testdaten" : formatPrice(order.amount, order.currency)} />
            </dl>

            {order.status === "fulfilled" ? (
              <LinkButton to={`/install/${order.id}?t=${encodeURIComponent(t)}`} className="mt-8 w-full">eSIM jetzt installieren</LinkButton>
            ) : (
              <p className="mt-8 text-sm text-ink-muted">Diese Seite aktualisiert sich automatisch. Du erhältst zusätzlich eine E-Mail, sobald die eSIM bereit ist.</p>
            )}
            <p className="mt-6 text-sm text-ink-muted">Fragen? <Link to="/help" className="font-medium text-primary">Hilfe & Kontakt</Link></p>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 p-4 text-sm">
      <dt className="text-ink-muted">{k}</dt>
      <dd className="text-right font-medium text-ink break-all">{v}</dd>
    </div>
  );
}

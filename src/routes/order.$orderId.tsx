import { UnlimitedLabel, UnlimitedNote } from "@/components/unlimited-claim";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { isPurchaseTrackable, trackPurchaseOnce } from "@/lib/meta-pixel";
import { CheckCircle, CopySimple } from "@phosphor-icons/react";
import { SiteLayout } from "@/components/layout";
import { EmptyState, FixtureBadge, Chip } from "@/components/brand";
import { LinkButton, btnClass } from "@/components/ui-kit";
import { noindexHead, useOrderAccess } from "@/components/order-access";
import { formatData, formatDays, formatPrice } from "@/lib/format";
import { orderSteps } from "@/lib/order-steps";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

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

const GOOD_TO_KNOW = [
  "Der QR-Code funktioniert nur einmal – installiere die eSIM am besten noch zu Hause im WLAN.",
  "Am Ziel angekommen schaltest du das Datenroaming für die neue eSIM ein.",
  "Die Installationsdaten findest du jederzeit über deinen Bestelllink – mit Konto auch unter „Mein Konto“.",
];

/** Clipboard with a fallback for browsers that block the clipboard API. */
async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

function OrderPage() {
  const { orderId } = Route.useParams();
  const { t } = Route.useSearch();
  const { order, loading, fixture } = useOrderAccess(orderId, t);
  const { user } = useAuth();
  const [linkCopied, setLinkCopied] = useState(false);

  // Purchase only after the server confirms payment (status set by the verified Stripe webhook), never for test payments.
  useEffect(() => {
    if (!order || fixture || !isPurchaseTrackable(order)) return;
    trackPurchaseOnce(order.id, order.amount, order.currency);
  }, [order, fixture]);

  const copyLink = async () => {
    if (await copyText(window.location.href)) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    }
  };

  return (
    <SiteLayout>
      <section className="container-page max-w-4xl pb-20 pt-8">
        {loading ? (
          <p className="text-ink-muted">Bestellung wird geladen …</p>
        ) : !order ? (
          <EmptyState title="Link ungültig oder abgelaufen" action={<LinkButton to="/help" variant="secondary">Hilfe anfordern</LinkButton>}>
            Bitte nutze den Link aus deiner Bestell-E-Mail oder melde dich an.
          </EmptyState>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-primary">
                <CheckCircle size={22} weight="fill" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={order.status === "fulfilled" ? "active" : order.status === "fulfillment_failed" ? "warning" : "default"}>
                    {STATUS[order.status] ?? order.status}
                  </Chip>
                  <span className="text-xs text-ink-muted">Bestellung {fixture ? "TEST" : order.id.slice(0, 8).toUpperCase()}</span>
                  {(fixture || order.isTest) && <FixtureBadge />}
                </div>
                <h1 className="mt-3 text-3xl">{order.status === "fulfilled" ? "Deine eSIM ist bereit" : "Danke für deine Bestellung"}</h1>
                <p className="mt-2 text-ink-muted">
                  {order.status === "fulfilled"
                    ? "Am einfachsten installierst du die eSIM noch zu Hause im WLAN."
                    : order.emailStatus === "pending_domain"
                      ? "Sobald deine eSIM bereit ist, melden wir uns bei dir."
                      : `Alle Infos gehen auch per E-Mail an ${order.email}.`}
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">Was passiert als Nächstes</h2>
                <ol className="mt-5">
                  {orderSteps(order.status).map((s, i, all) => (
                    <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
                      {i < all.length - 1 && <span aria-hidden className="absolute left-[13px] top-8 bottom-1 w-px bg-line" />}
                      <span
                        aria-hidden
                        className={cn(
                          "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-surface text-xs font-semibold",
                          s.state === "done" && "border-primary bg-primary text-primary-foreground",
                          s.state === "current" && "border-primary text-primary",
                          s.state === "open" && "border-line text-ink-muted",
                        )}
                      >
                        {s.state === "done" ? <CheckCircle size={15} weight="fill" /> : i + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-ink">{s.title}</p>
                        <p className="mt-1 text-sm text-ink-muted">{s.note}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-8 rounded-lg border border-line bg-surface p-5">
                  <p className="font-display text-base font-semibold tracking-[-0.02em] text-ink">Gut zu wissen</p>
                  <ul className="mt-3 space-y-3">
                    {GOOD_TO_KNOW.map((n) => (
                      <li key={n} className="flex gap-3 text-sm text-ink-muted">
                        <CheckCircle size={16} weight="regular" className="mt-0.5 shrink-0 text-primary" aria-hidden />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {user ? (
                  <div className="mt-6 rounded-lg border border-line bg-surface p-5">
                    <p className="text-sm font-medium text-ink">Später wiederfinden</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Deine eSIM und die Installationsdaten liegen jederzeit für dich im Konto.
                    </p>
                    <Link to="/account" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">
                      Zum Konto
                    </Link>
                  </div>
                ) : (
                  <div className="mt-6 rounded-lg border border-line bg-surface p-5">
                    <p className="text-sm font-medium text-ink">Link für später sichern</p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Deine Bestellung ist nur über diesen Link zu erreichen. Kopiere ihn dir oder leg ein Konto an – dann findest du sie jederzeit unter „Mein Konto“.
                    </p>
                    <button type="button" onClick={copyLink} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">
                      <CopySimple size={15} aria-hidden />
                      {linkCopied ? "Link kopiert" : "Bestelllink kopieren"}
                    </button>
                  </div>
                )}
              </div>

              <aside className="order-first min-w-0 lg:order-none lg:sticky lg:top-24">
                <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink">Deine Bestellung</h2>
                <dl className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
                  <Row k="Reiseziel" v={order.plan.destination ?? "–"} />
                  <Row k="Tarif" v={<>{order.plan.type === "unlimited" ? <UnlimitedLabel throttleClaim={order.plan.throttle_claim} /> : formatData(order.plan.data_mb ?? null)} · {formatDays(order.plan.validity_days ?? 0)}{order.plan.type === "unlimited" && <UnlimitedNote throttleClaim={order.plan.throttle_claim} />}</>} />
                  <Row k="E-Mail" v={order.emailStatus === "pending_domain" ? `${order.email} · E-Mail ausstehend` : order.email} />
                  {!fixture && order.discountAmount > 0 && <Row k="Rabatt" v={`${order.discountCode ?? ""} −${formatPrice(order.discountAmount, order.currency)}`} />}
                  <Row k="Betrag" v={fixture ? "Testdaten" : formatPrice(order.amount, order.currency)} />
                </dl>

                <div className="mt-4 space-y-3">
                  {order.status === "fulfilled" ? (
                    <LinkButton to={`/install/${order.id}?t=${encodeURIComponent(t)}`} className="w-full">eSIM jetzt installieren</LinkButton>
                  ) : (
                    <p className="text-sm text-ink-muted">Diese Seite aktualisiert sich automatisch, sobald es weitergeht.</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {user ? (
                      <Link to="/account" search={{ tab: "orders" }} className={btnClass("secondary", "w-full")}>Zu meinen Bestellungen</Link>
                    ) : (
                      <LinkButton to="/register" variant="secondary" className="w-full">Kostenloses Konto anlegen</LinkButton>
                    )}
                    <LinkButton to="/destinations" variant="secondary" className="w-full">Weitere Reiseziele</LinkButton>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-line bg-surface p-5">
                  <p className="text-sm font-medium text-ink">Fragen zur Bestellung?</p>
                  <p className="mt-1 text-sm text-ink-muted">Wir helfen dir auch bei der Installation weiter.</p>
                  <Link to="/help" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline">
                    Hilfe &amp; Kontakt
                  </Link>
                </div>
              </aside>
            </div>
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

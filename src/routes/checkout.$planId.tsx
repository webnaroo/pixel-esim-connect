import { UnlimitedLabel, UnlimitedNote } from "@/components/unlimited-claim";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/layout";
import { Flag, EmptyState, ErrorBox, FixtureBadge } from "@/components/brand";
import { Button, Input, LinkButton } from "@/components/ui-kit";
import { checkoutPlanQuery, createCheckoutSession } from "@/lib/checkout.functions";
import type { CheckoutError } from "@/lib/checkout-rules";
import { formatData, formatDays, formatPrice, USE_FIXTURES } from "@/lib/format";
import { FIXTURE_ORDER_ID } from "@/lib/fixtures/order";
import { isEmail } from "@/components/auth-shell";

export const Route = createFileRoute("/checkout/$planId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(checkoutPlanQuery(params.planId)),
  head: () => ({
    meta: [
      { title: "Kasse – GlobeSIM" },
      { name: "description", content: "eSIM-Tarif sicher bei GlobeSIM bestellen." },
      { property: "og:title", content: "Kasse – GlobeSIM" },
      { property: "og:description", content: "eSIM-Tarif sicher bei GlobeSIM bestellen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => <SiteLayout><div className="container-page py-16"><ErrorBox message="Der Tarif konnte nicht geladen werden." /></div></SiteLayout>,
  component: CheckoutPage,
});

const MESSAGES: Record<CheckoutError, string> = {
  shop_unavailable: "Der Kauf ist noch nicht freigeschaltet. Bitte versuche es später erneut.",
  plan_unavailable: "Dieser Tarif ist gerade nicht verfügbar.",
  price_unavailable: "Für diesen Tarif liegt aktuell kein gültiger Preis vor.",
  payment_unavailable: "Die Zahlung ist noch nicht verbunden.",
  invalid_request: "Bitte prüfe deine E-Mail-Adresse und bestätige den Hinweis zum Widerruf.",
  rate_limited: "Zu viele Versuche. Bitte warte eine Minute.",
};

function Steps({ current }: { current: number }) {
  const steps = ["Angaben", "Zahlung", "Fertig"];
  return (
    <ol className="flex gap-2 text-sm" aria-label="Schritte">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className={`flex-1 border-t-2 pt-2 ${i <= current ? "border-primary text-ink" : "border-line text-ink-muted"}`}>
          {i + 1}. {s}
        </li>
      ))}
    </ol>
  );
}

function CheckoutPage() {
  const { planId } = Route.useParams();
  const { data: plan } = useSuspenseQuery(checkoutPlanQuery(planId));
  const submit = useServerFn(createCheckoutSession);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!plan) {
    return (
      <SiteLayout>
        <div className="container-page py-16">
          <EmptyState title="Tarif nicht gefunden" action={<LinkButton to="/destinations" variant="secondary">Reiseziele ansehen</LinkButton>}>
            Dieser Tarif ist nicht mehr verfügbar.
          </EmptyState>
        </div>
      </SiteLayout>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isEmail(email)) return setError("Bitte gib eine gültige E-Mail-Adresse ein.");
    if (!consent) return setError("Bitte bestätige den Hinweis zum Widerrufsrecht.");
    setBusy(true);
    try {
      // Only plan, email and consent are sent. The price is calculated on the server.
      const r = await submit({ data: { planId, email, withdrawalConsent: true } });
      if (!r.ok) setError(MESSAGES[r.error]);
      // TODO(STRIPE): mount the payment form with r.clientSecret, then go to /order/$orderId?t=token.
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte versuche es erneut.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <section className="container-page max-w-2xl pb-20 pt-8">
        <Steps current={0} />
        <h1 className="mt-8 text-3xl">Kasse</h1>

        <div className="mt-6 flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
          <Flag code={plan.destination.flagCode} size={40} />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-ink">{plan.destination.name}</div>
            <div className="text-sm text-ink-muted">{plan.type === "unlimited" ? <UnlimitedLabel throttleClaim={plan.throttleClaim} /> : formatData(plan.dataMb)} · {formatDays(plan.validityDays)}</div>
            {plan.type === "unlimited" && <UnlimitedNote throttleClaim={plan.throttleClaim} />}
          </div>
          <Link to="/countries/$slug" params={{ slug: plan.destination.slug }} className="text-sm font-medium text-primary">Ändern</Link>
        </div>

        <dl className="mt-4 space-y-1 text-sm">
          {plan.price ? (
            <>
              <div className="flex justify-between text-ink-muted"><dt>Netto</dt><dd className="tabular">{formatPrice(plan.price.net, plan.price.currency)}</dd></div>
              <div className="flex justify-between text-ink-muted"><dt>MwSt. ({Math.round(plan.price.vatRate * 100)} %)</dt><dd className="tabular">{formatPrice(plan.price.vat, plan.price.currency)}</dd></div>
              <div className="flex justify-between pt-1 text-base font-semibold text-ink"><dt>Gesamt</dt><dd className="tabular">{formatPrice(plan.price.gross, plan.price.currency)}</dd></div>
            </>
          ) : (
            <p className="text-ink-muted">Für diesen Tarif liegt aktuell kein gültiger Preis vor.</p>
          )}
        </dl>

        <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
          <label className="block">
            <span className="text-sm font-medium text-ink">E-Mail für die eSIM</span>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" placeholder="name@beispiel.de" />
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" required />
            <span className="text-sm text-ink">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-warning">Platzhalter – juristische Prüfung ausstehend</span>
              Ich stimme ausdrücklich zu, dass GlobeSIM vor Ablauf der Widerrufsfrist mit der Bereitstellung der eSIM beginnt. Mir ist bekannt, dass ich dadurch mein Widerrufsrecht verliere.
            </span>
          </label>

          {error && <ErrorBox message={error} />}
          <Button type="submit" loading={busy} className="w-full" disabled={!plan.price}>Weiter zur Zahlung</Button>
        </form>

        {USE_FIXTURES && (
          <div className="mt-10 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line-strong p-4 text-sm">
            <FixtureBadge />
            <span className="text-ink-muted">Design-Vorschau:</span>
            <Link to="/order/$orderId" params={{ orderId: FIXTURE_ORDER_ID }} search={{ t: "" }} className="font-medium text-primary">Bestätigung</Link>
            <Link to="/install/$orderId" params={{ orderId: FIXTURE_ORDER_ID }} search={{ t: "" }} className="font-medium text-primary">Installation</Link>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

import { CompatCheck } from "@/components/compat-check";
import { UnlimitedLabel, UnlimitedNote } from "@/components/unlimited-claim";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { ShieldCheck, Zap, Mail, Lock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { SiteLayout } from "@/components/layout";
import { Flag, EmptyState, ErrorBox, FixtureBadge } from "@/components/brand";
import { Button, Input, LinkButton } from "@/components/ui-kit";
import { checkoutPlanQuery, createCheckoutSession, validateDiscountCode } from "@/lib/checkout.functions";
import { discountAmount, discountedTotals } from "@/lib/discount-rules";
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
  discount_invalid: "Dieser Rabattcode existiert nicht. Bitte prüfe die Schreibweise.",
  discount_rejected: "Dieser Rabattcode ist nicht mehr gültig – entweder abgelaufen, ausgeschaltet oder das Nutzungslimit ist erreicht.",
  discount_minimum: "Mit diesem Rabattcode läge der Endpreis unter dem erlaubten Mindestbetrag. Bitte kontaktiere support@globesim.de.",
};


function Steps({ current }: { current: number }) {
  const steps = ["Angaben", "Zahlung", "Fertig"];
  return (
    <ol className="grid grid-cols-3 gap-2 text-sm" aria-label="Schritte">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className="min-w-0">
          <div className={`h-1.5 rounded-full ${i <= current ? "bg-primary" : "bg-line"}`} />
          <div className={`mt-2 flex items-center gap-2 truncate ${i <= current ? "font-medium text-ink" : "text-ink-muted"}`}>
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${i < current ? "bg-primary text-primary-foreground" : i === current ? "border-2 border-primary text-primary" : "border border-line text-ink-muted"}`}>{i < current ? "✓" : i + 1}</span>
            <span className="truncate">{s}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PaymentForm({ clientSecret }: { clientSecret: string }) {
  const options = useMemo(() => ({ fetchClientSecret: async () => clientSecret }), [clientSecret]);
  return (
    <div id="checkout" className="overflow-hidden rounded-xl border border-line bg-surface p-2 sm:p-4">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={options}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

function CheckoutPage() {
  const { planId } = Route.useParams();
  const { data: plan } = useSuspenseQuery(checkoutPlanQuery(planId));
  const submit = useServerFn(createCheckoutSession);
  const checkCode = useServerFn(validateDiscountCode);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeChecking, setCodeChecking] = useState(false);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [discount, setDiscount] = useState<{ code: string; type: "percent" | "fixed"; value: number } | null>(null);

  const totals = useMemo(() => {
    if (!plan?.price) return null;
    if (!discount) return { gross: plan.price.gross, net: plan.price.net, vat: plan.price.vat, discountAmount: 0 };
    const amount = discountAmount(discount, plan.price.gross);
    return { ...discountedTotals(plan.price.gross, amount, plan.price.vatRate), discountAmount: amount };
  }, [plan?.price, discount]);

  const applyCode = async () => {
    setCodeMessage(null);
    if (!codeInput.trim()) return;
    setCodeChecking(true);
    try {
      const r = await checkCode({ data: { code: codeInput } });
      if (r.ok) setDiscount({ code: codeInput.trim().toUpperCase(), type: r.type, value: r.value });
      else setCodeMessage(
        r.reason === "rate_limited" ? "Zu viele Versuche. Bitte warte eine Minute."
        : r.reason === "invalid_format" ? "So sieht kein Rabattcode aus. Bitte prüfe die Schreibweise."
        : r.reason === "unknown" ? "Diesen Rabattcode gibt es nicht. Bitte prüfe die Schreibweise."
        : "Dieser Rabattcode ist nicht mehr gültig – abgelaufen, ausgeschaltet oder Nutzungslimit erreicht.",
      );
    } catch {
      setCodeMessage("Der Code konnte gerade nicht geprüft werden. Bitte versuche es erneut.");
    } finally {
      setCodeChecking(false);
    }
  };

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
    let environment: "sandbox" | "live";
    try { environment = getStripeEnvironment(); } catch { return setError(MESSAGES.payment_unavailable); }
    setBusy(true);
    try {
      // Only plan, email and consent are sent. The price is calculated on the server.
      const r = await submit({ data: { planId, email, withdrawalConsent: true, environment, returnOrigin: window.location.origin, discountCode: discount?.code } });
      if (!r.ok) {
        setError(MESSAGES[r.error]);
        if (r.error.startsWith("discount_")) { setDiscount(null); setCodeMessage(null); }
      }
      else setClientSecret(r.clientSecret);
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte versuche es erneut.");
    } finally {
      setBusy(false);
    }
  };

  const summary = (
    <aside className="rounded-2xl border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Deine Bestellung</h2>
      <div className="mt-4 flex items-center gap-4">
        <Flag code={plan.destination.flagCode} size={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-ink">{plan.destination.name}</div>
          <div className="text-sm text-ink-muted">{plan.type === "unlimited" ? <UnlimitedLabel throttleClaim={plan.throttleClaim} /> : formatData(plan.dataMb)} · {formatDays(plan.validityDays)}</div>
        </div>
      </div>
      {plan.type === "unlimited" && <div className="mt-2"><UnlimitedNote throttleClaim={plan.throttleClaim} /></div>}
      {!clientSecret && <Link to="/countries/$slug" params={{ slug: plan.destination.slug }} className="mt-3 inline-block text-sm font-medium text-primary">Tarif ändern</Link>}
      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
        {totals && plan.price ? (
          <>
            <div className="flex justify-between text-ink-muted"><dt>Netto</dt><dd className="tabular">{formatPrice(totals.net, plan.price.currency)}</dd></div>
            <div className="flex justify-between text-ink-muted"><dt>MwSt. ({Math.round(plan.price.vatRate * 100)} %)</dt><dd className="tabular">{formatPrice(totals.vat, plan.price.currency)}</dd></div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-primary"><dt>Rabatt ({discount!.code})</dt><dd className="tabular">−{formatPrice(totals.discountAmount, plan.price.currency)}</dd></div>
            )}
            <div className="flex items-baseline justify-between border-t border-line pt-3 text-ink"><dt className="font-semibold">Gesamt</dt><dd className="tabular text-2xl font-semibold">{formatPrice(totals.gross, plan.price.currency)}</dd></div>
            <p className="text-xs text-ink-muted">inkl. MwSt. · einmalige Zahlung, kein Abo</p>
          </>
        ) : (
          <p className="text-ink-muted">Für diesen Tarif liegt aktuell kein gültiger Preis vor.</p>
        )}
      </dl>
      <ul className="mt-5 space-y-2.5 border-t border-line pt-4 text-sm text-ink">
        <li className="flex items-center gap-2.5"><Zap className="size-4 shrink-0 text-primary" aria-hidden />eSIM direkt nach der Zahlung per E-Mail</li>
        <li className="flex items-center gap-2.5"><Lock className="size-4 shrink-0 text-primary" aria-hidden />Verschlüsselte Zahlung über Stripe</li>
        <li className="flex items-center gap-2.5"><Mail className="size-4 shrink-0 text-primary" aria-hidden />Hilfe unter support@globesim.de</li>
      </ul>
    </aside>
  );

  return (
    <SiteLayout>
      <section className="container-page max-w-5xl pb-20 pt-8">
        <Steps current={clientSecret ? 1 : 0} />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <h1 className="text-3xl">{clientSecret ? "Sicher bezahlen" : "Kasse"}</h1>
            <p className="mt-2 text-ink-muted">{clientSecret ? "Wähle deine Zahlungsart. Danach bekommst du deine eSIM sofort." : "Nur noch zwei Angaben, dann geht es zur Zahlung."}</p>

            {clientSecret ? (
              <div className="mt-6"><PaymentForm clientSecret={clientSecret} /></div>
            ) : (
              <>
                <CompatCheck className="mt-6" />
                {/* TODO(LEGAL): Offene Frage – soll im Widerrufs-/Bestelltext eine Bestätigung der Gerätekompatibilität stehen? Juristische Prüfung ausstehend; bewusst keine Pflicht-Checkbox. */}
                <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">E-Mail für die eSIM</span>
                    <Input type="email" inputMode="email" autoComplete="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} className="mt-2 text-base" placeholder="name@beispiel.de" />
                    <span className="mt-1.5 block text-xs text-ink-muted">Hierhin schicken wir deinen Installationslink.</span>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]" required />
                    <span className="text-sm text-ink">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink">Platzhalter – juristische Prüfung ausstehend</span>
                      Ich stimme ausdrücklich zu, dass GlobeSIM vor Ablauf der Widerrufsfrist mit der Bereitstellung der eSIM beginnt. Mir ist bekannt, dass ich dadurch mein Widerrufsrecht verliere.
                    </span>
                  </label>

                  <div className="rounded-xl border border-line bg-surface p-4">
                    <span className="text-sm font-medium text-ink">Rabattcode</span>
                    {discount ? (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-primary px-3 py-1 font-mono text-sm font-semibold text-primary-foreground">{discount.code}</span>
                        <span className="text-sm text-ink-muted">
                          {discount.type === "percent" ? `${discount.value.toLocaleString("de-DE")} % Rabatt` : `${formatPrice(discount.value, plan.price?.currency ?? "EUR")} Rabatt`} angerechnet.
                        </span>
                        <button type="button" onClick={() => { setDiscount(null); setCodeMessage(null); }} className="ml-auto text-sm font-medium text-ink-muted hover:text-danger">
                          Entfernen
                        </button>
                      </div>
                    ) : (
                      <form
                        className="mt-2 flex gap-2"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setCodeMessage(null);
                          if (!codeInput.trim()) return;
                          setCodeChecking(true);
                          try {
                            const r = await checkCode({ data: { code: codeInput } });
                            if (r.ok) {
                              setDiscount({ code: codeInput.trim().toUpperCase(), type: r.type, value: r.value });
                              setCodeMessage("Rabattcode angerechnet.");
                              qc.invalidateQueries();
                            } else {
                              setCodeMessage(
                                r.reason === "rate_limited" ? "Zu viele Versuche. Bitte warte eine Minute."
                                : r.reason === "invalid_format" ? "So sieht kein Rabattcode aus. Bitte prüfe die Schreibweise."
                                : r.reason === "unknown" ? "Diesen Rabattcode gibt es nicht. Bitte prüfe die Schreibweise."
                                : "Dieser Rabattcode ist nicht mehr gültig – abgelaufen, ausgeschaltet oder Nutzungslimit erreicht.",
                              );
                            }
                          } catch {
                            setCodeMessage("Der Code konnte gerade nicht geprüft werden. Bitte versuche es erneut.");
                          } finally {
                            setCodeChecking(false);
                          }
                        }}
                      >
                        <Input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} maxLength={40} placeholder="z. B. SOMMER10" className="font-mono uppercase" aria-label="Rabattcode eingeben" autoComplete="off" />
                        <Button type="submit" variant="secondary" loading={codeChecking} className="shrink-0">Einlösen</Button>
                      </form>
                    )}
                    {codeMessage && !discount && <p className="mt-2 text-sm text-danger">{codeMessage}</p>}
                  </div>

                  {error && <ErrorBox message={error} />}
                  <Button type="submit" loading={busy} className="h-12 w-full text-base" disabled={!totals}>
                    <ShieldCheck className="mr-2 size-5" aria-hidden />Weiter zur Zahlung{totals ? ` · ${formatPrice(totals.gross, plan.price?.currency ?? "EUR")}` : ""}
                  </Button>
                </form>
              </>
            )}
          </div>
          {summary}
        </div>

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

import { createFileRoute, Link } from "@tanstack/react-router";
import { Lightning, QrCode, ShieldCheck, ShoppingCart, SimCard, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { cart, cartDiscount, useCart, useCartDiscount } from "@/lib/cart";
import { useQueries } from "@tanstack/react-query";
import { priceFreshness } from "@/lib/price-refresh";
import { checkoutPlanQuery, validateDiscountCode } from "@/lib/checkout.functions";
import { discountAmount } from "@/lib/discount-rules";
import { Button, Input } from "@/components/ui-kit";
import { formatPrice } from "@/lib/format";
import { SiteLayout } from "@/components/layout";
import { LinkButton } from "@/components/ui-kit";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Warenkorb – GlobeSIM" },
      { name: "description", content: "Deine ausgewählten eSIM-Tarife bei GlobeSIM." },
      { property: "og:title", content: "Warenkorb – GlobeSIM" },
      { property: "og:description", content: "Deine ausgewählten eSIM-Tarife bei GlobeSIM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

const PERKS = [
  { icon: Lightning, title: "Sofort per E-Mail", text: "Nach der Zahlung bekommst du deine eSIM in wenigen Minuten." },
  { icon: QrCode, title: "Einfach installieren", text: "Per Knopfdruck auf dem Handy oder per QR-Code." },
  { icon: ShieldCheck, title: "Sicher bezahlen", text: "Einmalige Zahlung, kein Abo." },
];

function CartPage() {
  const items = useCart();
  const checks = useQueries({ queries: items.map((i) => ({ ...checkoutPlanQuery(i.planId), ...priceFreshness })) });
  useEffect(() => { checks.forEach((q, index) => { const item = items[index]; if (item && q.data?.price) cart.updatePrice(item.planId, q.data.price.gross, q.data.price.currency); }); }, [checks, items]);
  const discount = useCartDiscount();
  const off = (price: number) => (discount ? discountAmount(discount, price) : 0);
  const sum = (f: (i: (typeof items)[number]) => number) => items.reduce<Record<string, number>>((a, i) => ({ ...a, [i.currency]: Math.round(((a[i.currency] ?? 0) + f(i)) * 100) / 100 }), {});
  const totals = sum((i) => i.price - off(i.price));
  const savings = sum((i) => off(i.price));
  const fmt = (t: Record<string, number>) => Object.entries(t).map(([c, v]) => formatPrice(v, c)).join(" + ");
  return (
    <SiteLayout>
    <div className="container-page max-w-5xl py-10">
      <h1 className="text-3xl">Warenkorb</h1>
      {items.length === 0 ? (
        <div className="mt-8 rounded-[14px] border border-line bg-surface px-6 py-14 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted text-primary"><ShoppingCart size={32} /></span>
          <h2 className="mt-5 text-xl">Dein Warenkorb ist leer</h2>
          <p className="mx-auto mt-2 max-w-sm text-ink-muted">Such dir dein Reiseziel aus und leg einen passenden Tarif in den Warenkorb.</p>
          <LinkButton to="/destinations" className="mt-6">Reiseziel suchen</LinkButton>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="text-sm text-ink-muted">{items.length} Tarif{items.length === 1 ? "" : "e"} · Jede eSIM wird einzeln bezahlt.</p>
            <ul className="mt-4 space-y-3">
              {items.map((i) => (
                <li key={i.planId} className="rounded-[14px] border border-line bg-surface p-4 sm:p-5">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-primary"><SimCard size={24} /></span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">{i.destination}</div>
                      <div className="text-sm text-ink-muted">{i.label}</div>
                    </div>
                    <div className="tabular text-right">
                      {off(i.price) > 0 && <div className="text-sm text-ink-muted line-through">{formatPrice(i.price, i.currency)}</div>}
                      <div className="text-lg font-semibold">{formatPrice(i.price - off(i.price), i.currency)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                    <button onClick={() => cart.remove(i.planId)} className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-ink-muted hover:bg-muted hover:text-ink"><Trash size={16} /> Entfernen</button>
                    <LinkButton to="/checkout/$planId" params={{ planId: i.planId }}>Zur Kasse</LinkButton>
                  </div>
                </li>
              ))}
            </ul>
            <Link to="/destinations" className="mt-5 inline-block text-sm font-medium text-primary">+ Weiteres Reiseziel hinzufügen</Link>
          </div>
          <aside className="h-fit rounded-[14px] border border-line bg-surface p-5 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold">Übersicht</h2>
            <CodeBox />
            {discount && Object.values(savings).some((v) => v > 0) && <div className="mt-4 flex items-baseline justify-between text-sm text-primary"><span>Rabatt ({discount.code})</span><span className="tabular">−{fmt(savings)}</span></div>}
            <div className="mt-3 flex items-baseline justify-between text-sm"><span className="text-ink-muted">Summe aller Tarife</span><span className="tabular text-lg font-semibold text-ink">{fmt(totals)}</span></div>
            <p className="mt-1 text-xs text-ink-muted">inkl. MwSt. · jede eSIM wird einzeln bezahlt</p>
            <ul className="mt-5 space-y-4 border-t border-line pt-5">
              {PERKS.map((p) => (
                <li key={p.title} className="flex gap-3">
                  <p.icon size={22} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0"><div className="text-sm font-medium text-ink">{p.title}</div><div className="text-sm text-ink-muted">{p.text}</div></div>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </div>
    </SiteLayout>
  );
}

function CodeBox() {
  const discount = useCartDiscount();
  const check = useServerFn(validateDiscountCode);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const apply = async () => {
    if (!input.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const r = await check({ data: { code: input } });
      if (r.ok) { cartDiscount.set({ code: input.trim().toUpperCase(), type: r.type, value: r.value }); setInput(""); }
      else setMsg(r.reason === "rate_limited" ? "Zu viele Versuche. Bitte warte eine Minute." : r.reason === "unknown" || r.reason === "invalid_format" ? "Diesen Rabattcode gibt es nicht. Bitte prüfe die Schreibweise." : "Dieser Rabattcode ist nicht mehr gültig.");
    } catch { setMsg("Der Code konnte gerade nicht geprüft werden. Bitte versuche es erneut."); }
    finally { setBusy(false); }
  };
  if (discount) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary p-3">
        <span className="rounded-full bg-primary px-3 py-1 font-mono text-sm font-semibold text-primary-foreground">{discount.code}</span>
        <span className="text-sm text-ink">{discount.type === "percent" ? `${discount.value.toLocaleString("de-DE")} % Rabatt` : `${formatPrice(discount.value, "EUR")} Rabatt pro eSIM`}</span>
        <button type="button" onClick={() => cartDiscount.set(null)} className="ml-auto min-h-11 text-sm font-medium text-ink-muted hover:text-danger">Entfernen</button>
      </div>
    );
  }
  return (
    <div className="mt-4">
      <label className="text-sm font-medium text-ink" htmlFor="cart-code">Rabattcode</label>
      <div className="mt-1 flex gap-2">
        <Input id="cart-code" value={input} onChange={(e) => setInput(e.target.value.toUpperCase())} maxLength={40} placeholder="z. B. SOMMER10" className="min-w-0 font-mono uppercase" autoComplete="off" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void apply(); } }} />
        <Button type="button" variant="secondary" loading={busy} onClick={apply} className="shrink-0">Einlösen</Button>
      </div>
      {msg && <p className="mt-2 text-sm text-danger" role="alert">{msg}</p>}
    </div>
  );
}

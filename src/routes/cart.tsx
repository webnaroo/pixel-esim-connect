import { createFileRoute, Link } from "@tanstack/react-router";
import { Lightning, QrCode, ShieldCheck, ShoppingCart, SimCard, Trash } from "@phosphor-icons/react";
import { cart, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
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
  const totals = items.reduce<Record<string, number>>((a, i) => ({ ...a, [i.currency]: (a[i.currency] ?? 0) + i.price }), {});
  return (
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
                    <div className="tabular text-right text-lg font-semibold">{formatPrice(i.price, i.currency)}</div>
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
            <div className="mt-3 flex items-baseline justify-between text-sm"><span className="text-ink-muted">Summe aller Tarife</span><span className="tabular text-lg font-semibold text-ink">{Object.entries(totals).map(([c, v]) => formatPrice(v, c)).join(" + ")}</span></div>
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
  );
}

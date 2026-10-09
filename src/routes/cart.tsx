import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash } from "@phosphor-icons/react";
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

function CartPage() {
  const items = useCart();
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-3xl">Warenkorb</h1>
      {items.length === 0 ? (
        <p className="mt-6 text-ink-muted">Dein Warenkorb ist leer. <Link to="/destinations" className="text-primary underline">Reiseziel suchen</Link></p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink-muted">Jede eSIM wird einzeln bezahlt – klick bei einem Tarif auf „Zur Kasse".</p>
          <ul className="mt-6 space-y-3">
            {items.map((i) => (
              <li key={i.planId} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{i.destination}</div>
                  <div className="text-sm text-ink-muted">{i.label}</div>
                  <div className="tabular mt-1 font-semibold">{formatPrice(i.price, i.currency)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button aria-label="Entfernen" onClick={() => cart.remove(i.planId)} className="flex size-10 items-center justify-center rounded-md text-ink-muted hover:bg-muted hover:text-ink"><Trash size={18} /></button>
                  <LinkButton to="/checkout/$planId" params={{ planId: i.planId }}>Zur Kasse</LinkButton>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

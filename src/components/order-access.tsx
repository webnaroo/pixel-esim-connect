import { useQuery } from "@tanstack/react-query";
import { orderViewQuery, type OrderView } from "@/lib/orders.functions";
import { fixtureOrder, FIXTURE_ORDER_ID } from "@/lib/fixtures/order";
import { USE_FIXTURES } from "@/lib/format";

/** Loads an order by guest token, or the clearly labelled fixture in test mode. */
export function useOrderAccess(orderId: string, token: string): { order: OrderView | null; loading: boolean; fixture: boolean } {
  const isFixture = USE_FIXTURES && orderId === FIXTURE_ORDER_ID;
  const valid = !isFixture && /^[0-9a-f-]{36}$/i.test(orderId) && token.length >= 10;
  const q = useQuery({ ...orderViewQuery(orderId, token), enabled: valid });
  if (isFixture) return { order: fixtureOrder, loading: false, fixture: true };
  if (!valid) return { order: null, loading: false, fixture: false };
  return { order: q.data ?? null, loading: q.isLoading, fixture: false };
}

export const noindexHead = (title: string, description: string) => ({
  meta: [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ],
});

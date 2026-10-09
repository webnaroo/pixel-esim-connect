import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { decideRefundRequest, refundRequestsQuery } from "@/lib/orders.functions";
import { Button } from "@/components/ui-kit";
import { formatPrice } from "@/lib/format";

/** Open customer refund requests; admin approves (Stripe refund) or rejects. */
export function RefundRequests() {
  const q = useQuery(refundRequestsQuery());
  const qc = useQueryClient();
  const decide = useServerFn(decideRefundRequest);
  const [busy, setBusy] = useState<string | null>(null);
  const list = q.data ?? [];
  if (!list.length) return null;
  const act = async (id: string, approve: boolean) => {
    if (!confirm(approve ? "Erstattung freigeben? Das Geld geht komplett über Stripe zurück, die eSIM ist danach gesperrt." : "Anfrage ablehnen?")) return;
    setBusy(id);
    try {
      await decide({ data: { ticketId: id, approve } });
      toast.success(approve ? "Erstattung freigegeben" : "Anfrage abgelehnt");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Fehlgeschlagen"); }
    finally { setBusy(null); }
  };
  return (
    <section role="alert" className="rounded-lg border border-line border-l-4 border-l-warning bg-surface p-4">
      <h2 className="font-semibold">{list.length} offene Erstattungsanfrage{list.length > 1 ? "n" : ""}</h2>
      <ul className="mt-3 divide-y divide-line">
        {list.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">Nr. {r.order_id?.slice(0, 8)} · {r.plan || "Tarif"} · {r.amount != null ? formatPrice(r.amount, r.currency) : "–"}</p>
              <p className="text-ink-muted">{r.email} · {new Date(r.created_at).toLocaleString("de-DE")}{r.order_status ? ` · ${r.order_status}` : ""}</p>
              <p className="mt-1 break-words">„{r.message}“</p>
            </div>
            <div className="flex gap-2">
              <Button loading={busy === r.id} onClick={() => act(r.id, true)}>Erstattung freigeben</Button>
              <Button variant="outline" disabled={busy === r.id} onClick={() => act(r.id, false)}>Ablehnen</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

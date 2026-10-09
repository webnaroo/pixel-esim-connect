import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { previewPriceChange, commitPriceChange, type PriceChangeInput } from "@/lib/price-management.functions";
import { Button } from "./ui-kit";

export function usePriceConfirmation() {
  const preview = useServerFn(previewPriceChange);
  const commit = useServerFn(commitPriceChange);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ change: PriceChangeInput; preview: Awaited<ReturnType<typeof previewPriceChange>> } | null>(null);
  const request = async (change: PriceChangeInput) => {
    setBusy(true);
    try { setPending({ change, preview: await preview({ data: change }) }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Vorschau nicht verfügbar."); throw e; }
    finally { setBusy(false); }
  };
  const dialog = pending ? (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="price-confirm-title" className="w-full max-w-lg rounded-lg border border-line bg-surface p-6">
        <h2 id="price-confirm-title" className="text-xl">Preisänderung bestätigen</h2>
        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-2 text-sm tabular">
          <dt>Preise ändern sich</dt><dd>{pending.preview.counts.changed}</dd>
          <dt>Unverändert (Rundung / Mindestgewinn)</dt><dd>{pending.preview.counts.unchanged}</dd>
          <dt>Unverändert (Preis überschrieben)</dt><dd>{pending.preview.counts.overridden}</dd>
          <dt>Unter Mindestgewinn (überschrieben)</dt><dd>{pending.preview.counts.belowMin}</dd>
          <dt>Nicht berechenbar</dt><dd>{pending.preview.counts.invalid}</dd>
        </dl>
        {pending.preview.counts.invalid > 0 && <p className="mt-3 text-sm text-danger">Bitte fehlende Zuordnungen oder Preiseingaben korrigieren. Es wird nichts gespeichert.</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" disabled={busy} onClick={() => setPending(null)}>Abbrechen</Button>
          <Button loading={busy} disabled={pending.preview.counts.invalid > 0} onClick={async () => {
            setBusy(true);
            try {
              const r = await commit({ data: { change: pending.change, digest: pending.preview.digest } });
              toast.success(`${r.changed} Preise geändert · ${r.calculated} Tarife berechnet.`);
              setPending(null);
              await qc.invalidateQueries();
            } catch (e) { toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen."); setPending(null); }
            finally { setBusy(false); }
          }}>Bestätigen und speichern</Button>
        </div>
      </div>
    </div>
  ) : null;
  return { request, dialog, busy };
}
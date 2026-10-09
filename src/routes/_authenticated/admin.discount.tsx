import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createDiscountCode, deleteDiscountCode, discountCodesQuery, setDiscountCodeActive } from "@/lib/discount.functions";
import { Button, Input } from "@/components/ui-kit";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/discount")({
  head: () => privateHead("Rabattcodes", "Rabattcodes im GlobeSIM-Admin anlegen und verwalten."),
  loader: ({ context }) => context.queryClient.ensureQueryData(discountCodesQuery()),
  errorComponent: AdminError,
  component: Discounts,
});

const sel = "h-12 w-full rounded-md border border-line-strong bg-surface px-3 text-base";
const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
const dt = (s: string | null) => (s ? new Date(s).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "–");

function valueLabel(c: { type: "percent" | "fixed"; value: number }) {
  return c.type === "percent" ? `${Number(c.value).toLocaleString("de-DE")} %` : `${eur(Number(c.value))}`;
}

function Discounts() {
  const { data } = useSuspenseQuery(discountCodesQuery());
  const qc = useQueryClient();
  const create = useServerFn(createDiscountCode);
  const setActive = useServerFn(setDiscountCodeActive);
  const del = useServerFn(deleteDiscountCode);
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const validUntilRaw = String(f.get("valid_until") ?? "").trim();
    setBusy(true);
    try {
      const r = await create({ data: {
        code: String(f.get("code") ?? ""),
        type,
        value: Number(String(f.get("value") ?? "").replace(",", ".")),
        maxUses: String(f.get("max_uses") ?? "").trim() ? Number(f.get("max_uses")) : null,
        validUntil: validUntilRaw ? new Date(validUntilRaw).toISOString() : null,
        note: String(f.get("note") ?? "").trim() || null,
      } });
      if (r.ok) { toast.success(`Code „${r.code}“ angelegt.`); e.currentTarget.reset(); refresh(); }
      else toast.error(r.error);
    } catch {
      toast.error("Bitte Eingaben prüfen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 [&>*]:min-w-0">
      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl">Rabattcode anlegen</h2>
        <p className="mt-1 text-sm text-ink-muted">Kunden geben den Code an der Kasse ein. Der Rabatt wird sofort vom Endpreis abgezogen.</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">Code</span>
            <Input name="code" required minLength={3} maxLength={40} placeholder="z. B. SOMMER10" className="mt-2 uppercase" autoComplete="off" />
            <span className="mt-1.5 block text-xs text-ink-muted">3–40 Zeichen: Buchstaben, Zahlen, Bindestrich, Unterstrich. Wird automatisch in Großbuchstaben gespeichert.</span>
          </label>
          <div>
            <span className="text-sm font-medium text-ink">Art</span>
            <div className="mt-2 inline-flex rounded-md border border-line bg-surface p-1" role="tablist" aria-label="Rabatt-Art">
              {([["percent", "Prozent"], ["fixed", "Fester Betrag"]] as const).map(([v, l]) => (
                <button key={v} type="button" role="tab" aria-selected={type === v} onClick={() => setType(v)}
                  className={`h-10 rounded-[9px] px-4 text-sm font-medium ${type === v ? "bg-primary text-primary-foreground" : "text-ink-muted hover:text-ink"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-ink">{type === "percent" ? "Prozent (z. B. 10)" : "Betrag in EUR (z. B. 5)"}</span>
            <Input name="value" required type="number" min="0.01" max={type === "percent" ? 100 : 100000} step="0.01" className="mt-2" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Nutzungslimit</span>
              <Input name="max_uses" type="number" min="1" max="1000000" step="1" placeholder="unbegrenzt" className="mt-2" />
              <span className="mt-1.5 block text-xs text-ink-muted">Leer = unbegrenzt oft einlösbar.</span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Gültig bis</span>
              <Input name="valid_until" type="datetime-local" className="mt-2" />
              <span className="mt-1.5 block text-xs text-ink-muted">Leer = kein Ablaufdatum.</span>
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-ink">Notiz (intern, optional)</span>
            <Input name="note" maxLength={500} placeholder="z. B. Newsletter-Kampagne Oktober" className="mt-2" />
          </label>
          <Button type="submit" loading={busy}>Code anlegen</Button>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl">Codes ({data.codes.length})</h2>
        {data.codes.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">Noch kein Code angelegt.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {data.codes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <span className="font-mono text-sm font-semibold text-ink">{c.code}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-ink-muted">{valueLabel(c)}</span>
                <span className="text-xs text-ink-muted">
                  benutzt: {c.times_used}{c.max_uses != null ? ` / ${c.max_uses}` : ""} · gültig bis: {dt(c.valid_until)}
                </span>
                {c.note && <span className="w-full truncate text-xs text-ink-muted">Notiz: {c.note}</span>}
                <span className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => { await setActive({ data: { id: c.id, active: !c.active } }); refresh(); }}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${c.active ? "bg-muted text-ink" : "bg-muted text-ink-muted line-through"}`}
                  >
                    {c.active ? "aktiv" : "inaktiv"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => { if (!confirm(`Code „${c.code}“ wirklich löschen?`)) return; await del({ data: { id: c.id } }); refresh(); toast.success("Code gelöscht."); }}
                    className="text-xs text-ink-muted hover:text-danger"
                    aria-label={`Code ${c.code} löschen`}
                  >
                    Löschen
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-ink-muted">
          „Benutzt“ zählt jede gestartete Kasse mit diesem Code. Wird die Zahlung nicht angelegt, gibt der Shop die Nutzung automatisch wieder frei.
        </p>
      </section>
    </div>
  );
}

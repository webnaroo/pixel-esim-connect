import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Warning } from "@phosphor-icons/react";
import { confirmNoThrottle, revokeNoThrottle, saveUnlimitedClaimTexts, throttleReviewQuery } from "@/lib/admin.functions";
import { hasThrottleHint, type FairUse } from "@/lib/throttle";
import { Button, Input } from "@/components/ui-kit";
import { Chip } from "@/components/brand";
import { AdminError } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/unlimited")({
  loader: ({ context }) => context.queryClient.ensureQueryData(throttleReviewQuery()),
  errorComponent: AdminError,
  component: UnlimitedReview,
});

const CLAIM: Record<string, { label: string; tone: "default" | "active" | "warning" | "muted" }> = {
  unknown: { label: "Nicht bestätigt", tone: "muted" },
  none_confirmed: { label: "Drosselfrei bestätigt", tone: "active" },
  conflict: { label: "Widerspruch zur Bestätigung", tone: "warning" },
};

function UnlimitedReview() {
  const { data } = useSuspenseQuery(throttleReviewQuery());
  const qc = useQueryClient();
  const confirm = useServerFn(confirmNoThrottle);
  const revoke = useServerFn(revokeNoThrottle);
  const saveTexts = useServerFn(saveUnlimitedClaimTexts);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [source, setSource] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [acceptHint, setAcceptHint] = useState(false);
  const [texts, setTexts] = useState({ label: data.texts?.label ?? "", qualifier: data.texts?.qualifier ?? "", note: data.texts?.note ?? "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "throttle"] });
  const ids = [...picked];
  const pickedWithHint = data.plans.filter((p) => picked.has(p.id) && hasThrottleHint(p.fair_use as FairUse));
  const conflicts = data.plans.filter((p) => p.throttle_claim === "conflict");

  async function onConfirm() {
    if (!ids.length) return toast.error("Bitte Tarife auswählen.");
    if (source.trim().length < 3) return toast.error("Quelle ist Pflicht.");
    if (!date) return toast.error("Datum ist Pflicht.");
    setBusy(true);
    try {
      const r = await confirm({ data: { planIds: ids, source, date, acceptHint } });
      toast.success(`${r.confirmed} bestätigt${r.conflict ? `, ${r.conflict} mit Widerspruch` : ""}.`);
      setPicked(new Set()); setAcceptHint(false); refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function onRevoke() {
    if (!ids.length) return toast.error("Bitte Tarife auswählen.");
    await revoke({ data: { planIds: ids } }); toast.success("Bestätigung zurückgenommen."); setPicked(new Set()); refresh();
  }

  return (
    <div className="space-y-10">
      {conflicts.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-lg border border-warning bg-surface p-4">
          <Warning size={22} className="shrink-0 text-warning" weight="fill" />
          <div>
            <p className="font-medium">{conflicts.length} Tarif(e): Widerspruch zur Bestätigung</p>
            <p className="text-sm text-ink-muted">Der Katalog von eSIMerge enthält einen Drosselungshinweis. „Ohne Drosselung“ ist für diese Tarife ausgeblendet, bis du entscheidest.</p>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xl">Unlimited-Tarife</h2>
        <p className="mt-1 text-sm text-ink-muted">Nichts wird automatisch bestätigt. Wähle Tarife aus und trage die Bestätigung von eSIMerge mit Quelle und Datum ein.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-ink-muted">
              <tr>
                <th className="p-3"><input type="checkbox" aria-label="Alle auswählen" checked={picked.size === data.plans.length && data.plans.length > 0} onChange={(e) => setPicked(new Set(e.target.checked ? data.plans.map((p) => p.id) : []))} /></th>
                <th className="p-3">Tarif</th><th className="p-3">Hinweis des Anbieters</th><th className="p-3">Status</th><th className="p-3">Bestätigung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.plans.map((p) => {
                const fu = p.fair_use as FairUse;
                const conf = p.throttle_confirmation as { source?: string; date?: string; acceptedFairUse?: unknown } | null;
                const c = CLAIM[p.throttle_claim] ?? CLAIM["unknown"]!;
                return (
                  <tr key={p.id}>
                    <td className="p-3"><input type="checkbox" aria-label={`${p.provider_plan_id} auswählen`} checked={picked.has(p.id)} onChange={(e) => { const n = new Set(picked); if (e.target.checked) n.add(p.id); else n.delete(p.id); setPicked(n); }} /></td>
                    <td className="p-3"><div className="font-medium">{(p.destination as { name_de?: string } | null)?.name_de ?? "–"} · {p.validity_days} Tage</div><div className="text-xs text-ink-muted">{p.provider_plan_id}{p.is_active ? "" : " · inaktiv"}</div></td>
                    <td className="p-3">{fu?.note ?? (hasThrottleHint(fu) ? "Drosselung angegeben" : "–")}{hasThrottleHint(fu) && <div className="text-xs text-warning">Drosselungshinweis</div>}</td>
                    <td className="p-3"><Chip tone={c.tone}>{c.label}</Chip></td>
                    <td className="p-3 text-xs text-ink-muted">{conf?.source ? <>{conf.source}<br />{conf.date}{conf.acceptedFairUse ? " · Hinweis geprüft" : ""}</> : "–"}</td>
                  </tr>
                );
              })}
              {!data.plans.length && <tr><td colSpan={5} className="p-4 text-ink-muted">Noch keine Unlimited-Tarife im Katalog.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3 rounded-lg border border-line p-4">
          <p className="font-medium">Sammelaktion für {ids.length} ausgewählte Tarif(e)</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Input aria-label="Quelle" placeholder="Quelle: Link oder z. B. „E-Mail von eSIMerge vom 08.10.2026“ (Pflicht)" value={source} onChange={(e) => setSource(e.target.value)} />
            <Input aria-label="Datum" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {pickedWithHint.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={acceptHint} onChange={(e) => setAcceptHint(e.target.checked)} />
              <span>{pickedWithHint.length} ausgewählte(r) Tarif(e) haben im Katalog einen Drosselungshinweis. Ich habe den Widerspruch geprüft und die Bestätigung soll trotzdem gelten. Ohne Haken landen sie als „Widerspruch zur Bestätigung“ hier und „ohne Drosselung“ bleibt ausgeblendet.</span>
            </label>
          )}
          <div className="flex flex-wrap gap-3">
            <Button onClick={onConfirm} loading={busy}>Als drosselfrei bestätigt</Button>
            <Button variant="secondary" onClick={onRevoke}>Bestätigung zurücknehmen</Button>
          </div>
        </div>
      </section>

      <section className="max-w-2xl">
        <h2 className="text-xl">Texte zur Anzeige</h2>
        <p className="mt-1 text-sm text-ink-muted">Erscheinen auf Tarifkarte, Kasse, Bestätigungsseite, E-Mail und Konto. Nach der juristischen Prüfung hier anpassen.</p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">Aussage<Input value={texts.label} onChange={(e) => setTexts({ ...texts, label: e.target.value })} /></label>
          <label className="block text-sm font-medium">Zusatz<Input value={texts.qualifier} onChange={(e) => setTexts({ ...texts, qualifier: e.target.value })} /></label>
          <label className="block text-sm font-medium">Erläuterung (aufklappbar)
            <textarea rows={3} value={texts.note} onChange={(e) => setTexts({ ...texts, note: e.target.value })} className="mt-1 w-full rounded-md border border-line-strong bg-surface p-3 text-base" />
          </label>
          <Button variant="secondary" onClick={async () => { try { await saveTexts({ data: texts }); toast.success("Texte gespeichert."); qc.invalidateQueries({ queryKey: ["unlimited-claim"] }); refresh(); } catch (e) { toast.error((e as Error).message); } }}>Texte speichern</Button>
        </div>
      </section>
    </div>
  );
}

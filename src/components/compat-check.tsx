import { useMemo, useState } from "react";
import * as D from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { CaretDown, CheckCircle, MagnifyingGlass, X } from "@phosphor-icons/react";
import { supabase } from "@/integrations/supabase/client";
import { groupDevices, matchesDevice, MIN_SEARCH } from "@/lib/devices";
import { btnClass } from "@/components/ui-kit";

type Row = { id: string; manufacturer: string; model: string; release_year: number | null; notes: string | null };

async function loadDevices(): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("esim_devices").select("id,manufacturer,model,release_year,notes").eq("active", true).eq("esim_supported", true).range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

export function CompatCheck({ hint = false, className }: { hint?: boolean; className?: string }) {
  return (
    <div className={className}>
      <D.Root>
        <D.Trigger className={btnClass("secondary", "h-11! px-4 text-sm")}>
          <CheckCircle size={18} weight="bold" aria-hidden className="text-primary" /> Kompatibilität prüfen
        </D.Trigger>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-[110] bg-ink/40" />
          <D.Content aria-label="Kompatibilität prüfen" aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-[110] flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-background text-ink outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-[min(640px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
            <CompatBody />
          </D.Content>
        </D.Portal>
      </D.Root>
      {hint && <p className="mt-1 text-xs text-ink-muted">Prüfe vor dem Kauf, ob dein Gerät eSIM unterstützt.</p>}
    </div>
  );
}

function CompatBody() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["esim-devices"], queryFn: loadDevices, staleTime: 5 * 60_000 });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const groups = useMemo(() => groupDevices(data ?? []), [data]);
  const searching = q.replace(/\s+/g, "").length >= MIN_SEARCH;
  const filtered = useMemo(() => {
    if (!searching) return groups.map((g) => ({ ...g, hits: new Set<string>() }));
    return groups.flatMap((g) => {
      const mfrHit = matchesDevice({ manufacturer: g.manufacturer, model: "" }, q);
      const hits = new Set(g.models.filter((m) => matchesDevice(m, q)).map((m) => m.id));
      if (!hits.size && !mfrHit) return [];
      return [{ ...g, hits }];
    });
  }, [groups, q, searching]);
  const count = data?.length ?? 0;
  const empty = !isLoading && !isError && count === 0;

  return (
    <>
      <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5 sm:px-6">
        <D.Title className="text-xl font-semibold">Kompatibilität prüfen</D.Title>
        <D.Close aria-label="Schließen" className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface text-ink hover:border-ink-muted">
          <X size={16} weight="bold" aria-hidden />
        </D.Close>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
        <p className="text-sm">Damit eine GlobeSIM funktioniert, muss dein Gerät diese Bedingungen erfüllen:</p>
        <ul className="mt-3 space-y-2 text-sm">
          {["Das Gerät unterstützt eSIM.", "Das Gerät ist nicht an einen Netzbetreiber gebunden (kein SIM-Lock).", "Das Gerät hat keinen Jailbreak (iOS) und ist nicht gerootet (Android)."].map((t) => (
            <li key={t} className="flex gap-2"><CheckCircle size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-primary" />{t}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-muted">Mit unserer Liste kannst du prüfen, ob dein Gerät eSIM-fähig ist. Beachte: Einige regionale Modelle unterstützen möglicherweise kein eSIM. Dein Gerät ist nicht dabei? Unsere Liste wird regelmäßig aktualisiert, ist aber nicht vollständig. Frag den Gerätehersteller nach eSIM-Unterstützung.</p>

        {empty ? (
          <p className="mt-5 rounded-[14px] border border-line p-4 text-sm">Die Geräteliste wird gerade aufgebaut. Frag im Zweifel den Hersteller.</p>
        ) : isError ? (
          <p className="mt-5 rounded-[14px] border border-line p-4 text-sm">Die Geräteliste konnte gerade nicht geladen werden. Frag im Zweifel den Hersteller.</p>
        ) : isLoading ? (
          <p className="mt-5 text-sm text-ink-muted">Geräteliste wird geladen …</p>
        ) : (
          <section className="mt-6" aria-label="Finde dein Gerät">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="text-base font-semibold">Finde dein Gerät</h3>
              <span className="text-xs text-ink-muted">{count} Modelle von {groups.length} Herstellern</span>
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-md border border-line-strong bg-surface px-3">
              <MagnifyingGlass size={18} aria-hidden className="shrink-0 text-ink-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} type="search" aria-label="Gerät suchen"
                placeholder="Hersteller oder Modell suchen" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted" />
            </label>
            {searching && !filtered.length ? (
              <p className="mt-4 text-sm">Kein Treffer. Frag bitte beim Hersteller nach eSIM-Unterstützung.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line">
                {filtered.map((g) => {
                  const isOpen = searching ? true : open.has(g.manufacturer);
                  return (
                    <li key={g.manufacturer}>
                      <button type="button" aria-expanded={isOpen} onClick={() => setOpen((s) => { const n = new Set(s); if (n.has(g.manufacturer)) n.delete(g.manufacturer); else n.add(g.manufacturer); return n; })}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                        <span className="font-medium">{g.manufacturer}</span>
                        <span className="flex items-center gap-2 text-xs text-ink-muted">{g.models.length} {g.models.length === 1 ? "Modell" : "Modelle"}<CaretDown size={14} aria-hidden className={isOpen ? "rotate-180" : ""} /></span>
                      </button>
                      {isOpen && (
                        <ul className="space-y-1 px-4 pb-3 text-sm">
                          {g.models.map((m) => (
                            <li key={m.id} className={g.hits.has(m.id) ? "rounded bg-primary/10 px-2 py-1 font-medium" : "px-2 py-1"}>
                              {m.model}{m.release_year ? <span className="text-ink-muted"> · {m.release_year}</span> : null}
                              {m.notes && <span className="block text-xs text-ink-muted">{m.notes}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}

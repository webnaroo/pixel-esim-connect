import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MagnifyingGlass, X, CaretRight, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { destinationsQuery, popularQuery, type DestinationListItem } from "@/lib/catalog.functions";
import { createSearchIndex } from "@/lib/search";
import { formatPrice } from "@/lib/format";
import { useIsMobile } from "@/hooks/use-mobile";
import { Flag } from "./brand";
import { cn } from "@/lib/utils";

const RECENT_KEY = "globesim:recent-searches";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function destinationHref(d: { type: string; slug: string }) {
  return d.type === "country" ? `/countries/${d.slug}` : `/regions/${d.slug}`;
}

export function SearchBox({ size = "lg", autoFocus }: { size?: "lg" | "sm"; autoFocus?: boolean }) {
  const { data: all = [], isLoading, isError, refetch } = useQuery(destinationsQuery());
  const { data: popularSlugs = [] } = useQuery(popularQuery());
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const overlayInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 120);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (open) setRecent(readRecent());
  }, [open]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, isMobile]);

  useEffect(() => {
    if (open && isMobile) {
      overlayInput.current?.focus();
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    return undefined;
  }, [open, isMobile]);

  const search = useMemo(
    () => createSearchIndex(all.map((d) => ({ id: d.id, type: d.type, slug: d.slug, name: d.name, aliases: d.aliases, flagCode: d.flagCode, fromPrice: d.fromPrice }))),
    [all],
  );
  const bySlug = useMemo(() => new Map(all.map((d) => [d.slug, d])), [all]);

  const results = debounced.trim() ? search(debounced, 8) : [];
  const countries = results.filter((r) => r.type === "country");
  const regions = results.filter((r) => r.type !== "country");
  const ordered = [...countries, ...regions];

  const popular = popularSlugs.map((s) => bySlug.get(s)).filter(Boolean).slice(0, 6) as DestinationListItem[];
  const recentItems = recent.map((s) => bySlug.get(s)).filter(Boolean).slice(0, 4) as DestinationListItem[];
  const idle = !debounced.trim();
  const idleList = [...recentItems, ...popular.filter((p) => !recentItems.includes(p))];
  const list = idle ? idleList : ordered;

  useEffect(() => setActive(0), [debounced]);

  function go(d: { type: string; slug: string }) {
    const next = [d.slug, ...readRecent().filter((s) => s !== d.slug)].slice(0, 6);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setOpen(false);
    setQ("");
    navigate({ to: destinationHref(d) });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      const item = list[active];
      if (item) {
        e.preventDefault();
        go(item);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      (e.target as HTMLInputElement).blur();
    }
  }

  const inputProps = {
    role: "combobox" as const,
    "aria-expanded": open,
    "aria-controls": listId,
    "aria-autocomplete": "list" as const,
    "aria-activedescendant": open && list[active] ? `${listId}-${active}` : undefined,
    value: q,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setQ(e.target.value);
      setOpen(true);
    },
    onKeyDown,
    placeholder: "Wohin reist du?",
    autoComplete: "off",
    spellCheck: false,
  };

  const panel = (
    <div id={listId} role="listbox" aria-label="Suchergebnisse" aria-busy={isLoading && all.length === 0 ? true : undefined} className="py-2">
      {all.length === 0 && isError ? (
        <div role="alert" className="px-4 py-6 text-sm">
          <p className="font-medium text-ink">Die Reiseziele konnten nicht geladen werden.</p>
          <p className="mt-1 text-ink-muted">Prüfe deine Verbindung und versuche es erneut.</p>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => refetch()} className="mt-3 inline-flex min-h-10 items-center rounded-md border border-line-strong bg-surface px-4 font-medium text-ink transition-[border-color,transform] duration-(--dur-hover) ease-ui-out hover:border-ink-muted active:scale-[0.97]">
            Erneut versuchen
          </button>
        </div>
      ) : all.length === 0 && isLoading ? (
        <div role="status" aria-label="Reiseziele werden geladen">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} aria-hidden className="flex min-h-14 items-center gap-3 px-4 py-2">
              <div className="size-7 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : idle && idleList.length === 0 ? (
        <div className="px-4 py-6 text-sm text-ink-muted">
          Aktuell sind keine Reiseziele verfügbar.{" "}
          <Link to="/destinations" onClick={() => setOpen(false)} className="font-medium text-primary underline-offset-4 hover:underline">
            Alle Reiseziele
          </Link>
        </div>
      ) : idle ? (
        <>
          {recentItems.length > 0 && <GroupLabel>Zuletzt gesucht</GroupLabel>}
          {recentItems.map((d, i) => (
            <ResultItem key={`r-${d.id}`} id={`${listId}-${i}`} d={d} active={active === i} onSelect={() => go(d)} />
          ))}
          {popular.length > 0 && <GroupLabel>Beliebt</GroupLabel>}
          {popular
            .filter((p) => !recentItems.includes(p))
            .map((d, i) => (
              <ResultItem key={`p-${d.id}`} id={`${listId}-${i + recentItems.length}`} d={d} active={active === i + recentItems.length} onSelect={() => go(d)} />
            ))}
        </>
      ) : ordered.length === 0 ? (
        <div className="px-4 py-6 text-sm text-ink-muted">
          Kein Ergebnis für „{debounced}“. Versuche einen anderen Namen oder schau in die Regionen.{" "}
          <Link to="/destinations" onClick={() => setOpen(false)} className="font-medium text-primary underline-offset-4 hover:underline">
            Alle Reiseziele
          </Link>
        </div>
      ) : (
        <>
          {countries.length > 0 && <GroupLabel>Länder</GroupLabel>}
          {countries.map((d, i) => (
            <ResultItem key={d.id} id={`${listId}-${i}`} d={d} active={active === i} onSelect={() => go(d)} />
          ))}
          {regions.length > 0 && <GroupLabel>Regionen</GroupLabel>}
          {regions.map((d, i) => (
            <ResultItem key={d.id} id={`${listId}-${i + countries.length}`} d={d} active={active === i + countries.length} onSelect={() => go(d)} />
          ))}
        </>
      )}
    </div>
  );

  const big = size === "lg";

  return (
    <div ref={wrapRef} className="relative w-full">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Reiseziel suchen
      </label>
      <div className="group/search relative">
        <MagnifyingGlass aria-hidden size={big ? 22 : 18} className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-muted transition-colors duration-(--dur-hover) ease-ui-out group-focus-within/search:text-primary", big ? "left-4 lg:left-5" : "left-4")} />
        <input
          id={`${listId}-input`}
          {...inputProps}
          autoFocus={autoFocus}
          onFocus={() => setOpen(true)}
          readOnly={isMobile && open}
          className={cn(
            "w-full rounded-md border border-line-control bg-surface text-ink placeholder:text-ink-muted transition-[border-color,box-shadow] duration-(--dur-hover) ease-ui-out hover:border-ink-muted focus:border-primary focus:outline-none focus-visible:outline-none focus:ring-[3px] focus:ring-primary/20",
            big ? "h-14 pl-12 pr-24 text-[17px] shadow-raised lg:h-16 lg:pl-14 lg:text-lg" : "h-11 pl-10 pr-10 text-base lg:text-[15px]",
          )}
        />
        {!big && !q && (
          <kbd aria-hidden className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line px-1.5 font-sans text-xs leading-5 text-ink-muted group-focus-within/search:hidden lg:block">/</kbd>
        )}
        {q && (
          <button aria-label="Eingabe löschen" onClick={() => setQ("")} className={cn("absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition-colors duration-(--dur-hover) ease-ui-out hover:text-ink", big ? "right-14 lg:right-16" : "right-2")}>
            <X size={18} />
          </button>
        )}
        {big && (
          <button
            type="button"
            aria-label="Reiseziel suchen"
            onClick={() => {
              const item = debounced.trim() ? list[active] : undefined;
              if (item) go(item);
              else {
                setOpen(true);
                (wrapRef.current?.querySelector("input") as HTMLInputElement | null)?.focus();
              }
            }}
            className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-md bg-primary text-primary-foreground transition-[background-color,transform] duration-(--dur-hover) ease-ui-out hover:bg-primary-hover active:scale-[0.94] lg:size-12"
          >
            <ArrowRight size={20} weight="bold" aria-hidden />
          </button>
        )}
      </div>

      {open && !isMobile && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70dvh] origin-top overflow-auto rounded-lg border border-line bg-surface shadow-overlay animate-in fade-in-0 slide-in-from-top-1 duration-(--dur-hover) ease-ui-out">
          {panel}
        </div>
      )}

      {open && isMobile && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-surface animate-in fade-in-0 slide-in-from-bottom-2 duration-(--dur-pop) ease-ui-out" role="dialog" aria-modal="true" aria-label="Reiseziel suchen">
          <div className="flex items-center gap-2 border-b border-line px-3 py-3">
            <button aria-label="Suche schließen" onClick={() => setOpen(false)} className="flex size-12 items-center justify-center rounded-md text-ink">
              <ArrowLeft size={22} />
            </button>
            <div className="relative flex-1">
              <input
                ref={overlayInput}
                {...inputProps}
                className="h-12 w-full rounded-md border border-line-control bg-surface px-4 pr-10 text-base text-ink placeholder:text-ink-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20"
              />
              {q && (
                <button aria-label="Eingabe löschen" onClick={() => setQ("")} className="absolute right-1 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center text-ink-muted">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto">{panel}</div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">{children}</div>;
}

function ResultItem({ d, active, onSelect, id }: { d: { name: string; type: string; flagCode: string | null; fromPrice: number | null }; active: boolean; onSelect: () => void; id: string }) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      className={cn("flex min-h-14 cursor-pointer items-center gap-3 px-4 py-2 transition-colors duration-(--dur-press) ease-ui-out active:bg-muted", active && "bg-muted")}
    >
      <Flag code={d.type === "country" ? d.flagCode : null} size={28} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="hyphens-auto break-words text-base font-medium leading-5 text-ink lg:text-[15px]">{d.name}</div>
        <div className="mt-0.5 text-xs text-ink-muted">{d.type === "country" ? "Land" : d.type === "global" ? "Weltweit" : "Region"}</div>
      </div>
      {d.fromPrice != null && <span className="tabular shrink-0 whitespace-nowrap text-sm font-semibold text-ink">ab {formatPrice(d.fromPrice)}</span>}
      <CaretRight aria-hidden size={16} className="shrink-0 text-ink-muted" />
    </div>
  );
}

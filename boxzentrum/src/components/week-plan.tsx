import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { audiences, tracks, type Audience, type Day, type Track } from "@/content/courses";
import { dayNames, kielClock, toMinutes, trainingDays, weekSlots, type Slot } from "@/content/schedule";

type Filter = "alle" | Audience;
const filterList: Filter[] = ["alle", "kinder", "jugend", "erwachsene", "frauen"];
const filterLabel = (f: Filter) => (f === "alle" ? "Alle" : audiences[f].label);
const legendTracks: Track[] = ["vollkontakt", "fitboxen", "kraft", "frei"];

const DAY_START = 16 * 60;
const DAY_END = 21 * 60;
const PPM = 2.3; // Pixel pro Minute in der Wochenansicht

const matches = (slot: Slot, f: Filter) => f === "alle" || slot.course.audiences.includes(f);

function useKielToday() {
  const [clock, setClock] = useState<{ day: Day; minute: number } | null>(null);
  useEffect(() => {
    const tick = () => setClock(kielClock(new Date()));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return clock;
}

export function WeekPlan({ initialFilter = "alle" }: { initialFilter?: Filter }) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const clock = useKielToday();

  return (
    <div>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div role="group" aria-label="Nach Zielgruppe filtern" className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1 xl:mx-0 xl:px-0">
          {filterList.map((f) => (
            <button key={f} type="button" className="chip flex-none" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {filterLabel(f)}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[0.8125rem] text-ash" aria-label="Farblegende">
          {legendTracks.map((t) => (
            <li key={t} className="flex items-center gap-2">
              <span className="h-3 w-[3px] rounded-full" style={{ background: tracks[t].color }} />
              {tracks[t].label}
            </li>
          ))}
        </ul>
      </div>

      <DayPager filter={filter} today={clock?.day ?? null} />
      <WeekGrid filter={filter} clock={clock} />
    </div>
  );
}

/* ── Handy & Tablet: Tage zum Wischen ─────────────────────────── */
function DayPager({ filter, today }: { filter: Filter; today: Day | null }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Day>(trainingDays[0]!);
  const initialised = useRef(false);

  // Startet beim heutigen Tag (am Wochenende: Montag)
  useEffect(() => {
    if (today === null || initialised.current) return;
    initialised.current = true;
    const start = trainingDays.includes(today) ? today : trainingDays[0]!;
    setActive(start);
    const idx = trainingDays.indexOf(start);
    const el = scroller.current;
    if (el) el.scrollTo({ left: idx * el.clientWidth, behavior: "instant" as ScrollBehavior });
  }, [today]);

  const go = (day: Day) => {
    setActive(day);
    const el = scroller.current;
    if (el) el.scrollTo({ left: trainingDays.indexOf(day) * el.clientWidth, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    const day = trainingDays[idx];
    if (day && day !== active) setActive(day);
  };

  return (
    <div className="mt-8 xl:hidden">
      <div role="tablist" aria-label="Wochentag" className="grid grid-cols-5 gap-1 rounded-full bg-coal p-1 ring-1 ring-iron">
        {trainingDays.map((d) => (
          <button
            key={d}
            role="tab"
            type="button"
            id={`tab-${d}`}
            aria-selected={active === d}
            aria-controls={`panel-${d}`}
            onClick={() => go(d)}
            className="relative h-11 rounded-full text-[0.9375rem] font-[620] text-fog transition-colors duration-200 aria-selected:bg-bone aria-selected:text-pitch"
          >
            {dayNames[d].short}
            {today === d && <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-red" aria-label="heute" />}
          </button>
        ))}
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="no-scrollbar -mx-[var(--gutter)] mt-6 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {trainingDays.map((d) => {
          const slots = weekSlots.filter((s) => s.day === d);
          const shown = slots.filter((s) => matches(s, filter));
          return (
            <section
              key={d}
              id={`panel-${d}`}
              role="tabpanel"
              aria-labelledby={`tab-${d}`}
              className="w-full flex-none snap-start px-[var(--gutter)]"
            >
              <h3 className="flex items-baseline justify-between">
                <span className="t-display text-[2.4rem] text-bone">{dayNames[d].long}</span>
                <span className="text-[0.8125rem] text-ash">
                  {shown.length} {shown.length === 1 ? "Einheit" : "Einheiten"}
                  {today === d ? ", heute" : ""}
                </span>
              </h3>
              {shown.length === 0 ? (
                <p className="mt-6 rounded-[1rem] bg-coal p-5 text-[0.9375rem] text-fog ring-1 ring-iron">
                  An diesem Tag gibt es kein Training für {filterLabel(filter)}. Wisch zum nächsten Tag oder wähle „Alle“.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {shown.map((s) => (
                    <li key={s.course.slug + s.start + s.hall}>
                      <SlotCard slot={s} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SlotCard({ slot }: { slot: Slot }) {
  return (
    <Link
      to="/training/$slug"
      params={{ slug: slot.course.slug }}
      className="group flex items-stretch gap-4 rounded-[1rem] bg-coal p-4 ring-1 ring-iron transition-[background-color,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.985]"
    >
      <div className="w-[3.6rem] flex-none">
        <p className="tnum text-[1.25rem] font-[700] leading-none text-bone">{slot.start}</p>
        <p className="tnum mt-1.5 text-[0.8125rem] text-ash">{slot.end}</p>
      </div>
      <span className="w-[3px] flex-none rounded-full" style={{ background: tracks[slot.course.track].color }} />
      <div className="min-w-0 flex-1">
        <p className="text-[1.0625rem] font-[640] leading-tight text-bone">{slot.course.name}</p>
        <p className="mt-1 text-[0.8125rem] text-ash">
          {slot.hall}, {slot.minutes} Min., {slot.course.access}
        </p>
      </div>
    </Link>
  );
}

/* ── Desktop: Wochenraster mit zwei Hallen pro Tag ────────────── */
function WeekGrid({ filter, clock }: { filter: Filter; clock: { day: Day; minute: number } | null }) {
  const hours = useMemo(() => {
    const list: number[] = [];
    for (let m = DAY_START; m <= DAY_END; m += 60) list.push(m);
    return list;
  }, []);
  const height = (DAY_END - DAY_START) * PPM;
  const nowVisible = clock && clock.minute >= DAY_START && clock.minute <= DAY_END;

  return (
    <div className="mt-12 hidden xl:block">
      <div className="grid grid-cols-[3.5rem_repeat(5,1fr)] gap-x-2">
        <div />
        {trainingDays.map((d) => (
          <div key={d} className="pb-4">
            <p className="flex items-center gap-2">
              <span className="t-display text-[2rem] text-bone">{dayNames[d].long}</span>
              {clock?.day === d && <span className="rounded-full bg-red px-2 py-0.5 text-[0.6875rem] font-[700] text-white">Heute</span>}
            </p>
            <div className="mt-2 grid grid-cols-2 text-[0.75rem] text-ash">
              <span>Halle 1</span>
              <span>Halle 2</span>
            </div>
          </div>
        ))}

        {/* Zeitachse */}
        <div className="relative" style={{ height }}>
          {hours.map((m) => (
            <span key={m} className="tnum absolute -translate-y-1/2 text-[0.75rem] text-ash" style={{ top: (m - DAY_START) * PPM }}>
              {m / 60}:00
            </span>
          ))}
        </div>

        {trainingDays.map((d) => (
          <div
            key={d}
            className={`relative rounded-[0.875rem] ${clock?.day === d ? "bg-bone/[0.035] ring-1 ring-bone/10" : ""}`}
            style={{ height }}
          >
            {hours.map((m) => (
              <span key={m} aria-hidden className="absolute inset-x-0 border-t border-iron/70" style={{ top: (m - DAY_START) * PPM }} />
            ))}
            <span aria-hidden className="absolute inset-y-0 left-1/2 border-l border-dashed border-iron/50" />
            {weekSlots
              .filter((s) => s.day === d)
              .map((s) => {
                const on = matches(s, filter);
                const top = (toMinutes(s.start) - DAY_START) * PPM;
                const h = s.minutes * PPM - 4;
                return (
                  <Link
                    key={s.course.slug + s.start + s.hall}
                    to="/training/$slug"
                    params={{ slug: s.course.slug }}
                    tabIndex={on ? 0 : -1}
                    aria-hidden={!on}
                    className="group absolute overflow-hidden rounded-[0.625rem] bg-anthracite p-2.5 ring-1 ring-iron transition-[opacity,background-color,transform] duration-300 ease-[var(--ease-out)] hover:z-10 hover:bg-iron"
                    style={{
                      top: top + 2,
                      height: h,
                      left: s.hall === "Halle 1" ? 3 : "calc(50% + 3px)",
                      width: "calc(50% - 6px)",
                      opacity: on ? 1 : 0.16,
                      pointerEvents: on ? "auto" : "none",
                    }}
                  >
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full" style={{ background: tracks[s.course.track].color }} />
                    <p className="tnum text-[0.75rem] text-ash">
                      {s.start}–{s.end}
                    </p>
                    <p className="mt-1 hyphens-auto text-[0.875rem] font-[640] leading-[1.15] text-bone">{s.course.name}</p>
                    {h > 120 && <p className="mt-1 hyphens-auto text-[0.75rem] leading-snug text-ash">{s.course.access}</p>}
                  </Link>
                );
              })}
            {nowVisible && clock?.day === d && (
              <span aria-hidden className="absolute inset-x-0 z-20 h-0.5 bg-red" style={{ top: (clock.minute - DAY_START) * PPM }}>
                <span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-red" />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

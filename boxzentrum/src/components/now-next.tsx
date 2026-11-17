import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { dayNames, nowNext, relativeDay, type NowNext as NowNextState } from "@/content/schedule";
import { tracks } from "@/content/courses";
import { ArrowRight } from "./icons";

/**
 * Live-Hallenuhr: zeigt, was gerade im BoxZentrum läuft – oder was als Nächstes kommt.
 * Wird erst im Browser berechnet (Ortszeit Kiel), davor steht der Wochenrahmen.
 */
export function NowNext({ className = "" }: { className?: string }) {
  const [state, setState] = useState<NowNextState | null>(null);

  useEffect(() => {
    const tick = () => setState(nowNext(new Date()));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const live = state?.live ?? [];
  const next = state?.next;

  return (
    <Link
      to="/trainingsplan"
      className={`group block rounded-[1.375rem] bg-pitch/55 p-5 ring-1 ring-bone/12 backdrop-blur-xl transition-[background-color,box-shadow] duration-300 hover:bg-pitch/70 hover:ring-bone/25 ${className}`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        <span className={`dot ${live.length ? "pulse bg-red" : "bg-bone/50"}`} />
        <span className="text-[0.8125rem] font-[560] text-fog">
          {state === null ? "Trainingszeiten" : live.length ? "Jetzt in der Halle" : "Nächstes Training"}
        </span>
      </div>

      {state === null && (
        <p className="mt-3 text-[0.9375rem] leading-snug text-bone">
          Montag bis Freitag, ab 16 Uhr. <span className="text-fog">26 Einheiten pro Woche.</span>
        </p>
      )}

      {live.length > 0 && (
        <ul className="mt-3 space-y-2.5">
          {live.slice(0, 2).map((s) => (
            <li key={s.course.slug + s.hall}>
              <p className="text-[1.0625rem] font-[640] leading-tight text-bone">{s.course.name}</p>
              <p className="tnum mt-0.5 text-[0.8125rem] text-ash">
                {s.hall}, bis {s.end} Uhr
              </p>
            </li>
          ))}
        </ul>
      )}

      {state !== null && live.length === 0 && next && (
        <div className="mt-3">
          <p className="tnum t-display text-[2.6rem] leading-none text-bone">
            {relativeDay(next.daysAhead, next.slot.day) === dayNames[next.slot.day].long
              ? `${dayNames[next.slot.day].short} ${next.slot.start}`
              : `${relativeDay(next.daysAhead, next.slot.day)} ${next.slot.start}`}
          </p>
          <p className="mt-2 flex items-center gap-2 text-[0.9375rem] font-[600] text-bone">
            <span className="dot" style={{ background: tracks[next.slot.course.track].color }} />
            {next.slot.course.name}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-ash">
            {next.slot.hall}, {next.slot.course.access}
          </p>
        </div>
      )}

      <p className="mt-4 flex items-center justify-between border-t border-bone/10 pt-3 text-[0.8125rem] text-fog">
        Ganzer Wochenplan
        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}

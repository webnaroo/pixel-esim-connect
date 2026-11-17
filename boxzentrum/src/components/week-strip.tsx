import { Link } from "@tanstack/react-router";
import { tracks } from "@/content/courses";
import { dayNames, toMinutes, trainingDays, weekSlots } from "@/content/schedule";

const START = 16 * 60;
const END = 21 * 60;
const pct = (m: number) => ((m - START) / (END - START)) * 100;

/**
 * Die Trainingswoche als Lichtleiste: jede Einheit ein Balken, oben Halle 1, unten Halle 2.
 * Farbe = Trainingsart. Die ganze Grafik führt zum Trainingsplan (ein großes Ziel statt vieler winziger).
 */
export function WeekStrip() {
  return (
    <Link to="/trainingsplan" className="group block rounded-[1rem] outline-offset-8">
      <figure className="w-full">
        <div className="space-y-5">
          {trainingDays.map((d) => (
            <div key={d} className="grid grid-cols-[2.25rem_1fr] items-center gap-4">
              <span className="text-[0.875rem] font-[620] text-fog">{dayNames[d].short}</span>
              <div className="relative h-[1.9rem]">
                <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-iron" />
                {weekSlots
                  .filter((s) => s.day === d)
                  .map((s) => (
                    <span
                      key={s.course.slug + s.start + s.hall}
                      title={`${s.start}–${s.end} ${s.course.name} (${s.hall})`}
                      className="absolute h-[0.8rem] rounded-full transition-[transform,filter] duration-300 ease-[var(--ease-out)] group-hover:brightness-110"
                      style={{
                        left: `calc(${pct(toMinutes(s.start))}% + 1px)`,
                        width: `calc(${pct(toMinutes(s.end)) - pct(toMinutes(s.start))}% - 2px)`,
                        top: s.hall === "Halle 1" ? 0 : "auto",
                        bottom: s.hall === "Halle 2" ? 0 : "auto",
                        background: tracks[s.course.track].color,
                        opacity: s.course.track === "frei" ? 0.55 : 1,
                      }}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-[2.25rem_1fr] gap-4">
          <span />
          <div className="tnum relative h-4 text-[0.75rem] text-ash">
            {[16, 17, 18, 19, 20, 21].map((h) => (
              <span key={h} className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full" style={{ left: `${pct(h * 60)}%` }}>
                {h}:00
              </span>
            ))}
          </div>
        </div>
        <figcaption className="sr-only">Zum Trainingsplan. Wochenübersicht: obere Reihe Halle 1, untere Reihe Halle 2.</figcaption>
      </figure>
    </Link>
  );
}

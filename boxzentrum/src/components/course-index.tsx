import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { audiences, courses as allCourses, tracks, type Audience, type Course } from "@/content/courses";
import { courseDays } from "@/lib/format";
import { Photo } from "./photo";
import { ArrowRight } from "./icons";

type Filter = "alle" | Audience;
const filters: { id: Filter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "kinder", label: audiences.kinder.label },
  { id: "jugend", label: audiences.jugend.label },
  { id: "erwachsene", label: audiences.erwachsene.label },
  { id: "frauen", label: audiences.frauen.label },
];

interface Props {
  /** "compact": kleine Vorschaubilder auf dem Handy (Startseite); "full": große Bildkarten */
  mode?: "compact" | "full";
  initialFilter?: Filter;
}

/**
 * Trainingsübersicht: links die Liste, rechts (Desktop) ein großes Foto, das dem
 * Zeiger bzw. Fokus folgt. Filter nach Zielgruppe.
 */
export function CourseIndex({ mode = "full", initialFilter = "alle" }: Props) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const list = useMemo(
    () => (filter === "alle" ? allCourses : allCourses.filter((c) => c.audiences.includes(filter))),
    [filter],
  );
  const [active, setActive] = useState<string>(list[0]?.slug ?? "");
  const [seen, setSeen] = useState<Set<string>>(() => new Set([allCourses[0]!.slug]));
  const current = allCourses.find((c) => c.slug === active) ?? list[0]!;

  const activate = (slug: string) => {
    setActive(slug);
    setSeen((s) => (s.has(slug) ? s : new Set(s).add(slug)));
  };

  const choose = (f: Filter) => {
    setFilter(f);
    const first = (f === "alle" ? allCourses : allCourses.filter((c) => c.audiences.includes(f)))[0];
    if (first) activate(first.slug);
  };

  return (
    <div>
      <div role="group" aria-label="Nach Zielgruppe filtern" className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1">
        {filters.map((f) => (
          <button key={f.id} type="button" className="chip flex-none" aria-pressed={filter === f.id} onClick={() => choose(f.id)}>
            {f.label}
            <span className="tnum text-[0.8125rem] opacity-60">
              {f.id === "alle" ? allCourses.length : allCourses.filter((c) => c.audiences.includes(f.id as Audience)).length}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-12">
        <ul className="lg:col-span-7" aria-live="polite">
          {list.map((course, i) => (
            <li key={course.slug} className="border-t border-iron last:border-b">
              <CourseRow
                course={course}
                index={i}
                mode={mode}
                active={course.slug === current.slug}
                onActivate={() => activate(course.slug)}
              />
            </li>
          ))}
        </ul>

        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-[calc(var(--nav-h)+1.5rem)]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-anthracite">
              {allCourses
                .filter((c) => seen.has(c.slug))
                .map((c) => (
                  <div
                    key={c.slug}
                    className="absolute inset-0 transition-[opacity,transform] duration-700 ease-[var(--ease-out)]"
                    style={{ opacity: c.slug === current.slug ? 1 : 0, transform: c.slug === current.slug ? "scale(1)" : "scale(1.04)" }}
                    aria-hidden={c.slug !== current.slug}
                  >
                    <Photo id={c.photo} focus={c.focus} sizes="(min-width: 1024px) 38vw, 1px" className="h-full w-full" />
                  </div>
                ))}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-pitch/90 via-pitch/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7">
                <p className="flex items-center gap-2 text-[0.8125rem] font-[560] text-fog">
                  <span className="dot" style={{ background: tracks[current.track].color }} />
                  {tracks[current.track].label}
                </p>
                <p className="mt-3 max-w-[30ch] text-[1.0625rem] leading-snug text-bone">{current.tagline}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseRow({
  course,
  index,
  mode,
  active,
  onActivate,
}: {
  course: Course;
  index: number;
  mode: "compact" | "full";
  active: boolean;
  onActivate: () => void;
}) {
  return (
    <Link
      to="/training/$slug"
      params={{ slug: course.slug }}
      onPointerEnter={onActivate}
      onFocus={onActivate}
      className="group relative block py-5 outline-offset-[-2px] lg:py-6"
    >
      {/* Handy, große Karten */}
      {mode === "full" && (
        <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-[1rem] lg:hidden">
          <Photo id={course.photo} focus={course.focus} sizes="100vw" className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-pitch/70 to-transparent" />
        </div>
      )}
      <div className="flex items-center gap-4 lg:gap-6">
        {mode === "compact" && (
          <div className="relative size-16 flex-none overflow-hidden rounded-[0.75rem] lg:hidden">
            <Photo id={course.photo} focus={course.focus} sizes="64px" className="h-full w-full" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[0.8125rem] font-[560] text-ash">
            <span className="dot" style={{ background: tracks[course.track].color }} />
            {course.access}
          </p>
          <h3
            className={`t-display mt-2 text-[clamp(1.9rem,5vw,3.4rem)] transition-[color,transform] duration-300 ease-[var(--ease-out)] lg:group-hover:translate-x-2 ${
              active ? "lg:text-bone" : "lg:text-fog/70"
            } text-bone`}
          >
            {course.name}
          </h3>
        </div>
        <div className="hidden flex-none text-right sm:block">
          <p className="tnum text-[0.9375rem] font-[560] text-fog">{courseDays(course)}</p>
          {course.hansefit && <p className="mt-1 text-[0.8125rem] text-ash">auch mit Hansefit</p>}
        </div>
        <span
          aria-hidden
          className={`grid size-11 flex-none place-items-center rounded-full ring-1 transition-[background-color,color,transform] duration-300 ease-[var(--ease-out)] ${
            active ? "lg:bg-bone lg:text-pitch lg:ring-bone" : ""
          } text-bone ring-iron`}
        >
          <ArrowRight size={18} />
        </span>
      </div>
      <p className="mt-2 text-[0.875rem] text-ash sm:hidden">{courseDays(course)}</p>
      <span className="sr-only">{course.tagline}</span>
    </Link>
  );
}

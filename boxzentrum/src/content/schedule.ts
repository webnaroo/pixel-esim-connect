import { courses, type Course, type Day, type Session } from "./courses";

export const dayNames: Record<Day, { long: string; short: string }> = {
  1: { long: "Montag", short: "Mo" },
  2: { long: "Dienstag", short: "Di" },
  3: { long: "Mittwoch", short: "Mi" },
  4: { long: "Donnerstag", short: "Do" },
  5: { long: "Freitag", short: "Fr" },
  6: { long: "Samstag", short: "Sa" },
  7: { long: "Sonntag", short: "So" },
};

export interface Slot extends Session {
  course: Course;
  minutes: number;
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Alle Einheiten der Woche, sortiert nach Tag und Beginn. */
export const weekSlots: Slot[] = courses
  .flatMap((course) =>
    course.sessions.map((s) => ({ ...s, course, minutes: toMinutes(s.end) - toMinutes(s.start) })),
  )
  .sort((a, b) => a.day - b.day || toMinutes(a.start) - toMinutes(b.start) || a.hall.localeCompare(b.hall));

export const trainingDays = [...new Set(weekSlots.map((s) => s.day))].sort() as Day[];

export const slotsForDay = (day: Day) => weekSlots.filter((s) => s.day === day);

/** Hallenzeiten je Tag: frühester Beginn bis spätestes Ende. */
export const dayRanges = trainingDays.map((day) => {
  const slots = slotsForDay(day);
  const start = Math.min(...slots.map((s) => toMinutes(s.start)));
  const end = Math.max(...slots.map((s) => toMinutes(s.end)));
  return { day, start: fromMinutes(start), end: fromMinutes(end) };
});

export function fromMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Wochentag (1 = Montag) und Minute des Tages in Kiel (Europe/Berlin). */
export function kielClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const map: Record<string, Day> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { day: map[get("weekday")] ?? 1, minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

export interface NowNext {
  live: Slot[];
  next: { slot: Slot; daysAhead: number } | null;
}

/** Was läuft gerade in der Halle – und was als Nächstes? */
export function nowNext(date: Date): NowNext {
  const { day, minute } = kielClock(date);
  const live = weekSlots.filter((s) => s.day === day && toMinutes(s.start) <= minute && minute < toMinutes(s.end));
  for (let ahead = 0; ahead < 8; ahead++) {
    const d = (((day - 1 + ahead) % 7) + 1) as Day;
    const candidate = slotsForDay(d).find((s) => ahead > 0 || toMinutes(s.start) > minute);
    if (candidate) return { live, next: { slot: candidate, daysAhead: ahead } };
  }
  return { live, next: null };
}

export function relativeDay(daysAhead: number, day: Day) {
  if (daysAhead === 0) return "Heute";
  if (daysAhead === 1) return "Morgen";
  return dayNames[day].long;
}

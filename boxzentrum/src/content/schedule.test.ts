import { describe, expect, it } from "vitest";
import { courses } from "./courses";
import { dayRanges, nowNext, toMinutes, weekSlots } from "./schedule";
import { team } from "./team";

// Abgleich mit der Quelle (boxzentrum.kif-server.de/trainingszeiten, Stand 17.11.2026)
describe("Wochenplan", () => {
  it("enthält 26 Einheiten an 5 Trainingstagen und 15 Formate", () => {
    expect(weekSlots).toHaveLength(26);
    expect(new Set(weekSlots.map((s) => s.day)).size).toBe(5);
    expect(courses).toHaveLength(15);
  });

  it("deckt sich mit den Hallenzeiten aus dem Footer der Quelle", () => {
    expect(dayRanges.map((r) => `${r.day} ${r.start}-${r.end}`)).toEqual([
      "1 16:00-21:00",
      "2 16:00-20:00",
      "3 16:00-20:00",
      "4 17:00-20:00",
      "5 16:00-19:00",
    ]);
  });

  it("hat keine Doppelbelegung einer Halle", () => {
    for (const a of weekSlots) {
      for (const b of weekSlots) {
        if (a === b || a.day !== b.day || a.hall !== b.hall) continue;
        const overlap = toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
        expect(overlap, `${a.course.name} / ${b.course.name}`).toBe(false);
      }
    }
  });

  it("verweist nur auf eingetragene Trainer und eindeutige Slugs", () => {
    const ids = new Set(team.map((t) => t.id));
    for (const c of courses) if (c.trainer) expect(ids.has(c.trainer)).toBe(true);
    expect(new Set(courses.map((c) => c.slug)).size).toBe(courses.length);
  });
});

describe("Jetzt / Als Nächstes (Europe/Berlin)", () => {
  it("erkennt laufende Einheiten am Montag um 17:45 Ortszeit", () => {
    // 17.11.2025 war ein Montag; 16:45 UTC = 17:45 MEZ
    const { live } = nowNext(new Date("2025-11-17T16:45:00Z"));
    expect(live.map((s) => s.course.slug).sort()).toEqual(["boxen-vollkontakt", "fit-boxen-basic"]);
  });

  it("springt am Wochenende auf Montag 16:00", () => {
    const { live, next } = nowNext(new Date("2025-11-22T12:00:00Z")); // Samstag
    expect(live).toHaveLength(0);
    expect(next?.slot.day).toBe(1);
    expect(next?.slot.start).toBe("16:00");
    expect(next?.daysAhead).toBe(2);
  });
});

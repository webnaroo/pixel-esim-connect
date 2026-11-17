import { dayNames } from "@/content/schedule";
import type { Course } from "@/content/courses";

/** "Mo, Mi, Fr" bzw. "Nach Absprache" */
export const courseDays = (c: Course) =>
  c.byArrangement || c.sessions.length === 0
    ? "Nach Absprache"
    : [...new Set(c.sessions.map((s) => s.day))].map((d) => dayNames[d].short).join(", ");

export const durationLabel = (c: Course) => {
  const mins = [...new Set(c.sessions.map((s) => {
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    return (eh! * 60 + em!) - (sh! * 60 + sm!);
  }))];
  return mins.length ? mins.map((m) => `${m} Min.`).join(" / ") : null;
};

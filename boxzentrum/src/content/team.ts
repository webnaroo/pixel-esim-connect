/**
 * Trainer:innen. Quelle: https://boxzentrum.kif-server.de/team und /ueber-uns (Stand 17.11.2026).
 * Dort ist nur Arton namentlich genannt. Weitere Personen erst eintragen, wenn das Studio sie freigibt.
 */
export interface Coach {
  id: string;
  name: string;
  role: string;
  instagram?: { handle: string; url: string };
  bio: string[];
  focus: string[];
  courses: string[];
}

export const team: Coach[] = [
  {
    id: "arton",
    name: "Arton",
    role: "Head Coach",
    instagram: { handle: "@coach_arton", url: "https://www.instagram.com/coach_arton/" },
    bio: [
      "Arton führt das Training im BoxZentrum seit der ersten Einheit im alten Güterbahnhof. Dieselbe Halle, dieselbe Handschrift: sauberer Stand, ehrliche Ansagen, keine Show am Sack.",
      "Er trainiert Wettkämpfer und Leute, die zum ersten Mal eine Faust richtig geschlossen haben – oft in derselben Woche. Was beide bekommen, ist dieselbe Aufmerksamkeit für Details: wohin das Gewicht geht, wann die Deckung fällt, warum der dritte Schlag nicht mehr trifft.",
      "Wenn du ihn im Training etwas fragst, bekommst du eine Antwort und danach eine Wiederholung, in der du sie ausprobierst.",
    ],
    focus: [
      "Technikaufbau von der Grundstellung an",
      "Wettkampfvorbereitung",
      "Einsteigertraining ohne Vorführen",
      "Kinder- und Jugendtraining",
    ],
    courses: ["boxen-vollkontakt"],
  },
];

export const coachById = (id: string) => team.find((c) => c.id === id);

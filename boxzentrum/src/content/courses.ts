/**
 * Alle 15 Trainingsformate mit Zeiten.
 *
 * Quelle: https://boxzentrum.kif-server.de/kursangebot und /trainingszeiten (Stand 17.11.2026).
 * Texte sind dort übernommen und nur gekürzt, nicht ergänzt. Trainer:innen sind nur
 * eingetragen, wo die Quelle sie nennt.
 */
import type { PhotoId } from "./photos.gen";

export type Track = "vollkontakt" | "fitboxen" | "kraft" | "frei" | "gesundheit";
export type Audience = "kinder" | "jugend" | "erwachsene" | "frauen";
export type Day = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Hall = "Halle 1" | "Halle 2";

export interface Session {
  day: Day;
  start: string; // "HH:MM"
  end: string;
  hall: Hall;
}

export interface Course {
  slug: string;
  name: string;
  track: Track;
  audiences: Audience[];
  /** Zugangsvoraussetzung im Wortlaut der Quelle */
  access: string;
  tagline: string;
  description: string;
  flow: string[];
  bring: string[];
  sessions: Session[];
  /** true = Termine nach Absprache, nicht im Wochenplan */
  byArrangement?: boolean;
  hansefit?: boolean;
  beginnerFriendly?: boolean;
  trainer?: string; // id aus team.ts
  /** Probetraining: offen | nur nach Rücksprache | nur für Mitglieder */
  trial: "open" | "call" | "members";
  photo: PhotoId;
  /** CSS object-position für den Bildausschnitt */
  focus?: string;
}

export const tracks: Record<Track, { label: string; short: string; color: string }> = {
  vollkontakt: { label: "Boxen Vollkontakt", short: "Vollkontakt", color: "var(--color-track-red)" },
  fitboxen: { label: "Fit Boxen", short: "Fit Boxen", color: "var(--color-track-bone)" },
  kraft: { label: "Kraft & Selbstverteidigung", short: "Kraft", color: "var(--color-track-blue)" },
  frei: { label: "Freies Training", short: "Frei", color: "var(--color-track-ash)" },
  gesundheit: { label: "Gesundheit", short: "Gesundheit", color: "var(--color-track-brass)" },
};

export const audiences: Record<Audience, { label: string; hint: string }> = {
  kinder: { label: "Kinder", hint: "6 bis 12 Jahre" },
  jugend: { label: "Jugend", hint: "12 bis 18 Jahre" },
  erwachsene: { label: "Erwachsene", hint: "ab 16 bzw. 18 Jahren" },
  frauen: { label: "Frauen", hint: "reine Frauengruppen" },
};

export const courses: Course[] = [
  {
    slug: "boxen-vollkontakt",
    name: "Boxen Vollkontakt",
    track: "vollkontakt",
    audiences: ["jugend", "erwachsene"],
    access: "Ab 14 Jahren",
    tagline: "Zwei Fäuste, Beinarbeit, Deckung. Der ganze Sport steckt in diesen drei Dingen.",
    description:
      "Du lernst Boxen von unten: Stand, Distanz, Deckung. Härte kommt erst dazu, wenn die Beinarbeit sitzt. Trainiert wird an Sandsack, Pratzen und im Ring. Sparring machst du, wenn du willst – und nie gegen jemanden, der dich vorführen möchte.",
    flow: [
      "Aufwärmen, Seilspringen, Schattenboxen",
      "Technik: Jab, Cross, Haken, Aufwärtshaken",
      "Pratzenarbeit zu zweit",
      "Sandsack- und Konditionsrunden",
      "Sparring nach Erfahrungsstand, freiwillig",
    ],
    bring: [
      "Sportsachen und saubere Hallenschuhe",
      "Handtuch und mindestens 1,5 Liter zu trinken",
      "Bandagen, wenn du welche hast – sonst bekommst du welche von uns",
    ],
    sessions: [
      { day: 1, start: "17:30", end: "19:00", hall: "Halle 1" },
      { day: 3, start: "18:30", end: "20:00", hall: "Halle 1" },
      { day: 5, start: "17:30", end: "19:00", hall: "Halle 1" },
    ],
    trainer: "arton",
    trial: "open",
    photo: "ringecke-fenster",
    focus: "60% 50%",
  },
  {
    slug: "jugend-boxen-vollkontakt",
    name: "Jugend Boxen Vollkontakt",
    track: "vollkontakt",
    audiences: ["jugend"],
    access: "Jugendliche, Einstiegsalter im Studio erfragen",
    tagline: "Für Jugendliche, die es ernst meinen und schon eine Grundlage mitbringen.",
    description:
      "Die Vollkontakt-Gruppe für Jugendliche: mehr Tempo, mehr Sparring-Anteil, mehr Wettkampfvorbereitung als in den Fit-Boxen-Jugendgruppen. Wer hier reinkommt, kennt Stand und Deckung schon oder bringt aus einer anderen Kampfsportart eine Basis mit.",
    flow: [
      "Intensives Aufwärmen und Kondition",
      "Technik mit Fokus auf Sparring-Tauglichkeit",
      "Kontrolliertes Sparring nach Ansage der Trainer:innen",
      "Wettkampfvorbereitung für alle, die antreten wollen",
    ],
    bring: [
      "Sportsachen und Hallenschuhe",
      "Bandagen und eigene Handschuhe, sobald du regelmäßig dabei bist",
      "Handtuch und etwas zu trinken",
    ],
    sessions: [
      { day: 1, start: "16:00", end: "17:30", hall: "Halle 1" },
      { day: 3, start: "16:30", end: "17:30", hall: "Halle 1" },
      { day: 5, start: "16:00", end: "17:30", hall: "Halle 1" },
    ],
    trial: "open",
    photo: "ring-weitwinkel-banden",
    focus: "50% 55%",
  },
  {
    slug: "fit-boxen-jugend-12-15",
    name: "Fit Boxen Jugend 12–15",
    track: "fitboxen",
    audiences: ["jugend"],
    access: "12 bis 15 Jahre",
    tagline: "Boxen lernen in der Gruppe, die im gleichen Alter tickt.",
    description:
      "Technik, Koordination und Kondition für die Altersgruppe zwischen Kindertraining und Erwachsenengruppe. Kein Kopfkontakt, klare Ansagen, viel Bewegung – aufgebaut auf das, was in der jüngeren Gruppe schon gelernt wurde, aber auch für Neueinsteiger:innen offen.",
    flow: [
      "Aufwärmen und Koordinationsspiele",
      "Technikaufbau: Stand, Bewegung, Schlagfolgen",
      "Pratzen- und Sackarbeit in Kleingruppen",
      "Kein Kopfkontakt, kein Wettkampfdruck",
    ],
    bring: ["Sportsachen und Hallenschuhe", "Trinkflasche mit Namen drauf", "Ausrüstung stellen wir für den Anfang"],
    sessions: [
      { day: 2, start: "16:00", end: "17:00", hall: "Halle 1" },
      { day: 5, start: "16:00", end: "17:00", hall: "Halle 2" },
    ],
    beginnerFriendly: true,
    trial: "open",
    photo: "halle-uebersicht",
    focus: "50% 60%",
  },
  {
    slug: "fit-boxen-jugend-6-12",
    name: "Fit Boxen Jugend 6–12",
    track: "fitboxen",
    audiences: ["kinder"],
    access: "6 bis 12 Jahre",
    tagline: "Erst Haltung und Regeln, dann Technik. Draufhauen kann jedes Kind – treffen nicht.",
    description:
      "Kinder lernen hier zuerst, wann die Hände unten bleiben. Danach kommt Technik: Stand, Bewegung, erste Schlagfolgen, viel Koordination. Kein Kopfkontakt, klare Ansagen, feste Struktur. Eltern können jederzeit zusehen – am Rand, nicht am Sack.",
    flow: [
      "Aufwärmspiele und Koordination",
      "Grundstellung, Bewegung, erste Schlagfolgen",
      "Pratzen und leichte Sackarbeit",
      "Regeln, Rücksicht, Disziplin – jede Einheit, nicht als Sonntagsrede",
      "Kein Kopfkontakt, kein Wettkampfdruck",
    ],
    bring: ["Sportsachen und Hallenschuhe", "Trinkflasche mit Namen drauf", "Ausrüstung stellen wir komplett"],
    sessions: [
      { day: 1, start: "16:00", end: "17:00", hall: "Halle 2" },
      { day: 3, start: "16:00", end: "17:00", hall: "Halle 2" },
    ],
    beginnerFriendly: true,
    trial: "open",
    photo: "ausruestung-regal",
    focus: "45% 50%",
  },
  {
    slug: "grundschule-jugend",
    name: "Grundschule Jugend",
    track: "fitboxen",
    audiences: ["kinder", "jugend"],
    access: "Ab 8 Jahren",
    tagline: "Der erste Schritt vor dem ersten Schlag.",
    description:
      "Grundschule Jugend ist der Einstiegskurs für alle, die noch nie geboxt haben: Grundstellung, Bewegung im Ring, die ersten Regeln – bevor es in eine der altersgerechten Gruppen weitergeht. Kein Druck, kein Vergleich untereinander.",
    flow: [
      "Grundstellung und Fußarbeit von null an",
      "Erste Schlagbewegungen ohne Sack, dann mit",
      "Regeln und Umgang miteinander im Training",
      "Orientierung, in welche Gruppe es danach passt",
    ],
    bring: ["Sportsachen und Hallenschuhe", "Trinkflasche mit Namen drauf", "Ausrüstung stellen wir komplett"],
    sessions: [{ day: 2, start: "17:00", end: "18:00", hall: "Halle 1" }],
    beginnerFriendly: true,
    trial: "open",
    photo: "ringecke-leer",
    focus: "50% 70%",
  },
  {
    slug: "grundschule-erwachsene",
    name: "Grundschule Erwachsene",
    track: "fitboxen",
    audiences: ["erwachsene"],
    access: "Erwachsene, einsteigerfreundlich",
    tagline: "Bevor du in eine laufende Gruppe kommst, lernst du hier die Basis.",
    description:
      "Grundschule Erwachsene ist der Startpunkt im Fit-Boxen-Programm: Grundstellung, Handhaltung, erste Schlagbewegungen, in Ruhe erklärt statt zwischen erfahrenen Trainierenden mitzulaufen. Danach findest du deinen Anschluss in Basic oder Einsteiger.",
    flow: [
      "Grundstellung, Deckung, erste Schrittfolgen",
      "Schlagtechnik einzeln erklärt, dann am Pad",
      "Kleine Gruppe, viel individuelles Feedback",
      "Einordnung, welches Niveau danach passt",
    ],
    bring: ["Sportsachen und Hallenschuhe", "Handtuch und etwas zu trinken", "Handschuhe und Bandagen leihen wir dir"],
    sessions: [{ day: 2, start: "18:00", end: "19:00", hall: "Halle 1" }],
    hansefit: true,
    beginnerFriendly: true,
    trial: "open",
    photo: "ringecke-truss",
    focus: "50% 40%",
  },
  {
    slug: "fit-boxen-basic",
    name: "Fit Boxen Basic",
    track: "fitboxen",
    audiences: ["erwachsene"],
    access: "Erwachsene, einsteigerfreundlich",
    tagline: "Technik und Kondition im Wechsel, ohne dass eine Seite zu kurz kommt.",
    description:
      "Fit Boxen Basic baut auf der Grundschule auf: mehr Kombinationen, mehr Tempo am Sack, erste feste Trainingspartner:innen. Der Einstieg auch ohne Grundschule ist möglich, wenn du schon Grunderfahrung mitbringst.",
    flow: [
      "Aufwärmen und Beweglichkeit",
      "Technik in Kombinationen statt Einzelschlägen",
      "Sack- und Pratzenarbeit im Wechsel",
      "Kondition zum Abschluss jeder Einheit",
    ],
    bring: [
      "Sportsachen und Hallenschuhe",
      "Handtuch und mindestens 1 Liter zu trinken",
      "Bandagen, wenn du welche hast – sonst leihen wir dir welche",
    ],
    sessions: [
      { day: 1, start: "17:00", end: "18:00", hall: "Halle 2" },
      { day: 4, start: "17:00", end: "18:00", hall: "Halle 1" },
    ],
    hansefit: true,
    beginnerFriendly: true,
    trial: "open",
    photo: "durchblick-halle",
    focus: "50% 55%",
  },
  {
    slug: "fit-boxen-einsteiger",
    name: "Fit Boxen Einsteiger",
    track: "fitboxen",
    audiences: ["erwachsene"],
    access: "Erwachsene, einsteigerfreundlich",
    tagline: "Für alle, die regelmäßig kommen wollen und mehr als die Grundlagen suchen.",
    description:
      "Fit Boxen Einsteiger nimmt das Tempo aus Basic mit und baut Ausdauer und Kombinationsvermögen weiter aus. Du merkst hier schon, wie sich ein durchtrainierter Boxer-Aufwärmer anfühlt.",
    flow: [
      "Intensiveres Aufwärmen und Seilspringen",
      "Längere Kombinationen, mehr Bewegung im Stand",
      "Konditionsrunden am Sack",
      "Erste Partnerübungen ohne Kontakt",
    ],
    bring: ["Sportsachen und Hallenschuhe", "Handtuch und mindestens 1 Liter zu trinken", "Eigene Bandagen empfehlenswert"],
    sessions: [
      { day: 3, start: "17:30", end: "18:30", hall: "Halle 1" },
      { day: 5, start: "18:00", end: "19:00", hall: "Halle 2" },
    ],
    hansefit: true,
    beginnerFriendly: true,
    trial: "open",
    photo: "speedball-nahaufnahme",
    focus: "50% 45%",
  },
  {
    slug: "fit-boxen-fortgeschrittene",
    name: "Fit Boxen Fortgeschrittene",
    track: "fitboxen",
    audiences: ["erwachsene"],
    access: "Erwachsene, Vorerfahrung nötig",
    tagline: "Volles Tempo, komplexere Kombinationen – für alle, die schon länger dabei sind.",
    description:
      "Fit Boxen Fortgeschrittene setzt Grunderfahrung voraus: hohes Tempo, anspruchsvollere Kombinationen, mehr Eigenverantwortung beim Aufwärmen. Kein Sparring-Zwang, aber die Gruppe trainiert spürbar härter als Basic und Einsteiger.",
    flow: [
      "Kurzes, intensives Aufwärmen",
      "Komplexe Kombinationen mit Bewegung",
      "Hartes Sack- und Pratzentraining",
      "Konditionsblöcke am Ende jeder Einheit",
    ],
    bring: [
      "Sportsachen und Hallenschuhe",
      "Eigene Bandagen und, wenn vorhanden, eigene Handschuhe",
      "Mindestens 1,5 Liter zu trinken",
    ],
    sessions: [
      { day: 1, start: "19:00", end: "20:00", hall: "Halle 1" },
      { day: 2, start: "19:00", end: "20:00", hall: "Halle 1" },
      { day: 4, start: "18:00", end: "19:00", hall: "Halle 1" },
    ],
    trial: "open",
    photo: "sandsaecke-reihe",
    focus: "50% 50%",
  },
  {
    slug: "fit-boxen-frauen",
    name: "Fit Boxen Frauen",
    track: "fitboxen",
    audiences: ["frauen"],
    access: "Ab 16 Jahren, nur Frauen",
    tagline: "Volles Training unter Frauen – ohne dass dir jemand ungefragt erklärt, wie du zu schlagen hast.",
    description:
      "Reines Frauentraining, Technik und Kondition im Wechsel. Du lernst richtig schlagen und dich richtig bewegen, im Tempo der Gruppe. Die meisten fangen ohne Vorerfahrung an, einige trainieren seit Jahren mit.",
    flow: [
      "Technikaufbau vom Stand bis zur Kombination",
      "Pratzenarbeit in festen Paaren",
      "Kraft- und Konditionsblöcke am Sack",
      "Abwehr und Distanz, wenn die Grundlagen sitzen",
      "Sparring ausschließlich freiwillig",
    ],
    bring: [
      "Sportsachen und Hallenschuhe",
      "Handtuch und etwas zu trinken",
      "Handschuhe und Bandagen leihen wir dir für den Anfang",
    ],
    sessions: [
      { day: 2, start: "19:00", end: "20:00", hall: "Halle 2" },
      { day: 4, start: "19:00", end: "20:00", hall: "Halle 1" },
    ],
    hansefit: true,
    beginnerFriendly: true,
    trial: "open",
    photo: "boxsackraum",
    focus: "40% 50%",
  },
  {
    slug: "curvy-boxen",
    name: "Curvy Boxen",
    track: "fitboxen",
    audiences: ["frauen"],
    access: "Ab 16 Jahren, curvy Frauen",
    tagline: "Ein Raum, in dem dich niemand mustert, während du etwas Neues lernst.",
    description:
      "Curvy Boxen ist für curvy Frauen, die boxen wollen, ohne sich vorher erklären zu müssen. Tempo, Pausen und Übungsauswahl sind auf Körper ausgelegt, die nicht in die Standardvorlage passen. Die Technik ist dieselbe wie in jeder anderen Einheit. Wer will, wechselt später rüber – muss aber niemand.",
    flow: [
      "Technik im eigenen Tempo, ohne Zeitdruck",
      "Sackarbeit mit Pausen, die eingeplant sind statt erkämpft",
      "Kraft und Stabilität ohne Bodenübungen, die niemand mag",
      "Feste, kleine Gruppe",
      "Kein Wiegen, keine Vorher-Nachher-Fotos, keine Kommentare zum Körper",
    ],
    bring: [
      "Sportsachen, in denen du dich bewegen magst",
      "Handtuch und etwas zu trinken",
      "Handschuhe und Bandagen bekommst du von uns",
    ],
    sessions: [],
    byArrangement: true,
    beginnerFriendly: true,
    trial: "call",
    photo: "flur-zum-ring",
    focus: "35% 50%",
  },
  {
    slug: "therapeutisches-boxen",
    name: "Therapeutisches Boxen",
    track: "gesundheit",
    audiences: ["erwachsene"],
    access: "Nach Absprache",
    tagline: "Boxen als Werkzeug: Anspannung raus, Kontrolle zurück.",
    description:
      "Hier arbeiten wir mit Rhythmus, Atmung und klaren Abläufen. Es geht nicht um Gegner, sondern darum, Anspannung geordnet loszuwerden und zu merken, dass du steuerst, was passiert. Kleine Gruppen, ruhiges Tempo. Das ersetzt keine Therapie und ist kein Heilversprechen – es stellt sich gut daneben.",
    flow: [
      "Ankommen, Atmung, Puls runter",
      "Feste, wiederholbare Schlagfolgen am Sack",
      "Rhythmusarbeit statt Leistungsdruck",
      "Kurze Kraftblöcke, klar begrenzt",
      "Kein Sparring, kein Partnerkontakt",
    ],
    bring: ["Sportsachen und Hallenschuhe", "Etwas zu trinken", "Ruf vorher an – wir sprechen kurz, was du brauchst"],
    sessions: [],
    byArrangement: true,
    trial: "call",
    photo: "durchblick-kraftraum",
    focus: "50% 50%",
  },
  {
    slug: "fit-power-workout",
    name: "Fit Power Workout",
    track: "kraft",
    audiences: ["erwachsene"],
    access: "Erwachsene, einsteigerfreundlich",
    tagline: "Kraft und Kondition im Zirkel – mit Boxelementen, aber ohne Technikfokus.",
    description:
      "Fit Power Workout ist die konditionslastige Ergänzung zum Boxtraining: Zirkel aus Kraft-, Ausdauer- und Koordinationsübungen, teils mit Sandsack und Pratzen, ohne dass es um saubere Schlagtechnik im Detail geht. Passt gut dazu, wenn du zusätzlich zum Boxtraining an Fitness arbeiten willst.",
    flow: [
      "Zirkeltraining mit wechselnden Stationen",
      "Kraft- und Ausdauerübungen mit und ohne Sandsack",
      "Koordinationsübungen",
      "Cool-down und Mobility zum Abschluss",
    ],
    bring: ["Sportsachen und Hallenschuhe", "Handtuch und mindestens 1 Liter zu trinken", "Eigene Matte, falls vorhanden"],
    sessions: [{ day: 5, start: "17:00", end: "18:00", hall: "Halle 2" }],
    hansefit: true,
    beginnerFriendly: true,
    trial: "open",
    photo: "kraftraum",
    focus: "50% 55%",
  },
  {
    slug: "kraft-maga",
    name: "Kraft Maga",
    track: "kraft",
    audiences: ["erwachsene"],
    access: "Erwachsene",
    tagline: "Selbstverteidigung und Körperspannung – kein Boxformat, aber in derselben Halle.",
    description:
      "Kraft Maga verbindet Grundlagen der Selbstverteidigung mit Kraft- und Körperspannungstraining. Anders als die Boxformate steht hier nicht die Schlagtechnik im Zentrum, sondern Reaktion, Distanz und der eigene Stand in einer bedrängten Situation.",
    flow: [
      "Aufwärmen und Körperspannung",
      "Grundlagen der Distanz- und Reaktionsschulung",
      "Einfache Befreiungs- und Abwehrtechniken",
      "Kraftübungen zum Abschluss",
    ],
    bring: ["Sportsachen und Hallenschuhe", "Handtuch und etwas zu trinken", "Bequeme, bewegliche Kleidung"],
    sessions: [
      { day: 1, start: "20:00", end: "21:00", hall: "Halle 2" },
      { day: 4, start: "19:00", end: "20:00", hall: "Halle 2" },
    ],
    trial: "open",
    photo: "halle-ring-decke",
    focus: "50% 40%",
  },
  {
    slug: "freies-training",
    name: "Freies Training",
    track: "frei",
    audiences: ["erwachsene"],
    access: "Mitglieder, Grunderfahrung aus laufendem Kurs",
    tagline: "Halle, Sandsack, keine Ansage – du trainierst, was du schon kannst.",
    description:
      "Freies Training ist kein angeleiteter Kurs: Die Halle steht offen, du trainierst eigenverantwortlich, was du aus deinen Kursen schon kennst. Gedacht für Mitglieder, die regelmäßig dabei sind und wissen, wie sie an Sack und Pratzen sicher trainieren.",
    flow: [
      "Keine feste Anleitung, freie Zeiteinteilung",
      "Sandsäcke, Pratzen und Ausrüstung frei nutzbar",
      "Gute Gelegenheit für eigenständiges Konditionstraining",
    ],
    bring: ["Sportsachen und Hallenschuhe", "Eigene Bandagen und Handschuhe", "Etwas zu trinken"],
    sessions: [
      { day: 1, start: "19:00", end: "20:00", hall: "Halle 2" },
      { day: 3, start: "17:00", end: "18:00", hall: "Halle 2" },
    ],
    trial: "members",
    photo: "boxsackraum",
    focus: "75% 50%",
  },
];

export const courseBySlug = (slug: string) => courses.find((c) => c.slug === slug);

/** Aufbaustufen, wie sie die Quelle beschreibt (Grundschule → Basic → Einsteiger → Fortgeschrittene). */
export const fitBoxenPath = ["grundschule-erwachsene", "fit-boxen-basic", "fit-boxen-einsteiger", "fit-boxen-fortgeschrittene"];

/** Jugendweg laut Quelle: Einstieg → altersgerechte Gruppe → Vollkontakt-Gruppe mit Grundlage. */
export const youthPath = ["grundschule-jugend", "fit-boxen-jugend-6-12", "fit-boxen-jugend-12-15", "jugend-boxen-vollkontakt"];

import type { PhotoId } from "./photos.gen";

/**
 * Bildbeschreibungen der Hallenfotos (Quelle: Alt-Texte der aktuellen Website, sonst nach Bildinhalt).
 * Alle Fotos zeigen die echte Halle am Tonberg 15. Personenfotos liegen noch nicht vor.
 */
export const photoAlt: Record<PhotoId, string> = {
  "halle-ring-decke": "Der Boxring unter der Holzbalkendecke, darüber die Lichttraverse",
  "ring-weitwinkel-banden": "Weitwinkel auf den Ring mit Sponsorenbanden und hohen Fenstern",
  "ringecke-fenster": "Ringecke mit rotem Eckpolster vor den Hallenfenstern",
  "ringecke-leer": "Leere Ringecke mit blauem Eckpolster; eine Schaumstoffbanane liegt auf der Matte",
  "halle-uebersicht": "Weitwinkel über Sandsäcke im Vordergrund auf den Ring, Backsteinwand und Trägerdecke",
  "sandsaecke-reihe": "Reihe von Sandsäcken unter dem Hallendach, dahinter der Trainingsraum",
  boxsackraum: "Boxsackraum mit Sandsack, Speedball und weiteren Sandsäcken vor hohen Fenstern",
  "speedball-nahaufnahme": "Birnenförmiger Boxsack aus rotem und schwarzem Leder, im Hintergrund der Ring",
  "ausruestung-regal": "Regal mit Leih-Ausrüstung: Kopfschutz, Boxhandschuhe und Kurzhanteln, geordnet auf Fächern",
  kraftraum: "Kraftraum mit Sandsäcken und Kraftstation vor hohen Fenstern",
  "durchblick-halle": "Durchblick von der Boxsack-Ecke in die Haupthalle mit Ring und Sponsorenbanden",
  "durchblick-kraftraum": "Durchblick vom Kraftraum durch die Sandsäcke in Richtung Ring",
  "ringecke-truss": "Blick von unten auf einen Eckpfosten mit weißem Polster, darüber die Beleuchtungstraverse",
  "flur-zum-ring": "Gang an der Backsteinwand entlang zum Ring",
};

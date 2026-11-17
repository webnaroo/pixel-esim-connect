/**
 * Stammdaten des BoxZentrum Kiel.
 *
 * Quelle aller Angaben: aktuelle Website https://boxzentrum.kif-server.de/ (Stand 17.11.2026).
 * Nichts hier ist geschätzt oder ergänzt. Offene Punkte stehen in docs/OFFENE-FRAGEN.md.
 */
export const site = {
  name: "BoxZentrum Kiel",
  shortName: "BoxZentrum",
  founded: 2015,
  address: {
    street: "Tonberg 15",
    zip: "24113",
    city: "Kiel",
    country: "DE",
    note: "Backsteinhalle im alten Güterbahnhof",
  },
  geo: { lat: 54.3019761, lng: 10.1313776 },
  phone: { display: "0175 2472222", href: "tel:+491752472222", e164: "+491752472222" },
  email: { display: "info@boxzentrum-kiel.de", href: "mailto:info@boxzentrum-kiel.de" },
  social: {
    instagram: { handle: "@boxzentrum_kiel", url: "https://www.instagram.com/boxzentrum_kiel/" },
    facebook: { handle: "BoxZentrum Kiel", url: "https://www.facebook.com/boxzentrumkiel/" },
  },
  maps: {
    search: "https://www.google.com/maps/search/?api=1&query=BoxZentrum+Kiel+Tonberg+15+24113+Kiel",
    directions: "https://www.google.com/maps/dir/?api=1&destination=Tonberg%2015%2C%2024113%20Kiel",
    osm: "https://www.openstreetmap.org/?mlat=54.3019761&mlon=10.1313776#map=17/54.3019761/10.1313776",
    osmEmbed:
      "https://www.openstreetmap.org/export/embed.html?bbox=10.1263%2C54.2995%2C10.1364%2C54.3044&layer=mapnik&marker=54.3019761%2C10.1313776",
  },
  /**
   * Bewertungsstand laut aktueller Website. Die Zahl ändert sich laufend –
   * vor dem Livegang bei Google prüfen und hier aktualisieren.
   */
  reviews: { rating: 4.9, count: 61, platform: "Google", checked: "2026-11" },
} as const;

/** Probetraining – Wortlaut der aktuellen Website. Vor Veröffentlichung mit dem Betreiber abstimmen. */
export const trial = {
  price: "kostenlos",
  headline: "Erste Einheit kostenlos",
  gear: "Handschuhe und Bandagen leihen wir dir.",
  arrive: "Komm zehn Minuten vor Trainingsbeginn, dann bleibt Zeit, dich kurz einzuweisen.",
  noContract: "Kein Vertrag im Voraus, keine Anmeldung online. Ein Anruf reicht.",
  phoneHint: "Wenn niemand rangeht, läuft gerade Training – probier es nach der Einheit noch einmal.",
  emailHint: "Für alles, was schriftlich sein soll: Kindertraining, therapeutisches Boxen, Gruppen und Anfragen von Vereinen.",
  socialHint: "Kurzfristige Ausfälle und Termine stehen dort zuerst.",
} as const;

/** Die vier Grundsätze des Trainings – Wortlaut der aktuellen Website. */
export const principles = [
  {
    title: "Technik vor Härte",
    text: "Wer hier ankommt, lernt zuerst stehen und sich bewegen. Kraft ist einfach zu bekommen, ein sauberer Jab nicht.",
  },
  {
    title: "Sparring ist freiwillig",
    text: "Niemand wird in den Ring geschickt. Wer sparren will, wird vorbereitet und passend eingeteilt – nicht zum Auffüllen verheizt.",
  },
  {
    title: "Keine Kommentare zum Körper",
    text: "Gewicht, Form, Kondition am ersten Tag: nicht Thema. Das gilt in jeder Einheit, nicht nur im Curvy-Training.",
  },
  {
    title: "Neu heißt eingewiesen",
    text: "Beim ersten Mal geht jemand mit dir die Grundstellung durch. Du stehst nicht am Sack und rätst.",
  },
] as const;

export const directions = [
  {
    title: "Das Gebäude",
    text: "Roter Backsteinbau auf dem Gelände des alten Güterbahnhofs, mit langem Holzvordach über der alten Laderampe.",
  },
  {
    title: "Der Eingang",
    text: "Der Torbogen unter dem Vordach, an der Rampe entlang. Am Aufsteller mit dem BoxZentrum-Logo bist du richtig.",
  },
  {
    title: "Mit dem Auto",
    text: "Auf dem Gelände wird geparkt. Komm beim ersten Mal zehn Minuten früher, dann findest du in Ruhe rein.",
  },
  {
    title: "Ohne Auto",
    text: "Vom Kieler Hauptbahnhof zu Fuß oder mit dem Bus Richtung Tonberg – die Halle liegt südlich der Gleise.",
  },
] as const;

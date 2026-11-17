/**
 * Pflichtangaben für Impressum und Datenschutz.
 *
 * Die mit `null` belegten Felder liegen nicht vor (auch nicht auf der aktuellen Website)
 * und müssen vom BoxZentrum geliefert werden. Solange ein Feld fehlt, zeigt die Seite
 * einen deutlichen Hinweis und `npm run check:launch` schlägt fehl.
 */
export const legal = {
  /** Vollständiger Name inkl. Rechtsform, z. B. „BoxZentrum Kiel e. V.“ */
  entity: null as string | null,
  /** Vertretungsberechtigte Person(en) */
  representatives: null as string | null,
  /** Registergericht und Registernummer (bei e. V. Vereinsregister) – null, wenn nicht vorhanden */
  register: null as string | null,
  /** USt-IdNr. – leer lassen, wenn nicht vorhanden */
  vatId: null as string | null,
  /** Redaktionell verantwortlich nach § 18 Abs. 2 MStV */
  editor: null as string | null,
  /** Hosting-Anbieter inkl. Sitz, z. B. „Netlify, Inc., San Francisco“ */
  hosting: null as string | null,
  /** Aufbewahrungsdauer der Server-Logs beim Hoster */
  logRetention: null as string | null,
};

export const missingLegalFields = () =>
  (["entity", "representatives", "editor", "hosting", "logRetention"] as const).filter((k) => !legal[k]);

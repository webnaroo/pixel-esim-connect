// Preview-only sample for design review (VITE_USE_FIXTURES=true). Labelled "Testdaten"; contains no claims about real providers.
import type { Competitor, ComparisonRowRec, FactRec } from "../comparison";

export function comparisonFixture(now: Date): { competitors: Competitor[]; rows: ComparisonRowRec[]; facts: FactRec[] } {
  const d = now.toISOString().slice(0, 10);
  return {
    competitors: [{ id: "fx-a", name: "Beispielanbieter (Testdaten)", slug: "beispiel", logo_url: null, enabled: true, sort_order: 1 }],
    rows: [
      { id: "fx-r1", sort_order: 1, question: "Testfrage 1 (Testdaten)", globesim_text: "Beispieltext GlobeSIM (Testdaten)", globesim_status: "check", requires: null, enabled: true },
      { id: "fx-r2", sort_order: 2, question: "Testfrage 2 (Testdaten)", globesim_text: "Beispieltext GlobeSIM (Testdaten)", globesim_status: "neutral", requires: null, enabled: true },
    ],
    facts: [
      { id: "fx-f1", row_id: "fx-r1", competitor_id: "fx-a", text: "Beispielangabe (Testdaten)", status: "neutral", source_url: "https://example.com", checked_at: d, enabled: true },
      { id: "fx-f2", row_id: "fx-r2", competitor_id: "fx-a", text: "Beispielangabe (Testdaten)", status: "cross", source_url: "https://example.com", checked_at: d, enabled: true },
    ],
  };
}

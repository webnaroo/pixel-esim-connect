import { describe, expect, it } from "vitest";
import { createSearchIndex, normalizeSearch, type SearchDestination } from "./search";

const d = (id: string, name: string, aliases: string[], type: SearchDestination["type"] = "country"): SearchDestination => ({
  id, type, slug: id, name, aliases, flagCode: null, fromPrice: null,
});

const search = createSearchIndex([
  d("turkey", "Türkei", ["tr", "turkey", "türkiye"]),
  d("united-states", "Vereinigte Staaten", ["us", "usa", "united states", "vereinigte staaten"]),
  d("asia", "Asien", ["asia", "asien"], "region"),
  d("austria", "Österreich", ["at", "austria"]),
]);

describe("search normalization", () => {
  it("folds umlauts", () => {
    expect(normalizeSearch("Türkei")).toBe("tuerkei");
  });
  it("matches tuerkei to Türkei", () => {
    expect(search("tuerkei")[0]?.id).toBe("turkey");
  });
  it("matches prefix tür to Türkei", () => {
    expect(search("tür")[0]?.id).toBe("turkey");
  });
  it("matches turkei without umlaut", () => {
    expect(search("turkei")[0]?.id).toBe("turkey");
  });
  it("matches aliases usa / us / vereinigte staaten", () => {
    expect(search("usa")[0]?.id).toBe("united-states");
    expect(search("us")[0]?.id).toBe("united-states");
    expect(search("vereinigte staaten")[0]?.id).toBe("united-states");
  });
  it("matches asia to the Asien region", () => {
    expect(search("asia")[0]?.id).toBe("asia");
  });
  it("matches oesterreich", () => {
    expect(search("oesterreich")[0]?.id).toBe("austria");
  });
});

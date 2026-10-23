import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDEXNOW_KEY, indexNowAccepted, indexNowPayload, indexNowKeyLocation, ownUrls } from "./indexnow";

describe("IndexNow", () => {
  it("der Schlüssel liegt als öffentliche Datei mit genau diesem Inhalt auf der Domain", () => {
    expect(readFileSync(`public/${INDEXNOW_KEY}.txt`, "utf8")).toBe(INDEXNOW_KEY);
    expect(indexNowKeyLocation()).toBe(`https://globesim.de/${INDEXNOW_KEY}.txt`);
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
  });
  it("meldet nur eigene https-Adressen, ohne Duplikate", () => {
    const urls = ownUrls(["https://globesim.de/", "https://globesim.de/", "http://globesim.de/faq", "https://evil.example/x", "kaputt", "https://globesim.de/faq"]);
    expect(urls).toEqual(["https://globesim.de/", "https://globesim.de/faq"]);
  });
  it("baut die Meldung mit Host, Schlüssel und Schlüssel-Adresse", () => {
    const p = indexNowPayload(["https://globesim.de/ratgeber/esim-tuerkei"]);
    expect(p).toMatchObject({ host: "globesim.de", key: INDEXNOW_KEY, urlList: ["https://globesim.de/ratgeber/esim-tuerkei"] });
  });
  it("nimmt 200 und 202 an, alles andere nicht", () => {
    expect(indexNowAccepted(200)).toBe(true);
    expect(indexNowAccepted(202)).toBe(true);
    expect(indexNowAccepted(403)).toBe(false);
    expect(indexNowAccepted(429)).toBe(false);
  });
});

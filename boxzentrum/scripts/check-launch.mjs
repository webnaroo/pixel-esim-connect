// Prüft vor dem Livegang, ob alle Pflichtangaben vorhanden sind. Bricht mit Fehler ab, wenn nicht.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const legal = await readFile(path.join(root, "src/content/legal.ts"), "utf8");
const required = ["entity", "representatives", "editor", "hosting", "logRetention"];
const missing = required.filter((key) => new RegExp(`\\b${key}:\\s*null\\b`).test(legal));

const checks = [
  ...missing.map((k) => `Impressum/Datenschutz: Feld „${k}“ in src/content/legal.ts fehlt`),
];
const site = await readFile(path.join(root, "src/content/site.ts"), "utf8");
const checked = site.match(/checked: "(\d{4}-\d{2})"/)?.[1];
const now = new Date().toISOString().slice(0, 7);
if (checked && checked < now) checks.push(`Google-Bewertungen zuletzt ${checked} geprüft – Zahl in src/content/site.ts aktualisieren`);

if (checks.length) {
  console.error("Noch nicht bereit für den Livegang:\n" + checks.map((c) => `  ✗ ${c}`).join("\n"));
  console.error("\nOffene inhaltliche Fragen: docs/OFFENE-FRAGEN.md");
  process.exit(1);
}
console.log("✓ Alle Pflichtangaben vorhanden.");

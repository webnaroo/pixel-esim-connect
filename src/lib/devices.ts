// Pure rules for the eSIM device list (search, CSV import, staleness).
export type Device = { id: string; manufacturer: string; model: string; release_year: number | null; esim_supported: boolean; notes: string | null; source_url: string; checked_at: string; active: boolean };
export type DeviceInput = Omit<Device, "id" | "active">;

export const MIN_SEARCH = 3;
export const STALE_MONTHS = 12;

export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
export const deviceKey = (manufacturer: string, model: string) => `${norm(manufacturer)}|${norm(model)}`;

/** Returns null when the query is too short (no filtering). */
export function matchesDevice(d: Pick<Device, "manufacturer" | "model">, query: string): boolean | null {
  const q = norm(query);
  if (q.length < MIN_SEARCH) return null;
  return norm(d.manufacturer).includes(q) || norm(d.model).includes(q) || norm(`${d.manufacturer}${d.model}`).includes(q);
}

export type DeviceGroup<T> = { manufacturer: string; models: T[] };
export function groupDevices<T extends Pick<Device, "manufacturer" | "model" | "release_year">>(list: T[]): DeviceGroup<T>[] {
  const map = new Map<string, DeviceGroup<T>>();
  for (const d of list) {
    const k = norm(d.manufacturer);
    if (!map.has(k)) map.set(k, { manufacturer: d.manufacturer.trim(), models: [] });
    map.get(k)!.models.push(d);
  }
  const groups = [...map.values()].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer, "de"));
  for (const g of groups) g.models.sort((a, b) => (b.release_year ?? 0) - (a.release_year ?? 0) || b.model.localeCompare(a.model, "de", { numeric: true }));
  return groups;
}

export function isStale(checkedAt: string, now = new Date()): boolean {
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - STALE_MONTHS);
  return new Date(checkedAt) < limit;
}

export function oldestCheck(list: Pick<Device, "checked_at">[]): string | null {
  return list.reduce<string | null>((min, d) => (!min || d.checked_at < min ? d.checked_at : min), null);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === ";") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export const CSV_COLUMNS = ["manufacturer", "model", "release_year", "esim_supported", "notes", "source_url", "checked_at"] as const;

export type ValidateResult = { ok: true; value: DeviceInput } | { ok: false; error: string };
export function validateDevice(raw: Record<string, string | number | boolean | null | undefined>): ValidateResult {
  const s = (k: string) => String(raw[k] ?? "").trim();
  const manufacturer = s("manufacturer"), model = s("model");
  if (!manufacturer) return { ok: false, error: "Hersteller fehlt" };
  if (!model) return { ok: false, error: "Modell fehlt" };
  let release_year: number | null = null;
  if (s("release_year")) {
    const y = Number(s("release_year"));
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return { ok: false, error: "Erscheinungsjahr ungültig" };
    release_year = y;
  }
  const sup = s("esim_supported").toLowerCase();
  let esim_supported: boolean;
  if (["true", "1", "ja", "yes", "wahr"].includes(sup)) esim_supported = true;
  else if (["false", "0", "nein", "no", "falsch"].includes(sup)) esim_supported = false;
  else return { ok: false, error: "esim_supported muss true/false sein" };
  const source_url = s("source_url");
  if (!/^https?:\/\/\S+\.\S+/.test(source_url)) return { ok: false, error: "Quelle (source_url) fehlt oder ist keine URL" };
  const checked_at = s("checked_at");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checked_at) || Number.isNaN(Date.parse(checked_at))) return { ok: false, error: "Prüfdatum muss JJJJ-MM-TT sein" };
  if (new Date(checked_at) > new Date(Date.now() + 86400000)) return { ok: false, error: "Prüfdatum liegt in der Zukunft" };
  return { ok: true, value: { manufacturer, model, release_year, esim_supported, notes: s("notes") || null, source_url, checked_at } };
}

export type ImportPreview = { valid: { line: number; value: DeviceInput }[]; errors: { line: number; error: string }[]; duplicates: { line: number; label: string }[] };
export function previewImport(text: string, existingKeys: Set<string>): ImportPreview {
  const rows = parseCsv(text);
  const out: ImportPreview = { valid: [], errors: [], duplicates: [] };
  if (!rows.length) { out.errors.push({ line: 1, error: "Datei ist leer" }); return out; }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = CSV_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) { out.errors.push({ line: 1, error: `Spalten fehlen: ${missing.join(", ")}` }); return out; }
  const seen = new Set(existingKeys);
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const rec: Record<string, string> = {};
    header.forEach((h, j) => (rec[h] = r[j] ?? ""));
    const v = validateDevice(rec);
    if (!v.ok) { out.errors.push({ line, error: v.error }); return; }
    const k = deviceKey(v.value.manufacturer, v.value.model);
    if (seen.has(k)) { out.duplicates.push({ line, label: `${v.value.manufacturer} ${v.value.model}` }); return; }
    seen.add(k);
    out.valid.push({ line, value: v.value });
  });
  return out;
}

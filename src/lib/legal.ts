// Pure rules for legal pages. No I/O. Company data is never invented: empty fields render as a visible gap.
export const LEGAL_SLUGS = ["impressum", "datenschutz", "agb", "widerruf", "rueckerstattung", "zahlungsarten", "globemoney"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const COMPANY_FIELDS = [
  { key: "company_name", label: "Firmenname" },
  { key: "legal_form", label: "Rechtsform" },
  { key: "street", label: "Straße und Hausnummer" },
  { key: "zip", label: "PLZ" },
  { key: "city", label: "Ort" },
  { key: "country", label: "Land" },
  { key: "representative", label: "Vertreten durch" },
  { key: "register_court", label: "Registergericht" },
  { key: "register_number", label: "Registernummer" },
  { key: "vat_id", label: "USt-IdNr." },
  { key: "email", label: "E-Mail" },
  { key: "phone", label: "Telefon" },
] as const;
export type CompanyInfo = Partial<Record<(typeof COMPANY_FIELDS)[number]["key"], string>>;

export function parseCompanyInfo(v: unknown): CompanyInfo {
  if (!v || typeof v !== "object") return {};
  const out: CompanyInfo = {};
  for (const f of COMPANY_FIELDS) {
    const x = (v as Record<string, unknown>)[f.key];
    if (typeof x === "string" && x.trim()) out[f.key] = x.trim();
  }
  return out;
}

/** Replaces {field} with company data; missing values become "[fehlt: Label]". Unknown placeholders stay untouched. */
export function fillLegal(body: string, info: CompanyInfo): { text: string; missing: string[] } {
  const missing = new Set<string>();
  const text = body.replace(/\{([a-z_]+)\}/g, (m, key: string) => {
    const f = COMPANY_FIELDS.find((x) => x.key === key);
    if (!f) return m;
    const v = info[f.key];
    if (v) return v;
    missing.add(f.label);
    return `[fehlt: ${f.label}]`;
  });
  return { text, missing: [...missing] };
}

export const isLegalSlug = (s: string): s is LegalSlug => (LEGAL_SLUGS as readonly string[]).includes(s);

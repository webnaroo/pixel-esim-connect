const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatPrice(value: number | null | undefined, currency = "EUR"): string {
  if (value == null) return "";
  if (currency === "EUR") return eur.format(value);
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(value);
}

export function formatData(mb: number | null): string {
  if (mb == null) return "Unlimited";
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1).replace(".", ",")} GB`;
  }
  return `${mb} MB`;
}

export function formatDays(days: number): string {
  return days === 1 ? "1 Tag" : `${days} Tage`;
}

export const USE_FIXTURES = import.meta.env['VITE_USE_FIXTURES'] === "true";

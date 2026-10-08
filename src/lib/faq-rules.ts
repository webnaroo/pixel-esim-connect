// FAQ texts must not hardcode claims about throttling, prices or coverage — those come from the database via placeholders.
export const FAQ_PLACEHOLDERS = ["{min_price}", "{destination_count}", "{unlimited_claim}"] as const;
export type FaqContext = { minPrice: string | null; destinationCount: number | null; unlimitedClaim: string | null };

const RULES: { re: RegExp; msg: string }[] = [
  { re: /(\d+[.,]?\d*\s?(€|eur\b|euro))|(€\s?\d)/i, msg: "Feste Preise sind nicht erlaubt. Nutze {min_price}." },
  { re: /(ohne|keine?)\s+drossel|ungedrosselt|drosselfrei|no\s+throttl/i, msg: "Aussagen zur Drosselung nur über {unlimited_claim}." },
  { re: /\d+\s*\+?\s*(länder|reiseziele|staaten|destinationen)/i, msg: "Feste Abdeckungszahlen sind nicht erlaubt. Nutze {destination_count}." },
];

/** Returns rule violations (empty = ok). */
export function checkFaqText(text: string): string[] {
  return RULES.filter((r) => r.re.test(text)).map((r) => r.msg);
}

/** Fills DB placeholders. Returns null if a required value is missing — the FAQ entry is then hidden instead of showing a guess. */
export function fillFaq(text: string, ctx: FaqContext): string | null {
  let ok = true;
  const out = text
    .replace(/\{min_price\}/g, () => (ctx.minPrice ?? ((ok = false), "")))
    .replace(/\{destination_count\}/g, () => (ctx.destinationCount ? String(ctx.destinationCount) : ((ok = false), "")))
    .replace(/\{unlimited_claim\}/g, () => (ctx.unlimitedClaim ?? ((ok = false), "")));
  return ok ? out : null;
}

/** Questions about whether a device works with eSIM get the compatibility-check button. */
const DEVICE_WORDS = /\b(smartphones?|ger[äa]te?s?|iphones?|handys?|tablets?|ipads?|devices?)\b/i;
export function isCompatFaq(question: string): boolean {
  return DEVICE_WORDS.test(question) && /(eSIM|kompatib)/i.test(question);
}

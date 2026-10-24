// GlobeMoney von Hand buchen: Eingabe und Regeln. Reine Funktionen, ohne Datenbank.
import { z } from "zod";

export const ADJUST_MAX_EURO = 500;

export const adjustInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  /** Euro: positiv = gutschreiben, negativ = abziehen. Höchstens 500 € pro Buchung, ganze Cent. */
  amount: z.number().finite().refine((v) => v !== 0, "Betrag darf nicht 0 sein")
    .refine((v) => Math.abs(v) <= ADJUST_MAX_EURO, `Höchstens ${ADJUST_MAX_EURO} € pro Buchung`)
    .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, "Höchstens zwei Nachkommastellen"),
  reason: z.string().trim().min(3, "Bitte einen Grund angeben").max(200),
  /** Nur bei Gutschriften: zählt der Betrag für die Stufe (Aufstieg)? Abzüge senken die Stufe nie. */
  countsForTier: z.boolean().default(true),
});

export const findInputSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

/** Abziehen darf nie mehr sein als der Kontostand, sonst entstünde eine Schuld, die spätere Gutschriften auffrisst. */
export function deductionAllowed(balanceCents: number, amountEuro: number): boolean {
  if (amountEuro >= 0) return true;
  return Math.round(-amountEuro * 100) <= balanceCents;
}

/** Muster für ILIKE ohne Platzhalter: Unterstrich und Prozent in E-Mail-Adressen sind normale Zeichen. */
export function exactIlikePattern(email: string): string {
  return email.replace(/[\\%_]/g, (c) => `\\${c}`);
}

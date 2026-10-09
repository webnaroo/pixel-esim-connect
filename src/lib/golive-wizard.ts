// Go-live assistant: pure step evaluation. Server collects facts (never secret values), this decides green/red.
export const SHOP_CONFIRM_PHRASE = "Shop jetzt einschalten";

export type WizardFacts = {
  key: { set: boolean; sandbox: boolean; pingOk: boolean; pingMessage: string };
  webhook: { liveSecretSet: boolean; liveValidEvents: number; recent401: number; sandboxEndpointRemovedConfirmed: boolean };
  catalog: { lastSyncOk: boolean; lastSyncAt: string | null; activePlans: number; countries: number; unpriced: number; noMargin: number };
  stripe: { liveKey: boolean; liveSecret: boolean; liveEvents: number; dashboardConfirmed: boolean };
  email: { authTemplates: boolean; testOk: boolean; replyConfirmed: boolean };
  purchase: { orderId: string | null; paid: boolean; issuedWebhook: boolean; installData: boolean; emailSent: boolean; costMatches: boolean | null; refunded: boolean };
  autoRefund: { decided: boolean; enabled: boolean };
  shop: { missing: string[]; enabled: boolean };
};

export type StepResult = { ok: boolean; checked: string[]; reason?: string; next: string };
export const STEP_TITLES = [
  "eSIMerge Live-Schlüssel", "eSIMerge Live-Webhook", "Katalog (Live)", "Sandbox-Daten ausblenden",
  "Stripe Live", "E-Mails", "Testkauf", "Automatische Erstattung", "Shop einschalten",
] as const;
export const STEP_COUNT = STEP_TITLES.length;

export function evaluateStep(step: number, f: WizardFacts): StepResult {
  switch (step) {
    case 1: {
      const checked = ["Schlüssel gesetzt", "Modus des Schlüssels", "Testabruf des Katalogs"];
      if (!f.key.set) return { ok: false, checked, reason: "ESIMERGE_API_KEY ist nicht gesetzt.", next: "Live-Schlüssel im Secrets-Dialog eintragen." };
      if (f.key.sandbox) return { ok: false, checked, reason: "Das ist ein Sandbox-Schlüssel (esm_sk_test_…). Für den Shop wird ein Live-Schlüssel (esm_sk_live_…) gebraucht.", next: "Schlüssel im Secrets-Dialog durch den Live-Schlüssel ersetzen." };
      if (!f.key.pingOk) return { ok: false, checked, reason: `eSIMerge antwortet nicht mit dem Schlüssel: ${f.key.pingMessage}`, next: "Schlüssel im Portal prüfen (aktiv, Live) und neu eintragen." };
      return { ok: true, checked, next: "Live-Webhook einrichten." };
    }
    case 2: {
      const checked = ["Live-Webhook-Geheimnis gesetzt", "gültig signierte Live-Events", "abgelehnte Signaturen (letzte 10 Min.)", "Sandbox-Endpunkt entfernt (deine Bestätigung)"];
      if (!f.webhook.liveSecretSet) return { ok: false, checked, reason: "ESIMERGE_WEBHOOK_SECRET_LIVE fehlt – eSIMerge bekäme die Antwort 503 (nicht eingerichtet).", next: "Geheimnis im Secrets-Dialog eintragen." };
      if (f.webhook.liveValidEvents === 0) return { ok: false, checked, reason: f.webhook.recent401 > 0 ? `${f.webhook.recent401} Nachricht(en) mit falscher Unterschrift (401). Das eingetragene Geheimnis passt nicht zum Live-Endpunkt im Portal.` : "Noch keine gültig signierte Live-Nachricht angekommen. Wenn das Portal 404 meldet, ist die URL falsch oder die Seite noch nicht veröffentlicht.", next: "Im Portal eine Testnachricht senden und erneut prüfen." };
      if (!f.webhook.sandboxEndpointRemovedConfirmed) return { ok: false, checked, reason: "Bestätigung fehlt, dass der alte Sandbox-Endpunkt im Portal gelöscht ist.", next: "Sandbox-Endpunkt im Portal löschen und hier bestätigen." };
      return { ok: true, checked, next: "Live-Katalog synchronisieren." };
    }
    case 3: {
      const checked = ["letzter Sync erfolgreich", "aktive Tarife", "Tarife ohne Preis", "Tarife ohne Marge"];
      if (f.key.sandbox || !f.key.set) return { ok: false, checked, reason: "Schlüssel ist nicht Live – der Katalog wäre der Sandbox-Katalog.", next: "Schritt 1 abschließen." };
      if (!f.catalog.lastSyncOk) return { ok: false, checked, reason: "Der letzte Sync ist nicht erfolgreich gelaufen.", next: "„Live-Sync starten“ drücken." };
      if (f.catalog.activePlans === 0) return { ok: false, checked, reason: "Keine aktiven Tarife.", next: "Wechselkurs und Margenregeln prüfen, dann neu synchronisieren." };
      if (f.catalog.noMargin > 0) return { ok: false, checked, reason: `${f.catalog.noMargin} Tarife ohne Marge.`, next: "Vorschlag unten ansehen; Preise änderst nur du unter „Preise“." };
      return { ok: true, checked, next: "Sandbox-Daten ausblenden." };
    }
    case 4: {
      const checked = ["Schlüssel ist Live (Sandbox-Banner aus)", "Sandbox-Bestellungen/-Events standardmäßig ausgeblendet"];
      if (f.key.sandbox) return { ok: false, checked, reason: "Schlüssel ist noch Sandbox.", next: "Schritt 1 abschließen." };
      return { ok: true, checked, next: "Stripe Live prüfen." };
    }
    case 5: {
      const checked = ["Stripe Live-Zugang", "Live-Webhook-Geheimnis", "verarbeitete Live-Events", "Dashboard-Klickliste (deine Bestätigung)"];
      if (!f.stripe.liveKey) return { ok: false, checked, reason: "Kein Stripe-Live-Zugang.", next: "Go-Live in der Zahlungsübersicht abschließen." };
      if (!f.stripe.liveSecret) return { ok: false, checked, reason: "Live-Webhook-Geheimnis fehlt.", next: "Zahlungsverbindung neu verbinden." };
      if (!f.stripe.dashboardConfirmed) return { ok: false, checked, reason: "Klickliste im Stripe-Dashboard noch nicht bestätigt.", next: "Klickliste abarbeiten und bestätigen." };
      return { ok: true, checked, next: f.stripe.liveEvents > 0 ? "E-Mails prüfen." : "E-Mails prüfen. Ein Live-Event kommt spätestens mit dem Testkauf." };
    }
    case 6: {
      const checked = ["Anmelde-Mails im GlobeSIM-Design", "Test-E-Mail gesendet", "Antwort bei support@globesim.de (deine Bestätigung)"];
      if (!f.email.authTemplates) return { ok: false, checked, reason: "Anmelde-Mails fehlen.", next: "Vorlagen anlegen." };
      if (!f.email.testOk) return { ok: false, checked, reason: "Noch keine erfolgreiche Test-E-Mail.", next: "„Test-E-Mail senden“ drücken." };
      if (!f.email.replyConfirmed) return { ok: false, checked, reason: "Ob deine Antwort bei support@globesim.de ankam, kann ich nicht selbst sehen.", next: "Auf die Test-E-Mail antworten und hier bestätigen." };
      return { ok: true, checked, next: "Testkauf." };
    }
    case 7: {
      const p = f.purchase;
      const checked = ["Live-Bestellung angelegt und bezahlt", "Webhook order.issued verarbeitet", "Installationsdaten vorhanden", "Bestätigungs-E-Mail gesendet", "Einkaufspreis = Katalog", "von Hand erstattet"];
      if (!p.orderId) return { ok: false, checked, reason: "Noch keine Live-Bestellung gefunden.", next: "Testkauf mit dem kleinsten Tarif durchführen." };
      if (!p.paid) return { ok: false, checked, reason: "Bestellung ist nicht bezahlt.", next: "Zahlung abschließen." };
      if (!p.issuedWebhook) return { ok: false, checked, reason: "Kein verarbeitetes order.issued für diese Bestellung.", next: "Bis zu 2 Minuten warten, dann erneut prüfen." };
      if (!p.installData) return { ok: false, checked, reason: "Installationsdaten fehlen.", next: "Bestellung unter „Bestellungen“ prüfen." };
      if (!p.emailSent) return { ok: false, checked, reason: "Bestätigungs-E-Mail wurde nicht gesendet.", next: "E-Mail-Status der Bestellung prüfen." };
      if (p.costMatches === false) return { ok: false, checked, reason: "Bezahlter Einkaufspreis weicht vom Katalog ab.", next: "Preis-Prüfliste ansehen." };
      if (!p.refunded) return { ok: false, checked, reason: "Noch nicht erstattet.", next: "Unter „Bestellungen“ von Hand erstatten, dann erneut prüfen." };
      return { ok: true, checked, next: "Automatische Erstattung entscheiden." };
    }
    case 8:
      return f.autoRefund.decided ? { ok: true, checked: ["Entscheidung gespeichert"], next: "Shop einschalten." } : { ok: false, checked: ["Entscheidung gespeichert"], reason: "Noch keine Entscheidung.", next: "„An“ oder „Aus lassen“ wählen." };
    case 9:
      return f.shop.missing.length ? { ok: false, checked: ["vollständige Shop-Checkliste"], reason: `Offen: ${f.shop.missing.join(", ")}`, next: "Offene Punkte erledigen." } : { ok: true, checked: ["vollständige Shop-Checkliste"], next: f.shop.enabled ? "Beobachtungsmodus läuft." : `Zum Einschalten „${SHOP_CONFIRM_PHRASE}“ bestätigen.` };
  }
  return { ok: false, checked: [], reason: "Unbekannter Schritt", next: "" };
}

/** A step is only ticked when its check is green right now. */
export function tickStep(done: Record<string, string>, step: number, result: StepResult, now: Date): Record<string, string> {
  if (!result.ok) return done;
  return { ...done, [String(step)]: now.toISOString() };
}

/** The shop switch opens only with a green checklist and the exact confirmation phrase. */
export function canSwitchShopOn(missing: string[], confirmation: string | undefined): boolean {
  return missing.length === 0 && confirmation === SHOP_CONFIRM_PHRASE;
}

export const OBSERVE_MINUTES = 15;

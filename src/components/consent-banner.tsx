import { useEffect, useState } from "react";
import { readConsent, saveConsent } from "@/lib/meta-pixel";
import { Button } from "@/components/ui-kit";

/** Cookie consent: "Ablehnen" and "Akzeptieren" are equally prominent; nothing loads before a choice. */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (!c) setOpen(true);
    const reopen = () => { setMarketing(readConsent()?.marketing ?? false); setDetails(true); setOpen(true); };
    window.addEventListener("globesim:consent-open", reopen);
    return () => window.removeEventListener("globesim:consent-open", reopen);
  }, []);

  if (!open) return null;
  const decide = (m: boolean) => { setOpen(false); saveConsent(m); };

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-5">
      <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-5 shadow-lg">
        <h2 id="consent-title" className="text-lg">Cookies & Datenschutz</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Wir nutzen technisch notwendige Speicherungen (z. B. Warenkorb, Anmeldung). Mit deiner Zustimmung setzen wir zusätzlich den Meta Pixel ein, um unsere Werbung zu messen. Dabei werden Daten an Meta Platforms Ireland übertragen. Du kannst deine Wahl jederzeit über „Cookie-Einstellungen" in der Fußzeile ändern.
        </p>
        {details && (
          <div className="mt-4 space-y-3 rounded-xl border border-line p-4 text-sm">
            <label className="flex items-start gap-3"><input type="checkbox" checked disabled className="mt-1 size-4" /><span><b>Notwendig</b> – immer aktiv, für Warenkorb, Kasse und Anmeldung.</span></label>
            <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 size-4 accent-[var(--color-primary)]" /><span><b>Marketing (Meta Pixel)</b> – Messung von Seitenaufrufen, angesehenen Tarifen, Kassenstarts und Käufen.</span></label>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => decide(false)}>Ablehnen</Button>
          {details
            ? <Button variant="secondary" onClick={() => decide(marketing)}>Auswahl speichern</Button>
            : <Button variant="secondary" onClick={() => setDetails(true)}>Einstellungen</Button>}
          <Button onClick={() => decide(true)}>Alle akzeptieren</Button>
        </div>
      </div>
    </div>
  );
}

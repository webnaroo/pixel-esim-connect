import { DeviceMobile } from "@phosphor-icons/react";
import { CompatCheck } from "@/components/compat-check";
import { Section } from "./section";

export function CompatibilitySection() {
  return (
    <Section labelledBy="compat-h" className="pb-0 sm:pb-0">
      <div className="reveal grid gap-6 rounded-xl border border-line bg-surface p-6 lg:grid-cols-[auto_1fr] lg:gap-8 lg:p-10">
        <span className="flex size-12 items-center justify-center rounded-lg bg-primary/8 text-primary">
          <DeviceMobile size={28} weight="duotone" aria-hidden />
        </span>
        <div>
          <h2 id="compat-h">Ist mein Gerät eSIM-fähig?</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg">iPhone</h3>
              <p className="mt-1 text-ink-muted">Einstellungen › Mobilfunk. Siehst du „eSIM hinzufügen“ oder „Mobilfunktarif hinzufügen“, ist dein iPhone eSIM-fähig.</p>
            </div>
            <div>
              <h3 className="text-lg">Android</h3>
              <p className="mt-1 text-ink-muted">Einstellungen › Verbindungen › SIM-Manager (Samsung) bzw. Netzwerk & Internet › SIMs (Pixel). Gibt es „eSIM hinzufügen“, passt es.</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-ink-muted">Wichtig: Das Gerät darf keine Netzsperre (SIM-Lock) haben. Schnellcheck: Wähle *#06# – wird eine EID angezeigt, unterstützt dein Gerät eSIM.</p>
          <CompatCheck className="mt-5" />
        </div>
      </div>
    </Section>
  );
}

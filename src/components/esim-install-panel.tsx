import { useEffect, useState } from "react";
import { SegmentedControl, btnClass } from "@/components/ui-kit";
import { detectInstallDevice, installLinks, type InstallDevice } from "@/lib/install-device";

export type InstallPanelData = {
  lpa: string;
  smdp: string | null;
  activationCode: string | null;
  iosUrl?: string | null;
  androidUrl?: string | null;
  validityDays?: number | null;
  activatedAt?: string | null;
  /** eSIMerge expires_at = profile lifetime / install window, never the plan validity. */
  installUntil?: string | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}

function Qr({ value }: { value: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("qrcode").then((q) => q.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" })).then((s) => alive && setSvg(s));
    return () => { alive = false; };
  }, [value]);
  return (
    <div className="mx-auto aspect-square w-full max-w-[240px] rounded-lg border border-line bg-surface p-3" role="img" aria-label="QR-Code zur eSIM-Installation">
      {svg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
    </div>
  );
}

function Copy({ label, value }: { label: string; value: string }) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const copy = async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(value); ok = true; } catch {
      const ta = document.createElement("textarea");
      ta.value = value; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
    }
    setState(ok ? "done" : "manual");
    if (ok) setTimeout(() => setState("idle"), 1500);
  };
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <code className="min-w-0 select-all break-all text-sm text-ink">{value}</code>
        <button type="button" onClick={copy} className="min-h-11 shrink-0 px-2 text-sm font-medium text-primary">{state === "done" ? "Kopiert" : "Kopieren"}</button>
      </div>
      {state === "manual" && <p className="mt-2 text-xs text-ink-muted" role="status">Kopieren ist hier blockiert. Tipp lange auf den Text, um ihn zu markieren und zu kopieren.</p>}
    </div>
  );
}

const STEPS = {
  ios: ["Einstellungen öffnen → Mobilfunk → eSIM hinzufügen.", "„QR-Code verwenden“ wählen und den Code scannen.", "Die eSIM als „Reise“ benennen und für mobile Daten auswählen.", "Am Ziel „Datenroaming“ für diese eSIM einschalten."],
  android: ["Einstellungen → Netzwerk & Internet → SIMs → eSIM hinzufügen.", "„QR-Code scannen“ wählen und den Code scannen.", "Die neue eSIM für mobile Daten auswählen.", "Am Ziel „Roaming“ für diese eSIM einschalten."],
};

const NOTE = "Die eSIM lässt sich nur einmal installieren. Lösche sie nicht vor der Reise. Für die Installation brauchst du Internet (WLAN).";

/** One install view for "Meine eSIMs" and the e-mail link page. */
export function EsimInstallPanel({ data }: { data: InstallPanelData }) {
  // Device is only known in the browser; until hydration nothing device-specific is shown.
  const [device, setDevice] = useState<InstallDevice | null>(null);
  const [override, setOverride] = useState<"ios" | "android" | null>(null);
  useEffect(() => { setDevice(detectInstallDevice(navigator.userAgent, navigator.maxTouchPoints ?? 0)); }, []);
  const links = installLinks(data.lpa, data);
  const shown = override ?? (device === "ios" || device === "android" ? device : null);
  const [os, setOs] = useState<"ios" | "android">("ios");
  useEffect(() => { if (device === "android") setOs("android"); }, [device]);

  return (
    <div className="min-w-0">
      <dl className="space-y-1 text-sm">
        {data.validityDays ? <div className="flex flex-wrap gap-x-2"><dt className="text-ink-muted">Tarif-Laufzeit:</dt><dd className="text-ink">{data.validityDays} Tag{data.validityDays === 1 ? "" : "e"}{data.activatedAt ? ` · aktiviert am ${fmtDate(data.activatedAt)}` : ""}</dd></div> : null}
        {data.installUntil && !data.activatedAt && new Date(data.installUntil).getTime() > Date.now() ? <div className="flex flex-wrap gap-x-2"><dt className="text-ink-muted">Zum Installieren bis:</dt><dd className="text-ink">{fmtDate(data.installUntil)}</dd></div> : null}
      </dl>

      {shown === "ios" && (
        <div className="mt-5">
          <a href={links.ios} className={btnClass("primary", "min-h-12 w-full sm:w-auto")}>Auf dem iPhone installieren</a>
          <button type="button" onClick={() => setOverride("android")} className="mt-2 block min-h-11 text-sm text-ink-muted underline">Android oder anderes Gerät</button>
        </div>
      )}
      {shown === "android" && (
        <div className="mt-5">
          <a href={links.android} className={btnClass("primary", "min-h-12 w-full sm:w-auto")}>Auf Android installieren</a>
          <button type="button" onClick={() => setOverride("ios")} className="mt-2 block min-h-11 text-sm text-ink-muted underline">iPhone oder anderes Gerät</button>
        </div>
      )}
      {device !== null && shown === null && (
        <p className="mt-5 text-sm text-ink">
          {device === "ios_old" ? "Scanne den QR-Code oder nutze die manuelle Eingabe unten." : "Öffne diese Seite auf dem Handy, auf dem die eSIM installiert werden soll."}
        </p>
      )}
      <p className="mt-3 text-sm text-ink-muted">{NOTE}</p>

      <div className="mt-8"><Qr value={data.lpa} /></div>

      <div className="mt-8">
        <SegmentedControl label="Betriebssystem" value={os} onChange={setOs} options={[{ value: "ios", label: "iPhone" }, { value: "android", label: "Android" }]} />
        <ol className="mt-4 space-y-3">
          {STEPS[os].map((s, i) => (
            <li key={s} className="flex gap-3 text-sm text-ink">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
              <span className="min-w-0">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <h3 className="mt-8 text-lg font-semibold">Manuelle Eingabe</h3>
      <div className="mt-3 space-y-3">
        {data.smdp && <Copy label="SM-DP+-Adresse" value={data.smdp} />}
        {data.activationCode && <Copy label="Aktivierungscode" value={data.activationCode} />}
        <Copy label="LPA" value={data.lpa} />
      </div>
    </div>
  );
}

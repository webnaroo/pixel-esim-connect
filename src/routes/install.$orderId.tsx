import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteLayout } from "@/components/layout";
import { EmptyState, FixtureBadge } from "@/components/brand";
import { LinkButton, SegmentedControl, btnClass } from "@/components/ui-kit";
import { noindexHead, useOrderAccess } from "@/components/order-access";

export const Route = createFileRoute("/install/$orderId")({
  validateSearch: z.object({ t: z.string().max(200).optional().default("") }),
  head: () => noindexHead("eSIM installieren – GlobeSIM", "So installierst du deine GlobeSIM-eSIM in wenigen Minuten."),
  component: InstallPage,
});

function Qr({ value }: { value: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("qrcode").then((q) => q.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M" })).then((s) => alive && setSvg(s));
    return () => { alive = false; };
  }, [value]);
  return (
    <div className="mx-auto aspect-square w-full max-w-[260px] rounded-lg border border-line bg-surface p-3" role="img" aria-label="QR-Code zur eSIM-Installation">
      {svg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
    </div>
  );
}

function Copy({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <code className="min-w-0 break-all text-sm text-ink">{value}</code>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}
          className="shrink-0 text-sm font-medium text-primary"
        >
          {done ? "Kopiert" : "Kopieren"}
        </button>
      </div>
    </div>
  );
}

const STEPS = {
  ios: ["Einstellungen öffnen → Mobilfunk → eSIM hinzufügen.", "„QR-Code verwenden“ wählen und den Code scannen.", "Die eSIM als „Reise“ benennen und für mobile Daten auswählen.", "Am Ziel „Datenroaming“ für diese eSIM einschalten."],
  android: ["Einstellungen → Netzwerk & Internet → SIMs → eSIM hinzufügen.", "„QR-Code scannen“ wählen und den Code scannen.", "Die neue eSIM für mobile Daten auswählen.", "Am Ziel „Roaming“ für diese eSIM einschalten."],
};

function InstallPage() {
  const { orderId } = Route.useParams();
  const { t } = Route.useSearch();
  const { order, loading, fixture } = useOrderAccess(orderId, t);
  const [os, setOs] = useState<"ios" | "android">("ios");

  return (
    <SiteLayout>
      <section className="container-page max-w-2xl pb-20 pt-8">
        {loading ? (
          <p className="text-ink-muted">Wird geladen …</p>
        ) : !order?.esim?.lpa ? (
          <EmptyState title={order ? "Deine eSIM wird noch erstellt" : "Link ungültig oder abgelaufen"} action={<LinkButton to="/help" variant="secondary">Hilfe anfordern</LinkButton>}>
            {order ? "Sobald sie bereit ist, erscheint hier der QR-Code." : "Bitte nutze den Link aus deiner Bestell-E-Mail."}
          </EmptyState>
        ) : (
          <>
            {(fixture || order.isTest) && (
              <div className="mb-4 flex items-center gap-2"><FixtureBadge /><span className="text-sm text-ink-muted">Dieser QR-Code ist ungültig und dient nur der Design-Prüfung.</span></div>
            )}
            <h1 className="text-3xl">eSIM installieren</h1>
            <p className="mt-2 text-ink-muted">Installiere die eSIM am besten noch zu Hause im WLAN. Der QR-Code funktioniert nur einmal.</p>

            <div className="mt-8"><Qr value={order.esim.lpa} /></div>
            {order.esim.directInstallUrl && (
              <a href={order.esim.directInstallUrl} className={btnClass("primary", "mt-6 w-full")}>Direkt auf dem iPhone installieren</a>
            )}

            <div className="mt-10">
              <SegmentedControl label="Betriebssystem" value={os} onChange={setOs} options={[{ value: "ios", label: "iPhone" }, { value: "android", label: "Android" }]} />
              <ol className="mt-4 space-y-3">
                {STEPS[os].map((s, i) => (
                  <li key={s} className="flex gap-3 text-sm text-ink">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>

            <h2 className="mt-10 text-xl">Manuelle Eingabe</h2>
            <div className="mt-4 space-y-3">
              {order.esim.smdp && <Copy label="SM-DP+-Adresse" value={order.esim.smdp} />}
              {order.esim.activationCode && <Copy label="Aktivierungscode" value={order.esim.activationCode} />}
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

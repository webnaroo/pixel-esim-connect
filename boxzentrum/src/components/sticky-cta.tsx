import { Link, useRouterState } from "@tanstack/react-router";
import { site } from "@/content/site";
import { useScrollState } from "@/lib/use-scroll";
import { Mail, Phone } from "./icons";

/** Feste Aktionsleiste unten auf dem Smartphone – erscheint nach dem ersten Bildschirm. */
export function StickyCta() {
  const { y } = useScrollState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onTrialPage = pathname.startsWith("/probetraining");
  const visible = y > 480;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity] duration-300 ease-[var(--ease-out)] md:hidden"
      style={{ transform: visible ? "none" : "translate3d(0, 110%, 0)", opacity: visible ? 1 : 0 }}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="flex items-center gap-2 rounded-full bg-anthracite/90 p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,.8)] ring-1 ring-iron backdrop-blur-xl">
        {onTrialPage ? (
          <a href={site.email.href + "?subject=Probetraining"} className="btn btn-light btn-sm flex-1">
            <Mail size={16} /> E-Mail schreiben
          </a>
        ) : (
          <Link to="/probetraining" className="btn btn-primary btn-sm flex-1">
            Probetraining starten
          </Link>
        )}
        <a href={site.phone.href} className="btn btn-ghost btn-sm !px-4" aria-label={`Anrufen: ${site.phone.display}`}>
          <Phone size={16} />
          <span>Anrufen</span>
        </a>
      </div>
    </div>
  );
}

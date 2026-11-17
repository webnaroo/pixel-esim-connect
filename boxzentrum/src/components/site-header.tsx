import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { mainNav } from "@/lib/nav";
import { useScrollState } from "@/lib/use-scroll";
import { site } from "@/content/site";
import { getLenis } from "./smooth-scroll";
import { Close, Mail, Menu, Phone } from "./icons";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden className="block h-[1.35rem] w-[5px] rounded-[1px] bg-red" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="text-[1.5rem] font-[860] uppercase tracking-[-0.01em] [font-stretch:62%]">BoxZentrum</span>{" "}
        <span className="text-[0.8125rem] font-medium text-ash">Kiel</span>
      </span>
    </span>
  );
}

export function SiteHeader() {
  const { y, dir } = useScrollState();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const menuButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  const solid = y > 24 || pathname !== "/";
  const hidden = !open && dir === "down" && y > 420;

  // Menü schließen bei Seitenwechsel
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const lenis = getLenis();
    if (open) {
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
      // nach dem Rendern ohne `inert` fokussieren
      const t = window.setTimeout(() => firstLink.current?.focus({ preventScroll: true }), 60);
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
      window.addEventListener("keydown", onKey);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("keydown", onKey);
      };
    }
    lenis?.start();
    document.documentElement.style.overflow = "";
  }, [open]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-[var(--ease-out)]"
        style={{ transform: hidden ? "translate3d(0,-100%,0)" : "none" }}
      >
        <div
          className={`absolute inset-0 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
            solid && !open
              ? "border-iron/70 bg-pitch/78 backdrop-blur-xl backdrop-saturate-150"
              : "border-transparent bg-transparent"
          }`}
        />
        <nav aria-label="Hauptnavigation" className="shell relative flex h-[var(--nav-h)] items-center justify-between gap-6">
          <Link to="/" className="relative z-10 -m-2 rounded-md p-2">
            <Wordmark />
            <span className="sr-only">, zur Startseite</span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {mainNav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="relative rounded-full px-3.5 py-2 text-[0.9375rem] font-[540] text-fog transition-colors duration-200 hover:text-bone data-[status=active]:text-bone"
                  activeProps={{ "aria-current": "page" }}
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      <span
                        aria-hidden
                        className="absolute inset-x-3.5 -bottom-0.5 h-px origin-left bg-bone transition-transform duration-300 ease-[var(--ease-out)]"
                        style={{ transform: isActive ? "scaleX(1)" : "scaleX(0)" }}
                      />
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="relative z-10 flex items-center gap-2">
            <a href={site.phone.href} className="btn btn-ghost btn-sm hidden xl:inline-flex" aria-label={`Anrufen: ${site.phone.display}`}>
              <Phone size={16} />
              <span className="tnum">{site.phone.display}</span>
            </a>
            <Link to="/probetraining" className="btn btn-primary btn-sm hidden sm:inline-flex">
              Probetraining
            </Link>
            <button
              ref={menuButton}
              type="button"
              className="btn btn-ghost btn-sm !px-3.5 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <Close size={18} /> : <Menu size={18} />}
              <span>{open ? "Schließen" : "Menü"}</span>
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu open={open} firstLink={firstLink} onClose={() => { setOpen(false); menuButton.current?.focus(); }} />
    </>
  );
}

function MobileMenu({
  open,
  firstLink,
  onClose,
}: {
  open: boolean;
  firstLink: React.RefObject<HTMLAnchorElement | null>;
  onClose: () => void;
}) {
  const items = [...mainNav, { to: "/probetraining", label: "Probetraining" } as const];
  return (
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menü"
      inert={!open}
      className="fixed inset-0 z-40 flex flex-col bg-pitch/97 backdrop-blur-xl transition-[opacity,visibility] duration-300 ease-[var(--ease-out)] lg:hidden"
      style={{ opacity: open ? 1 : 0, visibility: open ? "visible" : "hidden" }}
      data-lenis-prevent
    >
      <div className="shell flex flex-1 flex-col overflow-y-auto pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(var(--nav-h)+2rem)]">
        <ul className="flex flex-col">
          {items.map((item, i) => (
            <li key={item.to} className="border-b border-iron/70">
              <Link
                ref={i === 0 ? firstLink : undefined}
                to={item.to}
                onClick={onClose}
                className="t-display group flex items-center justify-between py-3.5 text-[clamp(2.6rem,12vw,4.5rem)] text-bone transition-[transform,opacity] duration-500 ease-[var(--ease-out)] data-[status=active]:text-red"
                style={
                  {
                    transform: open ? "none" : "translate3d(0, 1.25rem, 0)",
                    opacity: open ? 1 : 0,
                    transitionDelay: open ? `${80 + i * 45}ms` : "0ms",
                  } as CSSProperties
                }
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto grid gap-3 pt-10">
          <a href={site.phone.href} className="btn btn-light w-full">
            <Phone size={18} />
            <span className="tnum">{site.phone.display}</span>
          </a>
          <a href={site.email.href} className="btn btn-ghost w-full">
            <Mail size={18} />
            {site.email.display}
          </a>
        </div>
      </div>
    </div>
  );
}

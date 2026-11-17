import type { ReactNode } from "react";
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import archivoLatin from "@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { StickyCta } from "@/components/sticky-cta";
import { SmoothScroll } from "@/components/smooth-scroll";
import { site } from "@/content/site";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { title: site.name },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#070606" },
      { name: "format-detection", content: "telephone=no" },
      { property: "og:site_name", content: site.name },
      { property: "og:locale", content: "de_DE" },
    ],
    links: [
      { rel: "preload", href: archivoLatin, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
    scripts: [{ children: "document.documentElement.classList.add('js')" }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        <a
          href="#inhalt"
          className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-full bg-bone px-5 py-3 font-semibold text-pitch transition-transform focus:translate-y-0"
        >
          Zum Inhalt springen
        </a>
        <SiteHeader />
        <main id="inhalt">{children}</main>
        <SiteFooter />
        <StickyCta />
        <SmoothScroll />
        <Scripts />
      </body>
    </html>
  );
}

export function NotFound() {
  return (
    <section className="shell flex min-h-[80svh] flex-col justify-end pb-20 pt-[calc(var(--nav-h)+4rem)]">
      <p className="text-[0.9375rem] font-[560] text-fog">Fehler 404</p>
      <h1 className="t-display t-xl mt-4 text-bone">
        <span className="block">Daneben.</span>
        <span className="block">Kein Treffer.</span>
      </h1>
      <p className="t-lead mt-8 max-w-[34ch] text-fog">Diese Seite gibt es nicht (mehr). Von hier kommst du zurück in die Halle:</p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Link to="/" className="btn btn-light">
          Zur Startseite
        </Link>
        <Link to="/trainingsplan" className="btn btn-ghost">
          Trainingsplan
        </Link>
        <Link to="/probetraining" className="btn btn-ghost">
          Probetraining
        </Link>
      </div>
    </section>
  );
}

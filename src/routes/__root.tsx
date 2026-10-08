import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import flagsCss from "flag-icons/css/flag-icons.min.css?url";
import bricolage600 from "@fontsource/bricolage-grotesque/600.css?url";
import instrument400 from "@fontsource/instrument-sans/400.css?url";
import instrument500 from "@fontsource/instrument-sans/500.css?url";
import instrument600 from "@fontsource/instrument-sans/600.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { SearchBox } from "@/components/search-box";
import { legalIndexQuery } from "@/lib/content.functions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-md text-center">
        <p className="text-sm text-ink-muted">Fehler 404</p>
        <h1 className="mt-2">Seite nicht gefunden</h1>
        <p className="mt-3 text-ink-muted">Diese Seite gibt es nicht. Such direkt nach deinem Reiseziel:</p>
        <div className="mt-6 text-left">
          <SearchBox />
        </div>
        <Link to="/" className="mt-6 inline-block font-medium text-primary underline-offset-4 hover:underline">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="max-w-md rounded-lg border border-line border-l-4 border-l-danger bg-surface p-6">
        <h1 className="text-2xl">Diese Seite konnte nicht geladen werden</h1>
        <p className="mt-2 text-sm text-ink-muted">Bitte versuche es erneut. Wenn das Problem bleibt, hilft dir unser Support.</p>
        <div className="mt-5 flex gap-4">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Erneut versuchen
          </button>
          <a href="/" className="font-medium text-ink-muted hover:text-ink">
            Startseite
          </a>
        </div>
        <p className="mt-4 text-xs text-ink-muted">Code: E-PAGE</p>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context }) => context.queryClient.ensureQueryData(legalIndexQuery()),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GlobeSIM – eSIM für deine Reise" },
      { name: "description", content: "eSIM kaufen, in Minuten installieren, ohne Roaming-Überraschung." },
      { property: "og:site_name", content: "GlobeSIM" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#F6F3EE" },
    ],
    links: [
      { rel: "stylesheet", href: bricolage600 },
      { rel: "stylesheet", href: instrument400 },
      { rel: "stylesheet", href: instrument500 },
      { rel: "stylesheet", href: instrument600 },
      { rel: "stylesheet", href: flagsCss },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "GlobeSIM" }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}

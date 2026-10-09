import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

const isNetworkError = (e: unknown) => e instanceof TypeError && /fetch/i.test(e.message);

/** Fallback so a dropped connection (e.g. during a reload) never leaves a blank page. */
function DefaultError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  const offline = isNetworkError(error);
  return (
    <div className="container-page py-16 text-center">
      <h1 className="text-2xl">{offline ? "Verbindung unterbrochen" : "Etwas ist schiefgelaufen"}</h1>
      <p className="mt-2 text-ink-muted">{offline ? "Die Seite konnte gerade nicht geladen werden. Bitte versuch es noch einmal." : "Bitte lade die Seite neu."}</p>
      <button
        type="button"
        onClick={() => { reset(); router.invalidate(); }}
        className="mt-6 h-11 rounded-md bg-primary px-5 font-medium text-primary-foreground"
      >
        Erneut versuchen
      </button>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: (n, e) => isNetworkError(e) && n < 3, retryDelay: (n) => 500 * 2 ** n },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultError,
  });

  return router;
};

import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { explorerCall, explorerEndpoints } from "@/lib/admin.functions";
import { Button, Input } from "@/components/ui-kit";
import { AdminError } from "./admin";
import { privateHead } from "@/lib/seo";

const endpointsQuery = () => queryOptions({ queryKey: ["admin", "explorer"], queryFn: () => explorerEndpoints() });

export const Route = createFileRoute("/_authenticated/admin/explorer")({
  head: () => privateHead("API-Explorer", "Geschützter GlobeSIM-Explorer für maskierte Provider-Antworten."),
  loader: ({ context }) => context.queryClient.ensureQueryData(endpointsQuery()),
  errorComponent: AdminError,
  component: Explorer,
});

type Result = Awaited<ReturnType<typeof explorerCall>>;

function Explorer() {
  const { data: endpoints } = useSuspenseQuery(endpointsQuery());
  const call = useServerFn(explorerCall);
  const [endpoint, setEndpoint] = useState(endpoints[0]?.name ?? "ping");
  const [params, setParams] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const current = endpoints.find((e) => e.name === endpoint);

  async function run() {
    setBusy(true);
    const p = Object.fromEntries(params.split(/[\n,]/).map((s) => s.split("=").map((x) => x.trim())).filter((kv) => kv.length === 2 && kv[0]));
    setResult(await call({ data: { endpoint: endpoint as "ping", params: p } }));
    setBusy(false);
  }

  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <h2 className="text-xl">API-Explorer (nur lesend)</h2>
      <p className="mt-1 text-sm text-ink-muted">Antworten werden maskiert: Tokens, Schlüssel und Aktivierungscodes erscheinen als ***.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <select aria-label="Endpunkt" className="h-12 rounded-md border border-line-strong bg-surface px-3" value={endpoint} onChange={(e) => setEndpoint(e.target.value as typeof endpoint)}>
          {endpoints.map((e) => <option key={e.name} value={e.name}>{e.name}{e.configured ? "" : " (nicht konfiguriert)"}</option>)}
        </select>
        <Input value={params} onChange={(e) => setParams(e.target.value)} placeholder="Parameter: key=value, …" aria-label="Parameter" />
        <Button onClick={run} loading={busy}>Senden</Button>
      </div>
      {current?.path && <p className="mt-2 text-xs text-ink-muted">{current.method} {current.path}</p>}
      {result && (
        <div className="mt-6">
          {result.ok ? (
            <>
              <p className="text-sm tabular">Status {result.status} · {result.latencyMs} ms</p>
              <pre className="mt-2 max-h-[60vh] overflow-auto rounded-md bg-muted p-4 text-xs">{result.body}</pre>
            </>
          ) : (
            <p role="alert" className="rounded-md border border-l-4 border-line border-l-danger p-4 text-sm">{result.message} <span className="text-ink-muted">({result.code})</span></p>
          )}
        </div>
      )}
    </section>
  );
}

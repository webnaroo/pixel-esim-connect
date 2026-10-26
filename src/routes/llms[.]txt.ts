import { createFileRoute } from "@tanstack/react-router";
import { llmsTxt } from "@/lib/llms-txt";

// llms.txt aus Live-Daten: Firmenangaben aus company_info, Zahl der Reiseziele aus dem Katalog. Fehler werden nie zwischengespeichert.
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { publicDb } = await import("@/lib/public-db.server");
          const { parseCompanyInfo } = await import("@/lib/legal");
          const db = publicDb();
          const [{ data: info }, { data: plans }] = await Promise.all([
            db.from("app_settings").select("value").eq("key", "company_info").maybeSingle(),
            db.from("public_plans").select("destination_id").limit(20000),
          ]);
          const count = new Set((plans ?? []).map((p) => p.destination_id)).size;
          return new Response(llmsTxt(parseCompanyInfo(info?.value), count || null), {
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=3600" },
          });
        } catch {
          console.error("llms.txt data read failed");
          return new Response("Temporarily unavailable", { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" } });
        }
      },
    },
  },
});

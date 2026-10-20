import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/seo-analysis")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleSeoAnalysis } = await import("@/lib/seo-ai.server");
    return handleSeoAnalysis(request, {
      apiKey: process.env["GEMINI_API_KEY"], dbUrl: process.env["SUPABASE_URL"], publicKey: process.env["SUPABASE_PUBLISHABLE_KEY"],
    });
  } } },
});
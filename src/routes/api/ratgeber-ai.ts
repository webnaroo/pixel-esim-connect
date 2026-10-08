import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ratgeber-ai")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleRatgeberAi } = await import("@/lib/ratgeber-ai.server");
    return handleRatgeberAi(request, { apiKey: process.env["LOVABLE_API_KEY"], dbUrl: process.env["SUPABASE_URL"], publicKey: process.env["SUPABASE_PUBLISHABLE_KEY"] });
  } } },
});

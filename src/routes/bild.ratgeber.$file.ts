import { createFileRoute } from "@tanstack/react-router";

// Serves Ratgeber cover images (random, unguessable names) from private storage.
export const Route = createFileRoute("/bild/ratgeber/$file")({
  server: { handlers: { GET: async ({ params }) => {
    if (!/^[a-f0-9-]{36}\.webp$/.test(params.file)) return new Response("Not found", { status: 404 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage.from("blog-covers").download(params.file);
    if (error || !data) return new Response("Not found", { status: 404 });
    return new Response(data, { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, immutable", "X-Content-Type-Options": "nosniff" } });
  } } },
});

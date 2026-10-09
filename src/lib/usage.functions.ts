import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Usage is cached per eSIM for 5 minutes to protect the provider. */
export const USAGE_CACHE_MS = 5 * 60_000;

// Data usage of the caller's own eSIM (dashboard). Ownership is checked via RLS on the user's own client.
export const getEsimUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase.from("esims").select("order_id,provider_esim_id,usage_cache,usage_checked_at,status").eq("order_id", data.orderId).eq("user_id", context.userId).maybeSingle();
    if (!own?.provider_esim_id) return { ok: false as const, error: "not_found" };
    // Expired eSIMs are no longer queried at the provider.
    if (own.status === "expired") return own.usage_cache ? { ok: true as const, usage: own.usage_cache as { usedMb: number; totalMb: number | null }, cached: true } : { ok: false as const, error: "expired" };
    const fresh = own.usage_checked_at && Date.now() - new Date(own.usage_checked_at).getTime() < USAGE_CACHE_MS;
    if (fresh && own.usage_cache) return { ok: true as const, usage: own.usage_cache as { usedMb: number; totalMb: number | null }, cached: true };
    try {
      const { getProvider } = await import("./providers/index.server");
      const usage = await getProvider().getUsage!(own.provider_esim_id);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("esims").update({ usage_cache: usage as never, usage_checked_at: new Date().toISOString() }).eq("order_id", own.order_id);
      return { ok: true as const, usage, cached: false };
    } catch {
      return { ok: false as const, error: "provider_unavailable" };
    }
  });

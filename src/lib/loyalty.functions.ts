import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Eigener GlobeMoney-Stand: Guthaben, Stufe, Fortschritt. */
export const getMyLoyalty = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loyaltySummary } = await import("./loyalty.server");
    return loyaltySummary(context.userId);
  });

export const myLoyaltyQuery = () => queryOptions({ queryKey: ["loyalty"], queryFn: () => getMyLoyalty() });

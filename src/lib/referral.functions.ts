import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyReferral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { referralSummary } = await import("./referral.server");
    return referralSummary(context.userId);
  });

export const applyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ code: z.string().min(1).max(40) }))
  .handler(async ({ context, data }) => {
    const { applyReferral } = await import("./referral.server");
    return { result: await applyReferral(context.userId, data.code) };
  });

export const myReferralQuery = () => queryOptions({ queryKey: ["referral"], queryFn: () => getMyReferral() });

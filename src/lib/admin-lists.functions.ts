// Admin list views with search, filter and paging. Activation codes / LPA / QR are never selected here.
import { createServerFn } from "@tanstack/react-start";
import { queryOptions, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PAGE_SIZE = 50;
export type Row = Record<string, string | number | boolean | null>;
const ListInput = z.object({ kind: z.enum(["customers", "esims", "plans", "api_logs", "sync_runs", "webhooks", "audit"]), q: z.string().trim().max(100).default(""), filter: z.string().max(40).default(""), page: z.number().int().min(0).default(0) });
export type ListKind = z.infer<typeof ListInput>["kind"];

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };
const like = (q: string) => `%${q.replace(/[%_,()]/g, " ")}%`;

export const adminList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ListInput.parse(i))
  .handler(async ({ data, context }) => {
    const c = context as unknown as Ctx;
    const { data: ok } = await c.supabase.rpc("has_role", { _user_id: c.userId, _role: "admin" });
    if (!ok) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const from = data.page * PAGE_SIZE, to = from + PAGE_SIZE - 1;
    const { q, filter } = data;
    let rows: Row[] = [];
    let count = 0;
    switch (data.kind) {
      case "customers": {
        let s = db.from("profiles").select("id,email,name,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
        if (q) s = s.or(`email.ilike.${like(q)},name.ilike.${like(q)}`);
        const r = await s;
        const ids = (r.data ?? []).map((p) => p.id);
        const [{ data: roles }, { data: orders }] = await Promise.all([
          ids.length ? db.from("user_roles").select("user_id,role").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; role: string }[] }),
          ids.length ? db.from("orders").select("user_id").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string | null }[] }),
        ]);
        rows = (r.data ?? []).map((p): Row => ({ ...p, roles: (roles ?? []).filter((x) => x.user_id === p.id).map((x) => x.role).join(", "), orders: (orders ?? []).filter((o) => o.user_id === p.id).length }));
        if (filter) rows = rows.filter((x) => String(x["roles"]).includes(filter));
        count = r.count ?? 0;
        break;
      }
      case "esims": {
        let s = db.from("esims").select("order_id,status,provider_status,iccid,provider_order_id,expires_at,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
        if (filter) s = s.eq("status", filter);
        if (q) s = s.or(`iccid.ilike.${like(q)},provider_order_id.ilike.${like(q)}`);
        const r = await s;
        rows = (r.data ?? []).map((e): Row => ({ ...e, iccid: e.iccid ? `…${e.iccid.slice(-4)}` : null }));
        count = r.count ?? 0;
        break;
      }
      case "plans": {
        let s = db.from("plans").select("id,provider_plan_id,type,data_mb,validity_days,cost_price,cost_currency,sell_price,currency,is_active,throttle_claim,hotspot,destination:destinations!plans_destination_id_fkey(name_de)", { count: "exact" }).order("provider_plan_id").range(from, to);
        if (filter === "active") s = s.eq("is_active", true);
        if (filter === "inactive") s = s.eq("is_active", false);
        if (filter === "unlimited" || filter === "data") s = s.eq("type", filter);
        if (q) s = s.ilike("provider_plan_id", like(q));
        const r = await s;
        rows = (r.data ?? []).map((p): Row => ({ ...p, destination: (p.destination as { name_de?: string } | null)?.name_de ?? "" }));
        count = r.count ?? 0;
        break;
      }
      case "api_logs": {
        let s = db.from("api_logs").select("id,provider,endpoint,status,latency_ms,error,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
        if (filter === "errors") s = s.or("status.gte.400,error.not.is.null");
        if (q) s = s.ilike("endpoint", like(q));
        const r = await s; rows = (r.data ?? []) as Row[]; count = r.count ?? 0;
        break;
      }
      case "sync_runs": {
        let s = db.from("sync_runs").select("id,started_at,finished_at,status,plans_added,plans_updated,plans_deactivated,error", { count: "exact" }).order("started_at", { ascending: false }).range(from, to);
        if (filter) s = s.eq("status", filter);
        const r = await s; rows = (r.data ?? []) as Row[]; count = r.count ?? 0;
        break;
      }
      case "webhooks": {
        let s = db.from("webhook_events").select("id,source,event_id,processed_at,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
        if (filter === "stripe" || filter === "provider") s = s.eq("source", filter);
        if (q) s = s.ilike("event_id", like(q));
        const r = await s; rows = (r.data ?? []) as Row[]; count = r.count ?? 0;
        break;
      }
      case "audit": {
        let s = db.from("audit_log").select("id,actor_id,action,entity,entity_id,created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
        if (filter) s = s.eq("entity", filter);
        if (q) s = s.or(`action.ilike.${like(q)},entity_id.ilike.${like(q)}`);
        const r = await s; rows = (r.data ?? []) as Row[]; count = r.count ?? 0;
        break;
      }
    }
    return { rows, count, pageSize: PAGE_SIZE };
  });

export const adminListQuery = (input: { kind: ListKind; q: string; filter: string; page: number }) =>
  queryOptions({ queryKey: ["admin", "list", input], queryFn: () => adminList({ data: input }), placeholderData: keepPreviousData });

import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deviceKey, validateDevice, type Device } from "./devices";

type Ctx = { supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: boolean | null }> }; userId: string };
async function admin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) throw new Error("Kein Zugriff: Admin-Rolle erforderlich.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function audit(db: Awaited<ReturnType<typeof admin>>, actor: string, action: string, entityId: string | null, meta: Record<string, unknown>) {
  await db.from("audit_log").insert({ actor_id: actor, action, entity: "esim_devices", entity_id: entityId, meta: meta as never });
}

export const listDevicesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin(context as Ctx);
    const { data, error } = await db.from("esim_devices").select("id,manufacturer,model,release_year,esim_supported,notes,source_url,checked_at,active").order("manufacturer").order("release_year", { ascending: false, nullsFirst: false }).limit(10000);
    if (error) throw new Error(error.message);
    return (data ?? []) as Device[];
  });
export const devicesAdminQuery = () => queryOptions({ queryKey: ["admin", "devices"], queryFn: () => listDevicesAdmin() });

const raw = z.object({ manufacturer: z.string(), model: z.string(), release_year: z.union([z.string(), z.number(), z.null()]).optional(), esim_supported: z.union([z.string(), z.boolean()]), notes: z.string().nullable().optional(), source_url: z.string(), checked_at: z.string() });

export const saveDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().optional(), device: raw }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin(context as Ctx);
    const v = validateDevice({ ...data.device, release_year: data.device.release_year ?? "", esim_supported: String(data.device.esim_supported) });
    if (!v.ok) throw new Error(v.error);
    const q = data.id ? db.from("esim_devices").update(v.value).eq("id", data.id).select("id").single() : db.from("esim_devices").insert(v.value).select("id").single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.code === "23505" ? "Dieses Gerät (Hersteller + Modell) gibt es schon." : error.message);
    await audit(db, context.userId, data.id ? "update" : "insert", row.id, v.value);
    return { ok: true };
  });

export const setDeviceActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin(context as Ctx);
    const { error } = await db.from("esim_devices").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, context.userId, data.active ? "activate" : "deactivate", data.id, {});
    return { ok: true };
  });

export const importDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(raw).max(5000) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin(context as Ctx);
    const { data: existing } = await db.from("esim_devices").select("manufacturer,model").limit(10000);
    const seen = new Set((existing ?? []).map((e) => deviceKey(e.manufacturer, e.model)));
    const insert = [], skipped: string[] = [], errors: string[] = [];
    for (const r of data.rows) {
      const v = validateDevice({ ...r, release_year: r.release_year ?? "", esim_supported: String(r.esim_supported) });
      if (!v.ok) { errors.push(`${r.manufacturer} ${r.model}: ${v.error}`); continue; }
      const k = deviceKey(v.value.manufacturer, v.value.model);
      if (seen.has(k)) { skipped.push(`${v.value.manufacturer} ${v.value.model}`); continue; }
      seen.add(k); insert.push(v.value);
    }
    if (insert.length) {
      const { error } = await db.from("esim_devices").insert(insert);
      if (error) throw new Error(error.message);
    }
    await audit(db, context.userId, "import", null, { inserted: insert.length, skipped: skipped.length, errors: errors.length });
    return { inserted: insert.length, skipped, errors };
  });

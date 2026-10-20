// Pure mapping from a Supabase "Send Email" auth hook payload to the emails that must go out.
import { z } from "zod";

export const sendEmailHookSchema = z.object({
  user: z.object({ email: z.string().email(), new_email: z.string().email().optional().nullable().catch(undefined) }).passthrough(),
  email_data: z.object({
    token: z.string().optional().default(""),
    token_hash: z.string().optional().default(""),
    redirect_to: z.string().optional().default(""),
    email_action_type: z.string(),
    token_new: z.string().optional().default(""),
    token_hash_new: z.string().optional().default(""),
  }).passthrough(),
});
export type SendEmailHook = z.infer<typeof sendEmailHookSchema>;

export const AUTH_ACTIONS = ["signup", "invite", "magiclink", "recovery", "email_change", "reauthentication"] as const;
export type AuthAction = (typeof AUTH_ACTIONS)[number];

export type PlannedAuthEmail = {
  action: AuthAction;
  to: string;
  confirmationUrl: string;
  token: string;
  /** email_change only: address the change is requested from / to. */
  oldEmail: string;
  newEmail: string;
};

/** Link that Supabase Auth verifies before it redirects the user to `redirect_to`. */
export function buildVerifyUrl(supabaseUrl: string, tokenHash: string, type: string, redirectTo: string): string {
  const u = new URL(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/verify`);
  u.searchParams.set("token", tokenHash);
  u.searchParams.set("type", type);
  if (redirectTo) u.searchParams.set("redirect_to", redirectTo);
  return u.toString();
}

/**
 * Returns the mails to send, or null for an action type we have no template for.
 * Supabase pairs email_change tokens "crosswise": token_hash_new belongs to the current address (user.email),
 * token_hash to the new one (user.new_email). With secure email change both addresses get a mail, otherwise only the new one.
 */
export function planAuthEmails(hook: SendEmailHook, supabaseUrl: string): PlannedAuthEmail[] | null {
  const { user, email_data: d } = hook;
  const action = d.email_action_type as AuthAction;
  if (!AUTH_ACTIONS.includes(action)) return null;
  const base = { action, token: d.token, oldEmail: user.email, newEmail: user.new_email ?? "" };
  if (action === "email_change") {
    const out: PlannedAuthEmail[] = [];
    const newAddress = user.new_email ?? "";
    if (newAddress && d.token_hash) out.push({ ...base, to: newAddress, confirmationUrl: buildVerifyUrl(supabaseUrl, d.token_hash, "email_change", d.redirect_to) });
    if (d.token_hash_new) out.push({ ...base, to: user.email, confirmationUrl: buildVerifyUrl(supabaseUrl, d.token_hash_new, "email_change", d.redirect_to) });
    return out;
  }
  if (action === "reauthentication") return [{ ...base, to: user.email, confirmationUrl: "" }];
  return [{ ...base, to: user.email, confirmationUrl: buildVerifyUrl(supabaseUrl, d.token_hash, action, d.redirect_to) }];
}

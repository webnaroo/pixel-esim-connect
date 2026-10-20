import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { guardPublicRoute } from "@/lib/public-route-guard.server";
import { planAuthEmails, sendEmailHookSchema, type PlannedAuthEmail } from "@/lib/auth-email";

const SITE_NAME = "GlobeSIM";

// Supabase "Send Email" auth hook (Authentication → Hooks → Send Email → HTTPS). Signature (Standard Webhooks)
// is verified by the guard before anything else. Renders our own templates and sends them through Resend.
export const Route = createFileRoute("/api/public/auth/email-hook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const guard = await guardPublicRoute(request, {
          name: "auth-email-hook",
          secretEnv: "SEND_EMAIL_HOOK_SECRET",
          auth: { kind: "standard-webhooks" },
          limit: { windowSeconds: 60, max: 120 },
        });
        if (!guard.ok) return guard.response;

        let parsed: ReturnType<typeof sendEmailHookSchema.safeParse>;
        try { parsed = sendEmailHookSchema.safeParse(JSON.parse(guard.rawBody)); } catch { return Response.json({ error: "invalid payload" }, { status: 400 }); }
        if (!parsed.success) return Response.json({ error: "invalid payload" }, { status: 400 });

        const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
        if (!supabaseUrl) return Response.json({ error: "not configured" }, { status: 503 });
        const plan = planAuthEmails(parsed.data, supabaseUrl);
        if (!plan) return Response.json({ error: "unsupported action" }, { status: 400 });

        try {
          const { render } = await import("@react-email/render");
          const { sendResendEmail } = await import("@/lib/resend.server");
          const { resolveSenderDomain } = await import("@/lib/email-templates/send-email");
          const { SITE_URL } = await import("@/lib/seo");
          const address = `noreply@${await resolveSenderDomain()}`;
          const messageId = request.headers.get("webhook-id") ?? crypto.randomUUID();
          for (const mail of plan) {
            const { subject, element } = await buildAuthEmail(mail, SITE_URL);
            await sendResendEmail({
              from: { name: SITE_NAME, address },
              to: mail.to,
              subject,
              html: await render(element),
              text: await render(element, { plainText: true }),
              idempotencyKey: `auth-${messageId}-${mail.to}`,
            });
          }
        } catch (e) {
          console.error("auth_email_failed", (e as { code?: string }).code ?? "send_failed");
          return Response.json({ error: "failed to send email" }, { status: 500 });
        }
        return Response.json({ success: true });
      },
    },
  },
});

async function buildAuthEmail(mail: PlannedAuthEmail, siteUrl: string): Promise<{ subject: string; element: React.ReactElement }> {
  const { SignupEmail } = await import("@/lib/email-templates/signup");
  const { InviteEmail } = await import("@/lib/email-templates/invite");
  const { MagicLinkEmail } = await import("@/lib/email-templates/magic-link");
  const { RecoveryEmail } = await import("@/lib/email-templates/recovery");
  const { EmailChangeEmail } = await import("@/lib/email-templates/email-change");
  const { ReauthenticationEmail } = await import("@/lib/email-templates/reauthentication");
  const confirmationUrl = mail.confirmationUrl;
  switch (mail.action) {
    case "signup":
      return { subject: "GlobeSIM – E-Mail-Adresse bestätigen", element: React.createElement(SignupEmail, { siteName: SITE_NAME, siteUrl, recipient: mail.to, confirmationUrl }) };
    case "invite":
      return { subject: "GlobeSIM – Einladung", element: React.createElement(InviteEmail, { siteName: SITE_NAME, siteUrl, confirmationUrl }) };
    case "magiclink":
      return { subject: "GlobeSIM – Dein Anmeldelink", element: React.createElement(MagicLinkEmail, { siteName: SITE_NAME, confirmationUrl }) };
    case "recovery":
      return { subject: "GlobeSIM – Passwort zurücksetzen", element: React.createElement(RecoveryEmail, { siteName: SITE_NAME, confirmationUrl }) };
    case "email_change":
      return { subject: "GlobeSIM – Neue E-Mail-Adresse bestätigen", element: React.createElement(EmailChangeEmail, { siteName: SITE_NAME, oldEmail: mail.oldEmail, email: mail.oldEmail, newEmail: mail.newEmail, confirmationUrl }) };
    case "reauthentication":
      return { subject: "GlobeSIM – Dein Bestätigungscode", element: React.createElement(ReauthenticationEmail, { token: mail.token }) };
  }
}

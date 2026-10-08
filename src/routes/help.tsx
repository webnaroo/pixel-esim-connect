import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout";
import { Button, Input } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse ein.").max(255),
  subject: z.string().trim().min(3, "Bitte gib einen Betreff ein.").max(150),
  message: z.string().trim().min(10, "Bitte beschreibe dein Anliegen in mindestens 10 Zeichen.").max(4000),
});

export const Route = createFileRoute("/help")({
  validateSearch: (s: Record<string, unknown>): { subject?: string } => (typeof s["subject"] === "string" ? { subject: s["subject"].slice(0, 150) } : {}),
  head: () => ({
    meta: [
      { title: "Hilfe & Kontakt | GlobeSIM" },
      { name: "description", content: "Hilfe zur Installation und Nutzung deiner GlobeSIM eSIM. Schreib uns, wir helfen dir weiter." },
      { property: "og:title", content: "Hilfe & Kontakt | GlobeSIM" },
      { property: "og:description", content: "Wir helfen dir bei Fragen zu deiner eSIM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Help,
});

function Help() {
  const { subject } = Route.useSearch();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setSending(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("support_tickets").insert({ ...parsed.data, user_id: u.user?.id ?? null });
    setSending(false);
    if (error) {
      toast.error("Senden fehlgeschlagen. Bitte versuche es erneut.");
      return;
    }
    setSent(true);
  }

  return (
    <SiteLayout>
      <section className="container-page grid max-w-5xl gap-12 pt-10 lg:grid-cols-2">
        <div>
          <h1>Hilfe & Kontakt</h1>
          <p className="mt-4 text-ink-muted">Viele Antworten findest du in den <Link to="/faq" className="text-primary underline-offset-4 hover:underline">häufigen Fragen</Link> und in der <Link to="/how-it-works" className="text-primary underline-offset-4 hover:underline">Installationsanleitung</Link>. Wenn du nicht weiterkommst, schreib uns.</p>
        </div>
        {sent ? (
          <div className="rounded-lg border border-line bg-surface p-6">
            <h2 className="text-xl">Danke, deine Nachricht ist angekommen.</h2>
            <p className="mt-2 text-ink-muted">Wir melden uns per E-Mail bei dir.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="E-Mail" name="email" error={errors['email']}><Input id="email" name="email" type="email" autoComplete="email" /></Field>
            <Field label="Betreff" name="subject" error={errors['subject']}><Input id="subject" name="subject" defaultValue={subject} /></Field>
            <Field label="Nachricht" name="message" error={errors['message']}>
              <textarea id="message" name="message" rows={6} className="w-full rounded-md border border-line-strong bg-surface p-4 text-base focus:border-primary focus:outline-none" />
            </Field>
            <Button type="submit" loading={sending} className="w-full sm:w-auto">Nachricht senden</Button>
          </form>
        )}
      </section>
    </SiteLayout>
  );
}

export function Field({ label, name, error, children }: { label: string; name: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}

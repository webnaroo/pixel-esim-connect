import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, GoogleButton, authHead, isEmail } from "@/components/auth-shell";

export const Route = createFileRoute("/register")({
  head: () => authHead("Konto erstellen", "Erstelle ein GlobeSIM-Konto, um eSIMs und Bestellungen an einem Ort zu verwalten."),
  component: Register,
});

function Register() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim().slice(0, 100);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!isEmail(email)) return void toast.error("Bitte eine gültige E-Mail-Adresse eingeben.");
    if (password.length < 8) return void toast.error("Das Passwort braucht mindestens 8 Zeichen.");
    setBusy(true);
    // Role is always assigned server-side ('user') by the handle_new_user trigger; metadata cannot grant roles.
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { name } } });
    setBusy(false);
    if (error) return void toast.error("Registrierung fehlgeschlagen. Bitte später erneut versuchen.");
    setDone(email);
  }

  if (done) {
    return (
      <AuthShell title="Fast geschafft" intro={`Bitte bestätige deine E-Mail-Adresse über den Link, den wir an ${done} gesendet haben.`}>
        <Link to="/login" className="text-sm font-medium text-primary">Zur Anmeldung</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Konto erstellen">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input name="name" placeholder="Name (optional)" autoComplete="name" aria-label="Name" />
        <Input name="email" type="email" placeholder="E-Mail" autoComplete="email" aria-label="E-Mail" />
        <Input name="password" type="password" placeholder="Passwort (mind. 8 Zeichen)" autoComplete="new-password" aria-label="Passwort" />
        <Button type="submit" loading={busy} className="w-full">Registrieren</Button>
      </form>
      <div className="mt-3"><GoogleButton /></div>
      <p className="mt-6 text-sm font-medium"><Link to="/login" className="text-primary">Schon ein Konto? Anmelden</Link></p>
    </AuthShell>
  );
}

import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button, Input, SegmentedControl } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell, GoogleButton, authHead, isEmail } from "@/components/auth-shell";

export const Route = createFileRoute("/login")({
  head: () => authHead("Anmelden", "Melde dich bei GlobeSIM an, um deine eSIMs und Bestellungen zu sehen."),
  component: Login,
});

function Login() {
  const [method, setMethod] = useState<"password" | "magic">("password");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    if (!isEmail(email)) {
      toast.error("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    setBusy(true);
    if (method === "magic") {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } });
      setBusy(false);
      if (error) {
        toast.error("Der Link konnte nicht gesendet werden. Bitte später erneut versuchen.");
        return;
      }
      setSentTo(email);
      return;
    }
    const password = String(f.get("password") ?? "");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Anmeldung fehlgeschlagen. Bitte Daten prüfen.");
      return;
    }
    navigate({ to: "/" });
  }

  if (user) {
    return (
      <AuthShell title="Angemeldet" intro={user.email ?? undefined}>
        <Button variant="secondary" onClick={() => supabase.auth.signOut()}>Abmelden</Button>
      </AuthShell>
    );
  }

  if (sentTo) {
    return (
      <AuthShell title="Prüfe dein Postfach" intro={`Wir haben einen Anmeldelink an ${sentTo} gesendet. Er ist nur kurz gültig.`}>
        <button className="text-sm font-medium text-primary" onClick={() => setSentTo(null)}>Andere E-Mail verwenden</button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Anmelden">
      <SegmentedControl
        value={method}
        onChange={(v) => setMethod(v as "password" | "magic")}
        options={[
          { value: "password", label: "Passwort" },
          { value: "magic", label: "Magic Link" },
        ]}
      />
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Input name="email" type="email" placeholder="E-Mail" autoComplete="email" aria-label="E-Mail" />
        {method === "password" && (
          <Input name="password" type="password" placeholder="Passwort" autoComplete="current-password" aria-label="Passwort" />
        )}
        <Button type="submit" loading={busy} className="w-full">
          {method === "password" ? "Anmelden" : "Anmeldelink senden"}
        </Button>
      </form>
      <div className="mt-3"><GoogleButton /></div>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm font-medium">
        <Link to="/register" className="text-primary">Noch kein Konto? Registrieren</Link>
        <Link to="/reset-password" className="text-ink-muted hover:text-primary">Passwort vergessen?</Link>
      </div>
    </AuthShell>
  );
}

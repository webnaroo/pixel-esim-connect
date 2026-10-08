import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, authHead, isEmail } from "@/components/auth-shell";

export const Route = createFileRoute("/reset-password")({
  head: () => authHead("Passwort zurücksetzen", "Setze das Passwort für dein GlobeSIM-Konto zurück."),
  component: ResetPassword,
});

function ResetPassword() {
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function request(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!isEmail(email)) return void toast.error("Bitte eine gültige E-Mail-Adresse eingeben.");
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setSent(true); // same message whether or not the account exists
  }

  async function update(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password") ?? "");
    if (pw.length < 8) return void toast.error("Das Passwort braucht mindestens 8 Zeichen.");
    if (pw !== String(f.get("confirm") ?? "")) return void toast.error("Die Passwörter stimmen nicht überein.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return void toast.error("Der Link ist abgelaufen. Bitte fordere einen neuen an.");
    toast.success("Passwort geändert.");
    navigate({ to: "/" });
  }

  if (recovery) {
    return (
      <AuthShell title="Neues Passwort festlegen">
        <form onSubmit={update} className="space-y-4" noValidate>
          <Input name="password" type="password" placeholder="Neues Passwort" autoComplete="new-password" aria-label="Neues Passwort" />
          <Input name="confirm" type="password" placeholder="Passwort wiederholen" autoComplete="new-password" aria-label="Passwort wiederholen" />
          <Button type="submit" loading={busy} className="w-full">Passwort speichern</Button>
        </form>
      </AuthShell>
    );
  }

  if (sent) {
    return (
      <AuthShell title="Prüfe dein Postfach" intro="Falls ein Konto zu dieser Adresse existiert, haben wir einen Link zum Zurücksetzen gesendet.">
        <Link to="/login" className="text-sm font-medium text-primary">Zur Anmeldung</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Passwort zurücksetzen" intro="Gib deine E-Mail-Adresse ein. Wir senden dir einen Link.">
      <form onSubmit={request} className="space-y-4" noValidate>
        <Input name="email" type="email" placeholder="E-Mail" autoComplete="email" aria-label="E-Mail" />
        <Button type="submit" loading={busy} className="w-full">Link senden</Button>
      </form>
      <p className="mt-6 text-sm font-medium"><Link to="/login" className="text-primary">Zurück zur Anmeldung</Link></p>
    </AuthShell>
  );
}

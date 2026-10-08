import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout";
import { Button, Input } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Anmelden | GlobeSIM" },
      { name: "description", content: "Melde dich bei GlobeSIM an, um deine eSIMs und Bestellungen zu sehen." },
      { property: "og:title", content: "Anmelden | GlobeSIM" },
      { property: "og:description", content: "Zugang zu deinen eSIMs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    if (!email || password.length < 8) return toast.error("Bitte E-Mail und ein Passwort mit mindestens 8 Zeichen eingeben.");
    setBusy(true);
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return toast.error(mode === "login" ? "Anmeldung fehlgeschlagen. Bitte Daten prüfen." : "Registrierung fehlgeschlagen.");
    if (mode === "register") return toast.success("Fast geschafft: Bitte bestätige deine E-Mail-Adresse.");
    navigate({ to: "/" });
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google-Anmeldung fehlgeschlagen.");
  }

  return (
    <SiteLayout>
      <section className="container-page max-w-md pt-12">
        {user ? (
          <>
            <h1 className="text-3xl lg:text-4xl">Angemeldet</h1>
            <p className="mt-3 text-ink-muted">{user.email}</p>
            <Button variant="secondary" className="mt-6" onClick={() => supabase.auth.signOut()}>Abmelden</Button>
          </>
        ) : (
          <>
            <h1 className="text-3xl lg:text-4xl">{mode === "login" ? "Anmelden" : "Konto erstellen"}</h1>
            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              <Input name="email" type="email" placeholder="E-Mail" autoComplete="email" aria-label="E-Mail" />
              <Input name="password" type="password" placeholder="Passwort" autoComplete={mode === "login" ? "current-password" : "new-password"} aria-label="Passwort" />
              <Button type="submit" loading={busy} className="w-full">{mode === "login" ? "Anmelden" : "Registrieren"}</Button>
            </form>
            <Button variant="secondary" className="mt-3 w-full" onClick={google}>Weiter mit Google</Button>
            <button className="mt-6 text-sm font-medium text-primary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Noch kein Konto? Registrieren" : "Schon ein Konto? Anmelden"}
            </button>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

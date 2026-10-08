import type { ReactNode } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/layout";
import { Button } from "@/components/ui-kit";
import { lovable } from "@/integrations/lovable/index";

export function authHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | GlobeSIM` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | GlobeSIM` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  };
}

export function AuthShell({ title, intro, children }: { title: string; intro?: string | undefined; children: ReactNode }) {
  return (
    <SiteLayout>
      <section className="container-page max-w-md pb-20 pt-12">
        <h1 className="text-3xl lg:text-4xl">{title}</h1>
        {intro && <p className="mt-3 text-ink-muted">{intro}</p>}
        <div className="mt-8">{children}</div>
      </section>
    </SiteLayout>
  );
}

export function GoogleButton() {
  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google-Anmeldung fehlgeschlagen.");
  }
  return (
    <Button variant="secondary" className="w-full" onClick={google}>
      Weiter mit Google
    </Button>
  );
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

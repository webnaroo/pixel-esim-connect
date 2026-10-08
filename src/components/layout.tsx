import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { List, X, MagnifyingGlass, UserCircle, LockSimple } from "@phosphor-icons/react";
import { Wordmark } from "./brand";
import { SearchBox } from "./search-box";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { legalIndexQuery } from "@/lib/content.functions";

const NAV = [
  { to: "/destinations", label: "Reiseziele" },
  { to: "/how-it-works", label: "So funktioniert's" },
  { to: "/faq", label: "FAQ" },
  { to: "/help", label: "Hilfe" },
] as const;

export function Header() {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 320);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setMenu(false);
    setMobileSearch(false);
  }, [path]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
  }, [menu]);
  // "/" focuses the header search on desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
        const input = document.querySelector<HTMLInputElement>("[data-header-search] input, [data-hero-search] input");
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showHeaderSearch = path !== "/" || scrolled;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="container-page flex h-14 items-center gap-3 lg:h-16 xl:gap-6">
        <Wordmark />
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="rounded-md px-3 py-2 text-[15px] text-ink-muted hover:text-ink" activeProps={{ className: "text-ink font-medium" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden min-w-0 flex-1 lg:block" data-header-search>
          {showHeaderSearch && <SearchBox size="sm" />}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
          <Link
            to={user ? "/account" : "/login"}
            className="hidden h-10 items-center gap-2 rounded-md px-3 text-[15px] font-medium text-ink hover:bg-muted lg:inline-flex"
          >
            <UserCircle size={20} aria-hidden />
            {user ? "Konto" : "Anmelden"}
          </Link>
          <button aria-label="Suche öffnen" onClick={() => setMobileSearch((v) => !v)} className="flex size-12 items-center justify-center rounded-md text-ink lg:hidden">
            <MagnifyingGlass size={22} />
          </button>
          <button aria-label="Menü öffnen" aria-expanded={menu} onClick={() => setMenu(true)} className="flex size-12 items-center justify-center rounded-md text-ink lg:hidden">
            <List size={24} />
          </button>
        </div>
      </div>
      {mobileSearch && (
        <div className="container-page py-3 lg:hidden">
          <SearchBox size="sm" autoFocus />
        </div>
      )}

      {menu && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper animate-in fade-in duration-150 lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <div className="container-page flex h-14 shrink-0 items-center justify-between border-b border-line">
            <Wordmark />
            <button aria-label="Menü schließen" onClick={() => setMenu(false)} className="flex size-12 items-center justify-center rounded-md text-ink">
              <X size={24} />
            </button>
          </div>
          <nav aria-label="Mobile Navigation" className="container-page flex flex-col py-4">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="border-b border-line py-4 font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
                {n.label}
              </Link>
            ))}
            <Link to={user ? "/account" : "/login"} className="py-4 font-display text-2xl font-semibold tracking-[-0.02em] text-primary">
              {user ? "Mein Konto" : "Anmelden"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const { user } = useAuth();
  return (
    <footer className="mt-12 border-t border-line sm:mt-24">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-5">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm text-ink-muted">eSIM für deine Reise. Online, sobald du landest.</p>
        </div>
        <FooterCol title="Reiseziele" links={[{ to: "/destinations", label: "Alle Reiseziele" }, { to: "/regions/europe", label: "Europa" }, { to: "/regions/asia", label: "Asien" }, { to: "/regions/global", label: "Weltweit" }]} />
        <FooterCol title="Service" links={[{ to: "/how-it-works", label: "So funktioniert's" }, { to: "/faq", label: "FAQ" }, { to: "/help", label: "Hilfe & Kontakt" }]} />
        <LegalLinks />
        <FooterCol title="Konto" links={[{ to: user ? "/account" : "/login", label: user ? "Mein Konto" : "Anmelden" }, { to: "/blog", label: "Blog" }]} />
      </div>
      <div className="container-page flex flex-wrap items-center gap-x-2 border-t border-line py-6 text-xs text-ink-muted">
        <span>© {new Date().getFullYear()} GlobeSIM · Alle Preise inkl. MwSt.</span>
        <Link to="/admin" aria-label="Admin-Login" title="Admin-Login" className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <LockSimple size={16} aria-hidden />
        </Link>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.to}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link to={l.to as any} className="text-sm text-ink-muted hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2">
        Zum Inhalt springen
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export async function signOut() {
  await supabase.auth.signOut();
}

function LegalLinks() {
  const { data } = useSuspenseQuery(legalIndexQuery());
  if (!data?.length) return null;
  return <FooterCol title="Rechtliches" links={data.map((p) => ({ to: `/legal/${p.slug}`, label: p.title }))} />;
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { List, X, MagnifyingGlass, UserCircle, LockSimple, SignOut } from "@phosphor-icons/react";
import { Wordmark } from "./brand";
import { SearchBox } from "./search-box";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { legalIndexQuery } from "@/lib/content.functions";
import { ShoppingCart } from "@phosphor-icons/react";
import { useCart } from "@/lib/cart";

function CartLink() {
  const items = useCart();
  return (
    <Link to="/cart" aria-label={`Warenkorb (${items.length})`} className="relative flex size-12 items-center justify-center rounded-md text-ink transition-[background-color,color,transform] duration-(--dur-hover) ease-ui-out hover:bg-muted active:scale-[0.96] lg:size-10">
      <ShoppingCart size={22} aria-hidden />
      {items.length > 0 && (
        <span className="tabular absolute right-1 top-1 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-[18px] text-primary-foreground ring-2 ring-background">{items.length}</span>
      )}
    </Link>
  );
}

const NAV = [
  { to: "/destinations", label: "Reiseziele" },
  { to: "/how-it-works", label: "So funktioniert's" },
  { to: "/ratgeber", label: "Ratgeber" },
  { to: "/faq", label: "FAQ" },
  { to: "/help", label: "Hilfe" },
] as const;

/** Keeps an element mounted for `ms` after `open` turned false, so an exit animation can play. */
function usePresence(open: boolean, ms = 200) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return open || mounted;
}

// The header remounts on every route change, so the last indicator position lives at module level.
// That is what lets the underline slide from the old to the new link instead of just appearing.
type Indicator = { x: number; w: number; on: boolean };
let lastIndicator: Indicator | null = null;

function MainNav({ path }: { path: string }) {
  const navRef = useRef<HTMLElement>(null);
  const [ind, setInd] = useState<Indicator | null>(lastIndicator);

  const measure = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const link = nav.querySelector<HTMLElement>('a[aria-current="page"]');
    let next: Indicator | null;
    if (!link) {
      next = lastIndicator ? { ...lastIndicator, on: false } : null;
    } else {
      const nr = nav.getBoundingClientRect();
      const lr = link.getBoundingClientRect();
      const cs = getComputedStyle(link);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      next = { x: Math.round((lr.left - nr.left + pl) * 10) / 10, w: Math.round((lr.width - pl - pr) * 10) / 10, on: true };
    }
    lastIndicator = next;
    setInd((prev) => (prev && next && prev.x === next.x && prev.w === next.w && prev.on === next.on ? prev : next));
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [path, measure]);
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <nav ref={navRef} aria-label="Hauptnavigation" className="relative hidden shrink-0 items-center gap-0 lg:flex xl:gap-1">
      {NAV.map((n) => (
        <Link
          key={n.to}
          to={n.to}
          className="shrink-0 rounded-md px-2 py-2 text-[15px] text-ink-muted transition-colors duration-(--dur-hover) ease-ui-out hover:text-ink aria-[current=page]:text-ink xl:px-3"
        >
          {n.label}
        </Link>
      ))}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0.5 left-0 h-0.5 rounded-full bg-primary transition-[transform,width,opacity] duration-(--dur-sheet) ease-ui-drawer motion-reduce:transition-none"
        style={{ width: ind?.w ?? 0, transform: `translateX(${ind?.x ?? 0}px)`, opacity: ind?.on ? 1 : 0 }}
      />
    </nav>
  );
}

export function Header() {
  const [menu, setMenu] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  // Open animations stay off for the very first render (SSR markup and hydration must match).
  const [ready, setReady] = useState(false);
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const headerRef = useRef<HTMLElement>(null);
  const topSentinel = useRef<HTMLDivElement>(null);
  const heroSentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setReady(true), []);

  // Scroll state without a scroll listener: two 1px sentinels at the top of the document.
  // `data-scrolled` is written straight to the header (no React render per scroll);
  // only the 320px "past the hero" flag is React state and flips at most once per crossing.
  useEffect(() => {
    const header = headerRef.current;
    const top = topSentinel.current;
    const hero = heroSentinel.current;
    if (!header || !top || !hero || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const gone = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === top) header.dataset["scrolled"] = gone ? "true" : "false";
        else setPastHero(gone);
      }
    });
    io.observe(top);
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setMenu(false);
    setMobileSearch(false);
  }, [path]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
  }, [menu]);
  // "/" focuses the header search on desktop (skips a search that is hidden or fading out)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
        const input = Array.from(document.querySelectorAll<HTMLInputElement>("[data-header-search] input, [data-hero-search] input")).find((el) => !el.closest("[inert]"));
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // Escape closes the mobile search row
  useEffect(() => {
    if (!mobileSearch) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSearch(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSearch]);

  const showHeaderSearch = path !== "/" || pastHero;
  const searchRendered = usePresence(showHeaderSearch);
  const mobileSearchRendered = usePresence(mobileSearch);
  const menuRendered = usePresence(menu);

  return (
    <>
      <div ref={topSentinel} aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px" />
      <div ref={heroSentinel} aria-hidden className="pointer-events-none absolute inset-x-0 top-[320px] h-px" />
      <header ref={headerRef} data-scrolled="false" className="group/header sticky top-0 z-30 border-b border-transparent transition-colors duration-(--dur-pop) ease-ui-out data-[scrolled=true]:border-line">
        {/* Background layers cross-fade by opacity only. The blur sits on a child, never on the header itself,
            because a backdrop-filter ancestor would become the containing block of the fixed mobile menu. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-paper transition-opacity duration-(--dur-pop) ease-ui-out group-data-[scrolled=true]/header:opacity-0" />
          <div className="absolute inset-0 bg-(--header-bg-scrolled) opacity-0 backdrop-blur-(--header-blur) transition-opacity duration-(--dur-pop) ease-ui-out group-data-[scrolled=true]/header:opacity-100" />
        </div>
        <div className="container-page flex h-14 items-center gap-3 lg:h-16 xl:gap-6">
          <Wordmark />
          <MainNav path={path} />
          <div className="ml-auto hidden min-w-0 flex-1 lg:block" data-header-search>
            {searchRendered && (
              <div
                data-state={showHeaderSearch ? "open" : "closed"}
                inert={!showHeaderSearch}
                className={
                  "ease-ui-out data-[state=closed]:pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:fill-mode-forwards data-[state=closed]:duration-(--dur-press)" +
                  (ready ? " data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-(--dur-hover)" : "")
                }
              >
                <SearchBox size="sm" />
              </div>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1 lg:ml-0">
            <CartLink />
            <Link
              to={user ? "/account" : "/login"}
              className="hidden h-10 items-center gap-2 rounded-md px-3 text-[15px] font-medium text-ink transition-[background-color,color,transform] duration-(--dur-hover) ease-ui-out hover:bg-muted active:scale-[0.96] lg:inline-flex"
            >
              <UserCircle size={20} aria-hidden />
              {user ? "Konto" : "Anmelden"}
            </Link>
            {user && <SignOutButton className="hidden h-10 items-center gap-2 rounded-md px-3 text-[15px] font-medium text-ink-muted transition-[background-color,color,transform] duration-(--dur-hover) ease-ui-out hover:bg-muted hover:text-ink active:scale-[0.96] lg:inline-flex" />}
            <button aria-label="Suche öffnen" aria-expanded={mobileSearch} onClick={() => setMobileSearch((v) => !v)} className="flex size-12 items-center justify-center rounded-md text-ink transition-[background-color,transform] duration-(--dur-press) ease-ui-out active:scale-[0.94] active:bg-muted lg:hidden">
              <MagnifyingGlass size={22} />
            </button>
            <button aria-label="Menü öffnen" aria-expanded={menu} onClick={() => setMenu(true)} className="flex size-12 items-center justify-center rounded-md text-ink transition-[background-color,transform] duration-(--dur-press) ease-ui-out active:scale-[0.94] active:bg-muted lg:hidden">
              <List size={24} />
            </button>
          </div>
        </div>
        {/* Overlays the page instead of pushing it down, so opening the search never shifts content. */}
        {mobileSearchRendered && (
          <div
            data-state={mobileSearch ? "open" : "closed"}
            inert={!mobileSearch}
            className={
              "absolute inset-x-0 top-full border-b border-line bg-paper ease-ui-out data-[state=closed]:pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:fill-mode-forwards data-[state=closed]:duration-(--dur-press) lg:hidden" +
              (ready ? " data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-(--dur-pop)" : "")
            }
          >
            <div className="container-page py-3">
              <SearchBox size="sm" autoFocus />
            </div>
          </div>
        )}

        {menuRendered && (
          <div
            data-state={menu ? "open" : "closed"}
            inert={!menu}
            className="group/menu fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper ease-ui-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=open]:duration-(--dur-pop) data-[state=closed]:pointer-events-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=closed]:fill-mode-forwards data-[state=closed]:duration-(--dur-press) lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menü"
          >
            <div className="container-page flex h-14 shrink-0 items-center justify-between border-b border-line">
              <Wordmark />
              <button aria-label="Menü schließen" onClick={() => setMenu(false)} className="flex size-12 items-center justify-center rounded-md text-ink transition-[background-color,transform] duration-(--dur-press) ease-ui-out active:scale-[0.94] active:bg-muted">
                <X size={24} />
              </button>
            </div>
            <nav aria-label="Mobile Navigation" className="container-page flex flex-col py-4">
              {NAV.map((n, i) => (
                <Link
                  key={n.to}
                  to={n.to}
                  style={{ animationDelay: `${40 + i * 30}ms` }}
                  className="border-b border-line py-4 font-display text-2xl font-semibold tracking-[-0.02em] text-ink transition-colors duration-(--dur-hover) ease-ui-out fill-mode-backwards group-data-[state=open]/menu:animate-in group-data-[state=open]/menu:fade-in-0 group-data-[state=open]/menu:slide-in-from-bottom-2 group-data-[state=open]/menu:duration-(--dur-pop) aria-[current=page]:border-primary aria-[current=page]:text-primary active:text-primary"
                >
                  {n.label}
                </Link>
              ))}
              <Link to={user ? "/account" : "/login"} className="py-4 font-display text-2xl font-semibold tracking-[-0.02em] text-primary">
                {user ? "Mein Konto" : "Anmelden"}
              </Link>
              {user && (
                <SignOutButton className="flex items-center gap-2 py-4 text-left font-display text-2xl font-semibold tracking-[-0.02em] text-ink-muted" />
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}

export function Footer() {
  const { user } = useAuth();
  return (
    <footer className="mt-12 border-t border-line sm:mt-24">
      <div className="container-page grid grid-cols-2 gap-x-6 gap-y-10 py-10 sm:grid-cols-3 sm:py-14 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] lg:gap-x-10">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <Wordmark />
          <p className="mt-3 max-w-xs text-sm text-ink-muted">eSIM für deine Reise. Online, sobald du landest.</p>
        </div>
        <FooterCol title="Reiseziele" links={[{ to: "/destinations", label: "Alle Reiseziele" }, { to: "/regions/europe", label: "Europa" }, { to: "/regions/asia", label: "Asien" }, { to: "/regions/global", label: "Weltweit" }]} />
        <FooterCol title="Service" links={[{ to: "/how-it-works", label: "So funktioniert's" }, { to: "/faq", label: "FAQ" }, { to: "/help", label: "Hilfe & Kontakt" }]} />
        <LegalLinks />
        <FooterCol title="Konto" links={[{ to: user ? "/account" : "/login", label: user ? "Mein Konto" : "Anmelden" }, { to: "/ratgeber", label: "Ratgeber" }]} />
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} GlobeSIM · Alle Preise inkl. MwSt.</span>
          <div className="flex items-center gap-2">
            <a href="#" data-cc="c-settings" onClick={(e) => e.preventDefault()} className="inline-flex min-h-9 items-center rounded-md px-1 underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-(--dur-hover) ease-ui-out hover:text-ink hover:decoration-current">Cookie-Einstellungen</a>
            <Link to="/admin" aria-label="Admin-Login" title="Admin-Login" className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted transition-[background-color,color,transform] duration-(--dur-hover) ease-ui-out hover:bg-muted hover:text-primary active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <LockSimple size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-ink">{title}</div>
      <ul className="mt-3 space-y-0.5">
        {links.map((l) => (
          <li key={l.to}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link to={l.to as any} className="inline-flex min-h-8 items-center text-sm text-ink-muted underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-(--dur-hover) ease-ui-out hover:text-ink hover:decoration-current">
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

function SignOutButton({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
        navigate({ to: "/", replace: true });
      }}
      className={className}
    >
      <SignOut size={20} aria-hidden />
      Abmelden
    </button>
  );
}

function LegalLinks() {
  const { data } = useSuspenseQuery(legalIndexQuery());
  if (!data?.length) return null;
  return <FooterCol title="Rechtliches" links={data.map((p) => ({ to: `/legal/${p.slug}`, label: p.title }))} />;
}

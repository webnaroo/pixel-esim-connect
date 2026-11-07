import { ArrowRight, Globe, Lightning, ShieldCheck, WifiHigh } from "@phosphor-icons/react";
import { SearchBox } from "@/components/search-box";
import { LinkButton } from "@/components/ui-kit";
import { NoThrottleClaim } from "@/components/unlimited-claim";
import { stagger } from "./section";
import airportBanner from "@/assets/home-airport.jpg";
import mobileAirportBanner from "@/assets/home-airport-mobile.jpg.asset.json";

const TRUST = [
  { Icon: Lightning, title: <>Sofort per <span className="whitespace-nowrap">E-Mail</span></>, detail: "Digital statt per Post" },
  { Icon: WifiHigh, title: "Lokale Tarife", detail: "Für dein Reiseziel" },
  { Icon: ShieldCheck, title: "Sicher bezahlen", detail: "SSL-verschlüsselt" },
] as const;

/**
 * Hero. Mobile: photo band on top, copy below. Desktop: the photo is the full-bleed background and
 * the copy sits on its built-in paper-coloured fade. The headline, lead and search render at once
 * (no entrance animation on the LCP elements); only the secondary rows fade up.
 */
export function Hero() {
  return (
    <section className="border-b border-line" aria-labelledby="home-title">
      {/* lg:bg matches the photo's own left edge (#F5F1E8), so the capped photo on very wide screens has no visible seam. */}
      <div className="relative isolate lg:bg-[#F5F1E8]">
        <picture className="block lg:absolute lg:inset-y-0 lg:right-0 lg:-z-10 lg:w-full lg:max-w-[1600px]">
          <source media="(max-width: 1023px)" srcSet={mobileAirportBanner.url} />
          <img
            src={airportBanner}
            alt="Reisende am Flughafen mit Smartphone und GlobeSIM Reise-eSIM"
            width={1920}
            height={960}
            fetchPriority="high"
            className="h-[132px] w-full object-cover object-[center_15%] min-[480px]:h-[200px] sm:h-[280px] lg:h-full lg:object-[center_20%]"
          />
        </picture>
        <div className="container-page relative">
          <div className="mx-auto max-w-[540px] pb-6 pt-6 sm:pt-8 lg:mx-0 lg:max-w-[460px] lg:py-16 xl:max-w-[480px]">
            <h1 id="home-title" className="text-balance text-[34px] leading-[1.06] tracking-[-0.03em] lg:text-[56px] lg:leading-[1.02]">
              <span className="mb-3 block text-sm font-semibold leading-5 tracking-normal text-primary lg:text-base">GlobeSIM Reise-eSIM</span>
              Online, sobald du landest.
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-muted lg:mt-5 lg:text-lg">
              eSIM kaufen, in Minuten installieren, ohne Roaming-Überraschung.
              <span className="hidden sm:inline"> Bleibe weltweit verbunden – einfach und schnell.</span>
            </p>

            <div className="mt-6 lg:mt-8" data-hero-search>
              <SearchBox />
            </div>

            <div className="hero-in mt-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2" style={stagger("--hero-i", 1)}>
              <LinkButton to="/destinations" size="lg" className="w-full sm:w-auto">
                Reiseziele ansehen
                <ArrowRight size={18} weight="bold" aria-hidden />
              </LinkButton>
              <LinkButton to="/how-it-works" variant="ghost" className="w-full sm:w-auto">So funktioniert's</LinkButton>
            </div>
          </div>
        </div>
      </div>

      {/* Trust bar: always directly under the photo, so it never collides with the artwork. */}
      <div className="hero-in border-t border-line bg-surface/60" style={stagger("--hero-i", 2)}>
        <ul className="container-page grid grid-cols-1 gap-x-3 gap-y-4 py-5 min-[380px]:grid-cols-3 lg:grid-cols-4 lg:gap-x-8" aria-label="Deine Vorteile">
          {TRUST.map(({ Icon, title, detail }) => (
            <li key={detail} className="flex min-w-0 items-center gap-3 min-[380px]:flex-col min-[380px]:items-start min-[380px]:gap-2 lg:flex-row lg:items-center lg:gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <Icon size={20} weight="duotone" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5 text-ink">{title}</p>
                <p className="text-xs leading-4 text-ink-muted">{detail}</p>
              </div>
            </li>
          ))}
          <li className="flex min-w-0 items-start gap-3 border-t border-line pt-4 min-[380px]:col-span-3 lg:col-span-1 lg:items-center lg:border-t-0 lg:pt-0">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <Globe size={20} weight="duotone" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-5 text-ink">Weltweit verbunden</p>
              <p className="text-xs leading-4 text-ink-muted">
                Deine SIM bleibt aktiv · Preise inkl. MwSt.
                <NoThrottleClaim className="before:content-['_·_']" />
              </p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  );
}

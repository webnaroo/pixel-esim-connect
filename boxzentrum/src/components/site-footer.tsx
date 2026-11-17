import { Link } from "@tanstack/react-router";
import { site } from "@/content/site";
import { dayNames, dayRanges } from "@/content/schedule";
import { mainNav } from "@/lib/nav";
import { ArrowUpRight, Facebook, Instagram, Mail, Phone, Pin } from "./icons";
import { Wordmark } from "./site-header";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-iron bg-coal pb-28 pt-20 md:pb-10 md:pt-28">
      <div className="shell">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Wordmark />
            <p className="t-statement mt-8 max-w-[14ch] text-bone">Tonberg 15. Alter Güterbahnhof. Seit {site.founded}.</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/probetraining" className="btn btn-primary">
                Probetraining starten
              </Link>
              <a href={site.maps.directions} className="btn btn-ghost" target="_blank" rel="noopener noreferrer">
                Route planen
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3 lg:col-span-7 lg:pl-10">
            <div>
              <h2 className="t-meta">Kontakt</h2>
              <ul className="mt-4 space-y-3 text-[0.9375rem] text-fog">
                <li>
                  <a href={site.phone.href} className="inline-flex items-center gap-2.5 hover:text-bone">
                    <Phone size={16} />
                    <span className="tnum">{site.phone.display}</span>
                  </a>
                </li>
                <li>
                  <a href={site.email.href} className="inline-flex items-center gap-2.5 break-all hover:text-bone">
                    <Mail size={16} />
                    {site.email.display}
                  </a>
                </li>
                <li className="flex gap-2.5">
                  <Pin size={16} className="mt-1 flex-none" />
                  <span>
                    {site.address.street}
                    <br />
                    {site.address.zip} {site.address.city}
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="t-meta">Trainingszeiten</h2>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-[0.9375rem]">
                {dayRanges.map((r) => (
                  <div key={r.day} className="contents">
                    <dt className="text-ash">{dayNames[r.day].short}</dt>
                    <dd className="tnum text-fog">
                      {r.start}–{r.end}
                    </dd>
                  </div>
                ))}
              </dl>
              <Link to="/trainingsplan" className="link mt-4 inline-block text-[0.9375rem] text-bone">
                Ganzer Wochenplan
              </Link>
            </div>
            <div>
              <h2 className="t-meta">Seiten</h2>
              <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-fog">
                {mainNav.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="hover:text-bone">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex gap-2">
                <a
                  href={site.social.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-11 place-items-center rounded-full text-fog ring-1 ring-iron transition-colors hover:text-bone hover:ring-steel"
                  aria-label="BoxZentrum Kiel auf Instagram"
                >
                  <Instagram size={18} />
                </a>
                <a
                  href={site.social.facebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-11 place-items-center rounded-full text-fog ring-1 ring-iron transition-colors hover:text-bone hover:ring-steel"
                  aria-label="BoxZentrum Kiel auf Facebook"
                >
                  <Facebook size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <p
          aria-hidden
          className="footer-mark t-display pointer-events-none mt-20 select-none whitespace-nowrap text-center text-[16.5vw] leading-[0.78] text-anthracite md:mt-28"
        />

        <div className="mt-8 flex flex-col gap-4 border-t border-iron pt-6 text-[0.8125rem] text-ash sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.name}</p>
          <ul className="flex gap-6">
            <li>
              <Link to="/impressum" className="hover:text-bone">
                Impressum
              </Link>
            </li>
            <li>
              <Link to="/datenschutz" className="hover:text-bone">
                Datenschutz
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

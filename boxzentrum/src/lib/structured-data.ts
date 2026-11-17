import { SITE_URL } from "@/content/site-url";
import { site } from "@/content/site";
import { dayRanges } from "@/content/schedule";

const schemaDays = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Lokales Unternehmen (Boxhalle) für Suchmaschinen – nur gesicherte Angaben. */
export const localBusiness = () => ({
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  "@id": `${SITE_URL}/#halle`,
  name: site.name,
  description:
    "Boxen und Fit Boxen in der Backsteinhalle im alten Güterbahnhof Kiel. Training für Kinder ab 6, Jugendliche und Erwachsene – seit 2015.",
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/og/boxzentrum-kiel.jpg`,
  telephone: site.phone.e164,
  email: site.email.display,
  foundingDate: String(site.founded),
  address: {
    "@type": "PostalAddress",
    streetAddress: site.address.street,
    postalCode: site.address.zip,
    addressLocality: site.address.city,
    addressCountry: site.address.country,
  },
  geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng },
  openingHoursSpecification: dayRanges.map((r) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: `https://schema.org/${schemaDays[r.day]}`,
    opens: r.start,
    closes: r.end,
  })),
  sameAs: [site.social.instagram.url, site.social.facebook.url],
});

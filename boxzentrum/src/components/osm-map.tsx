import { useState } from "react";
import { site } from "@/content/site";
import { Pin } from "./icons";

/** Karte erst nach Klick laden – vorher wird keine Verbindung zu OpenStreetMap aufgebaut. */
export function OsmMap() {
  const [load, setLoad] = useState(false);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-anthracite ring-1 ring-iron md:aspect-[16/10]">
      {load ? (
        <iframe
          title={`Karte: ${site.name}, ${site.address.street}`}
          src={site.maps.osmEmbed}
          className="absolute inset-0 h-full w-full grayscale invert-[.92] hue-rotate-180"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-start justify-end gap-4 bg-[radial-gradient(circle_at_60%_40%,#2c2926_0,#100e0d_70%)] p-6 md:p-8">
          <Pin size={28} className="text-red" />
          <p className="t-title text-bone">
            {site.address.street}
            <br />
            {site.address.zip} {site.address.city}
          </p>
          <p className="max-w-[44ch] text-[0.875rem] text-ash">
            Die Karte kommt von OpenStreetMap. Beim Laden wird deine IP-Adresse an deren Server übertragen. Vorher passiert nichts.
          </p>
          <button type="button" onClick={() => setLoad(true)} className="btn btn-light btn-sm">
            Karte laden
          </button>
        </div>
      )}
    </div>
  );
}

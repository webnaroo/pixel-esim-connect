import { useEffect, useRef, useState, type CSSProperties } from "react";
import { photoMeta, type PhotoId } from "@/content/photos.gen";
import { photoAlt } from "@/content/photos";

interface PhotoProps {
  id: PhotoId;
  alt?: string;
  /** Bild wird sofort und mit hoher Priorität geladen (Hero) */
  priority?: boolean;
  sizes?: string;
  focus?: string | undefined;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
}

const srcSet = (id: PhotoId, ext: "avif" | "webp") =>
  photoMeta[id].widths.map((w) => `/img/${id}-${w}.${ext} ${w}w`).join(", ");

/**
 * Responsives Foto (AVIF/WebP) mit unscharfem Platzhalter, der beim Laden weich überblendet.
 * Füllt seinen Container (object-fit: cover).
 */
export function Photo({ id, alt, priority, sizes = "100vw", focus, className = "", imgClassName = "", style }: PhotoProps) {
  const meta = photoMeta[id];
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(Boolean(priority));

  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  const fallbackWidth = meta.widths[1] ?? meta.widths[0];
  return (
    <div
      className={`relative overflow-hidden bg-anthracite ${className}`}
      style={{ backgroundImage: `url(${meta.lqip})`, backgroundSize: "cover", backgroundPosition: focus ?? "50% 50%", ...style }}
    >
      <picture>
        <source type="image/avif" srcSet={srcSet(id, "avif")} sizes={sizes} />
        <source type="image/webp" srcSet={srcSet(id, "webp")} sizes={sizes} />
        <img
          ref={ref}
          src={`/img/${id}-${fallbackWidth}.webp`}
          width={meta.width}
          height={meta.height}
          alt={alt ?? photoAlt[id]}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding={priority ? "sync" : "async"}
          onLoad={() => setLoaded(true)}
          data-loaded={loaded}
          className={`${priority ? "" : "photo-img"} absolute inset-0 h-full w-full object-cover ${imgClassName}`}
          style={{ objectPosition: focus ?? "50% 50%" }}
        />
      </picture>
    </div>
  );
}

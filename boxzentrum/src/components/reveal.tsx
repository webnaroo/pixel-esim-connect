import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

/** Setzt data-visible, sobald das Element ins Bild kommt (einmalig). */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      el.dataset["visible"] = "true";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset["visible"] = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

interface RevealProps {
  as?: ElementType;
  variant?: "fade" | "clip";
  index?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function Reveal({ as: Tag = "div", variant = "fade", index = 0, className = "", style, children }: RevealProps) {
  const ref = useReveal<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={`${variant === "clip" ? "reveal-clip" : "reveal"} ${className}`}
      style={{ "--i": index, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

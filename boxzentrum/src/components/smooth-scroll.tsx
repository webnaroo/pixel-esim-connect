import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import Lenis from "lenis";

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

/**
 * Weiches Scrollen mit Mausrad/Trackpad (Lenis). Auf Touch-Geräten bleibt das
 * native Scrollen, bei „Bewegung reduzieren“ wird nichts geglättet.
 */
export function SmoothScroll() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    if (reduce.matches || !fine.matches) return;
    lenis = new Lenis({ autoRaf: true, lerp: 0.12, wheelMultiplier: 0.95, anchors: { offset: -88 } });
    return () => {
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  useEffect(() => {
    if (!window.location.hash) lenis?.scrollTo(0, { immediate: true, force: true });
  }, [pathname]);

  return null;
}

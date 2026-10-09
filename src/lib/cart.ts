import { useSyncExternalStore } from "react";

export type CartItem = { planId: string; destination: string; label: string; price: number; currency: string };

const KEY = "globesim-cart";
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;
const EMPTY: CartItem[] = [];

function read(): CartItem[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { cache = []; }
  return cache!;
}
function write(items: CartItem[]) {
  cache = items;
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export const cart = {
  add(item: CartItem) { if (!read().some((i) => i.planId === item.planId)) write([...read(), item]); },
  remove(planId: string) { write(read().filter((i) => i.planId !== planId)); },
  clear() { write([]); },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    read,
    () => EMPTY,
  );
}

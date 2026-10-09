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
  updatePrice(planId: string, price: number, currency: string) { const items = read(); if (items.some((i) => i.planId === planId && (i.price !== price || i.currency !== currency))) write(items.map((i) => i.planId === planId ? { ...i, price, currency } : i)); },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    read,
    () => EMPTY,
  );
}

// Discount code entered in the cart; checked again at checkout (server applies it to the Stripe amount).
export type CartDiscount = { code: string; type: "percent" | "fixed"; value: number };
const CODE_KEY = "globesim-cart-code";
const codeListeners = new Set<() => void>();
let codeCache: CartDiscount | null | undefined;
function readCode(): CartDiscount | null {
  if (typeof window === "undefined") return null;
  if (codeCache !== undefined) return codeCache;
  try { codeCache = JSON.parse(localStorage.getItem(CODE_KEY) ?? "null"); } catch { codeCache = null; }
  return codeCache ?? null;
}
export const cartDiscount = {
  get: readCode,
  set(d: CartDiscount | null) {
    codeCache = d;
    if (d) localStorage.setItem(CODE_KEY, JSON.stringify(d)); else localStorage.removeItem(CODE_KEY);
    codeListeners.forEach((l) => l());
  },
};
export function useCartDiscount(): CartDiscount | null {
  return useSyncExternalStore((l) => { codeListeners.add(l); return () => codeListeners.delete(l); }, readCode, () => null);
}

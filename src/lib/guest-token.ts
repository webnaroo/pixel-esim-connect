// Signed, expiring access token for guest order/installation pages. Pure (secret passed in).
const enc = new TextEncoder();
export const GUEST_TOKEN_TTL_SECONDS = 30 * 24 * 3600;

async function mac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signGuestToken(orderId: string, secret: string, nowSec = Math.floor(Date.now() / 1000), ttl = GUEST_TOKEN_TTL_SECONDS): Promise<string> {
  const exp = nowSec + ttl;
  return `${exp}.${await mac(secret, `${orderId}.${exp}`)}`;
}

export async function verifyGuestToken(token: string, orderId: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isInteger(exp) || exp < nowSec) return false;
  const expected = await mac(secret, `${orderId}.${exp}`);
  if (expected.length !== sig.length) return false;
  let d = 0;
  for (let i = 0; i < sig.length; i++) d |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return d === 0;
}

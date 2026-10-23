// Anmeldung am Firebase-Cloud-Messaging-Dienst mit einem Dienstkonto (JWT, RS256, WebCrypto).
// Läuft im Cloudflare-Worker und in Node; keine externen Pakete.
export type ServiceAccount = { project_id: string; client_email: string; private_key: string; token_uri?: string | undefined };

export const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!j.project_id || !j.client_email || !j.private_key) return null;
    return { project_id: j.project_id, client_email: j.client_email, private_key: j.private_key, token_uri: j.token_uri };
  } catch {
    return null;
  }
}

function b64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export async function buildServiceJwt(sa: ServiceAccount, nowSec: number, ttlSec = 3600): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: FCM_SCOPE, aud: sa.token_uri ?? "https://oauth2.googleapis.com/token", iat: nowSec, exp: nowSec + ttlSec }));
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(sa.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64url(sig)}`;
}

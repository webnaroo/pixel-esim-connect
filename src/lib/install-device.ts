// Pure device rules for the eSIM install button (owner rules):
// iOS ≥ 17.4 → Apple button, Android → Android button, everything else (desktop, unknown, old iOS) → no button.
export type InstallDevice = "ios" | "ios_old" | "android" | "other";

export function detectInstallDevice(ua: string, maxTouchPoints = 0): InstallDevice {
  if (/Android/i.test(ua)) return "android";
  const ios = ua.match(/(?:iPhone|iPad|iPod).*?OS (\d+)[_.](\d+)/i);
  // iPadOS in desktop mode reports "Macintosh"; touch points + Safari version reveal it.
  const ipadDesktop = /Macintosh/i.test(ua) && maxTouchPoints > 1 ? ua.match(/Version\/(\d+)\.(\d+)/) : null;
  const m = ios ?? ipadDesktop;
  if (m) {
    const major = Number(m[1]), minor = Number(m[2]);
    return major > 17 || (major === 17 && minor >= 4) ? "ios" : "ios_old";
  }
  return "other";
}

/** Universal install links (Apple / Google) built from the LPA string; provider links win when present. */
export function installLinks(lpa: string, provided: { iosUrl?: string | null; androidUrl?: string | null } = {}) {
  const card = encodeURIComponent(lpa);
  return {
    ios: provided.iosUrl || `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${card}`,
    android: provided.androidUrl || `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${card}`,
  };
}

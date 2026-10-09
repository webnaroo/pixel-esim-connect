import { describe, it, expect } from "vitest";
import { detectInstallDevice } from "./install-device";

const iphone = (v: string) => `Mozilla/5.0 (iPhone; CPU iPhone OS ${v} like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1`;

describe("Installations-Button je Gerät", () => {
  it("iPhone mit iOS 17.4 bekommt den Apple-Button", () => expect(detectInstallDevice(iphone("17_4"))).toBe("ios"));
  it("iPhone mit iOS 18 bekommt den Apple-Button", () => expect(detectInstallDevice(iphone("18_0"))).toBe("ios"));
  it("iPhone mit iOS 17.3 bekommt keinen Apple-Button", () => expect(detectInstallDevice(iphone("17_3"))).toBe("ios_old"));
  it("Android bekommt den Android-Button", () => expect(detectInstallDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile")).toBe("android"));
  it("Desktop bekommt keinen Button", () => expect(detectInstallDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120")).toBe("other"));
  it("Mac ohne Touch bleibt Desktop", () => expect(detectInstallDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.4 Safari/605.1.15", 0)).toBe("other"));
  it("iPad im Desktop-Modus mit 17.4 bekommt den Apple-Button", () => expect(detectInstallDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.4 Safari/605.1.15", 5)).toBe("ios"));
});

// Simulated order for design review only. Shown exclusively when VITE_USE_FIXTURES=true, always labelled "Testdaten".
// The activation data below is deliberately invalid and cannot install anything.
import type { OrderView } from "../orders.functions";

export const FIXTURE_ORDER_ID = "testbestellung";

export const fixtureOrder: OrderView = {
  id: FIXTURE_ORDER_ID,
  status: "fulfilled",
  email: "gast@beispiel.invalid",
  amount: 0,
  currency: "EUR",
  createdAt: "2026-01-01T10:00:00.000Z",
  isTest: true,
  plan: { destination: "Testland", type: "data", data_mb: 5120, validity_days: 30 },
  esim: {
    status: "ready",
    iccid: "TESTDATEN-0000",
    lpa: "LPA:1$testdaten.invalid$NUR-TESTDATEN",
    smdp: "testdaten.invalid",
    activationCode: "NUR-TESTDATEN",
    directInstallUrl: null,
  },
};

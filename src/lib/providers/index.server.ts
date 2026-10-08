import { esimergeAdapter } from "./esimerge/adapter.server";
import { providerEnv } from "./esimerge/client.server";
import { esimergeConfig, missingConfig } from "./esimerge/config";
import { isSandboxKey, MAPPING_READY } from "./esimerge/mapping";
import type { ProviderAdapter } from "./types";

/** Returns the active provider adapter (today: eSIMerge). */
export function getProvider(): ProviderAdapter {
  return esimergeAdapter;
}

/** Setup checklist for the provider. Never returns secret values, only presence. */
export function providerSetupStatus() {
  const env = providerEnv();
  const missing = missingConfig();
  return {
    baseUrlSet: Boolean(env.baseUrl),
    apiKeySet: Boolean(env.token),
    webhookSecretSet: Boolean(env.webhookSecret),
    configMissing: missing,
    mappingReady: MAPPING_READY,
    sandbox: isSandboxKey(env.token),
    capabilities: esimergeConfig.capabilities,
    configured: Boolean(env.baseUrl && env.token) && missing.length === 0 && MAPPING_READY,
  };
}

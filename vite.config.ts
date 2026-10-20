// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

Object.assign(process.env, loadEnv(process.env['NODE_ENV'] ?? "development", process.cwd(), ""));
const projectDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Catalog sync (13k+ plans) needs more than the default 30 s CPU budget of the Workers Paid plan.
  nitro: { cloudflare: { wrangler: { limits: { cpu_ms: 300000 }, observability: { enabled: true, logs: { enabled: true, invocation_logs: true, persist: true } } } } },
  vite: {
    resolve: {
      alias: {
        // htmlparser2 (via linkedom) needs entities v7's "entities/decode"; the generic alias below pins v4.
        "entities/decode": path.resolve(projectDir, "node_modules/htmlparser2/node_modules/entities/dist/esm/decode.js"),
        "entities/lib/decode.js": path.resolve(projectDir, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(projectDir, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(projectDir, "node_modules/entities"),
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

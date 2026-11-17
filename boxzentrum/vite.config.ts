import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: { port: 5180 },
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Jede Seite wird beim Build als statisches HTML erzeugt (crawlt alle internen Links).
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
        autoSubfolderIndex: true,
        filter: (page) => !page.path.includes("#"),
      },
      pages: [{ path: "/" }],
    }),
    viteReact(),
  ],
});

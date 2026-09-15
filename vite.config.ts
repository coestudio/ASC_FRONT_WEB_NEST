// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    resolve: {
      tsconfigPaths: true,
    },
    server: { entry: "server" },
    serverFns: {
      disableCsrMiddlewareWarning: true, // Disable warning about CSR middleware in server functions (we don't use it)
    },
  },
  // Vendor chunks separados do chunk raiz da app — sem isso, react/axios/
  // react-bootstrap reembalam junto com o código próprio a cada build,
  // invalidando o cache do browser inteiro mesmo quando só a app mudou (e
  // não essas libs). Rotas continuam com o code-split automático do
  // TanStack Router (não mexido aqui).
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Rolldown (bundler do Vite 8) só aceita a forma função — a forma
          // objeto do Rollup clássico não é suportada.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules\/(react|react-dom)\//.test(id)) return "vendor-react";
            if (/node_modules\/@tanstack\/(react-router|react-query)/.test(id))
              return "vendor-router";
            if (/node_modules\/(react-bootstrap|bootstrap)\//.test(id)) return "vendor-bootstrap";
            if (/node_modules\/axios\//.test(id)) return "vendor-axios";
            return undefined;
          },
        },
      },
    },
  },
});

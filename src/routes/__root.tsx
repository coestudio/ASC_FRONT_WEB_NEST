import type { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import appCss from "../styles/globals/index.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { isAuthedFn, fetchMeFn } from "@/lib/auth-fns";
import { profileMeQueryOptions } from "@/lib/queries/profile";
import { readUiPrefs, UiPrefsProvider } from "@/lib/ui-prefs";
import { resolveTheme, THEME_NO_FLASH_SCRIPT } from "@/styles/globals/theme-store";
import { DevClearCacheButton } from "@/components/ui/dev-clear-cache-button";

const DESCRIPTION = "Sistema interno de gestão para laboratório, indústria, porto e transbordo.";
const PREVIEW_IMAGE = "/share.jpg";

function NotFoundComponent() {
  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center bg-body px-4">
      <div className="text-center" style={{ maxWidth: "28rem" }}>
        <h1 className="display-1 fw-bold text-body">404</h1>
        <h2 className="mt-4 fs-5 fw-semibold text-body">Page not found</h2>
        <p className="mt-2 small text-body-secondary">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-5">
          <Link to="/" className="btn btn-primary btn-sm">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error instanceof Error ? error : new Error(String(error)), {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center bg-body px-4">
      <div className="text-center" style={{ maxWidth: "28rem" }}>
        <h1 className="fs-5 fw-semibold text-body">This page didn't load</h1>
        <p className="mt-2 small text-body-secondary">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-5 d-flex flex-wrap justify-content-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn btn-primary btn-sm"
          >
            Try again
          </button>
          <a href="/" className="btn btn-outline-secondary btn-sm">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Guard barato (só checa o cookie no servidor) + preferências de UI
  // (tema/idioma, do cookie / Accept-Language) — tudo no contexto para as
  // rotas filhas, o shell e o provider.
  beforeLoad: async () => ({ authed: await isAuthedFn(), ...readUiPrefs() }),

  // Semeia o cache do React Query com a identidade do usuário. No SSR busca
  // server→Core com o cookie (fetchMeFn); o client re-hidrata sem refetch.
  loader: async ({ context }) => {
    if (!context.authed) return;
    const user = await fetchMeFn();
    if (user) context.queryClient.setQueryData(profileMeQueryOptions().queryKey, user);
  },

  head: ({ match }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "robots", content: "noindex" },
      { title: "ASC - Alex Stewart Core" },
      { name: "description", content: DESCRIPTION },
      { name: "author", content: "Alex Stewart Core" },
      { property: "og:title", content: "ASC - Alex Stewart Core" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:image", content: PREVIEW_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ASC - Alex Stewart Core" },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: PREVIEW_IMAGE },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        id: "favicon",
        rel: "icon",
        // Favicon por brand — asc.ico foi gerado a partir do logo (não havia
        // .ico dedicado, ver src/assets/ASC e specs/01-brand-theming §D5).
        href: `/favicons/${match.context.brand}.ico`,
        type: "image/x-icon",
      },
    ],
    // Acerta data-bs-theme antes do primeiro paint (cobre o caso `system`).
    scripts: [{ children: THEME_NO_FLASH_SCRIPT }],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { locale, themeMode, brand } = Route.useRouteContext();
  return (
    <html lang={locale} data-brand={brand} data-bs-theme={resolveTheme(themeMode)}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // O QueryClientProvider é provido por setupRouterSsrQueryIntegration
  // (wrapQueryClient) em src/router.tsx.
  const { locale, themeMode, brand } = Route.useRouteContext();
  return (
    <UiPrefsProvider initial={{ locale, themeMode, brand }}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <ToastContainer position="top-right" autoClose={4000} theme="colored" />
      <DevClearCacheButton />
    </UiPrefsProvider>
  );
}

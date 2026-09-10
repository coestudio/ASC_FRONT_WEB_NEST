import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { routeTree } from "./routeTree.gen";
import "bootstrap-icons/font/bootstrap-icons.css";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Desidrata o cache do React Query no SSR e re-hidrata no client
  // (identidade do usuário e demais queries). `wrapQueryClient` provê o
  // QueryClientProvider — por isso o __root não monta um manualmente.
  setupRouterSsrQueryIntegration({ router, queryClient, wrapQueryClient: true });

  return router;
};

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/layouts/AppShell";

// Layout da área autenticada (/_dashboard). Rota pathless: não adiciona
// segmento na URL, só envolve e protege as filhas (/dashboard, /laboratory...).
// O AppShell (sidebar + topbar) envolve todas as rotas do dashboard.
export const Route = createFileRoute("/_dashboard")({
  beforeLoad: ({ context, location }) => {
    // `context.authed` vem do beforeLoad do __root (checagem do cookie no
    // servidor). Roda server-side no SSR e client-side na navegação.
    if (!context.authed) {
      throw redirect({ to: "/auth/login", search: { redirect: location.href } });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

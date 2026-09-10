import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { profileMeQueryOptions } from "@/lib/queries/profile";
import { getUserAreas, type PermissionUser } from "@/lib/permissions";

// Layout das áreas internas (/_dashboard/_internal): laboratório, administrativo,
// operacional. Pathless. Filho de /_dashboard (que já garante a sessão).
export const Route = createFileRoute("/_dashboard/_internal")({
  beforeLoad: async ({ context }) => {
    // No client bate no cache re-hidratado; no SSR reusa o que o __root.loader
    // já buscou (sem round-trip extra).
    const user = await context.queryClient.ensureQueryData(profileMeQueryOptions());
    if (!getUserAreas(user as PermissionUser | null).includes("laboratorio")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: InternalLayout,
});

function InternalLayout() {
  return <Outlet />;
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { profileMeQueryOptions } from "@/lib/queries/profile";
import { getUserAreas, type PermissionUser } from "@/lib/permissions";

// Layout do grupo /admin (Acesso, Perfis). Não é pathless — "admin" é
// segmento real da URL, meio-irmão de /_dashboard/_internal (área própria,
// não sub-área de Internal). Guard: authed (já garantido pelo /_dashboard
// pai) + área "admin" (isAdmin dentro de Internal, ver src/lib/permissions.ts).
export const Route = createFileRoute("/_dashboard/admin")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(profileMeQueryOptions());
    if (!getUserAreas(user as PermissionUser | null).includes("admin")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { profileMeQueryOptions } from "@/lib/queries/profile";
import { fetchMeFn } from "@/lib/auth-fns";
import { getUserAreas, type PermissionUser } from "@/lib/permissions";

// Layout do grupo /admin (Acesso, Perfis). Não é pathless — "admin" é
// segmento real da URL, meio-irmão de /_dashboard/_internal (área própria,
// não sub-área de Internal). Guard: authed (já garantido pelo /_dashboard
// pai) + área "admin" (isAdmin dentro de Internal, ver src/lib/permissions.ts).
export const Route = createFileRoute("/_dashboard/admin")({
  beforeLoad: async ({ context }) => {
    // Todo `beforeLoad` da árvore roda antes de QUALQUER `loader` (inclusive
    // o do __root, que semeia profile.me via fetchMeFn) — nesta fase o
    // cache do React Query ainda está vazio no SSR. `ensureQueryData` aqui
    // cairia no fallback de fetch real (getApiProfileMe → mutator), que
    // recusa chamada autenticada no SSR (specs/auth-httponly-cookie-bff.md
    // §7). Por isso busca direto via fetchMeFn (mesma server fn do root) —
    // usa o cache só se já estiver quente (navegação client-side).
    const queryKey = profileMeQueryOptions().queryKey;
    const cached = context.queryClient.getQueryData(queryKey);
    const user = cached ?? (await fetchMeFn());
    if (user && !cached) context.queryClient.setQueryData(queryKey, user);

    if (!getUserAreas(user as PermissionUser | null).includes("admin")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}

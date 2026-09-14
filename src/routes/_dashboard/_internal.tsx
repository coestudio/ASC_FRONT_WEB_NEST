import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { profileMeQueryOptions } from "@/lib/queries/profile";
import { getUserAreas, type PermissionUser } from "@/lib/permissions";
import { fetchMeFn } from "@/lib/auth-fns";

// Layout das áreas internas (/_dashboard/_internal): laboratório, administrativo,
// operacional. Pathless. Filho de /_dashboard (que já garante a sessão).
export const Route = createFileRoute("/_dashboard/_internal")({
  beforeLoad: async ({ context }) => {
    // Todo `beforeLoad` da árvore roda antes de QUALQUER `loader` (inclusive
    // o do __root, que semeia profile.me via fetchMeFn) — nesta fase o cache
    // do React Query ainda está vazio no SSR. `ensureQueryData` aqui cairia
    // no fallback de fetch real (getApiProfileMe → mutator), que recusa
    // chamada autenticada no SSR (specs/auth-httponly-cookie-bff.md §7) —
    // mesmo bug documentado e já corrigido em admin/route.tsx (SPEC-03),
    // nunca replicado aqui. Busca direto via fetchMeFn (mesma server fn do
    // root) — usa o cache só se já estiver quente (navegação client-side).
    const queryKey = profileMeQueryOptions().queryKey;
    const cached = context.queryClient.getQueryData(queryKey);
    const user = cached ?? (await fetchMeFn());
    if (user && !cached) context.queryClient.setQueryData(queryKey, user);

    if (!getUserAreas(user as PermissionUser | null).includes("laboratorio")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: InternalLayout,
});

function InternalLayout() {
  return <Outlet />;
}

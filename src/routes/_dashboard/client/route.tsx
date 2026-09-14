import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { profileMeQueryOptions } from "@/lib/queries/profile";
import { fetchMeFn, getClientIdFn } from "@/lib/auth-fns";
import { getUserAreas, type PermissionUser } from "@/lib/permissions";

// Layout do grupo /client (Home, Colaboradores, Relatório Final,
// Acompanhamento) — "client" é área irmã de /_dashboard/_internal (usuário
// externo, `type !== Internal`), não sub-área dela. Guard: authed (já
// garantido pelo /_dashboard pai) + área "client".
export const Route = createFileRoute("/_dashboard/client")({
  beforeLoad: async ({ context }) => {
    // Todo `beforeLoad` da árvore roda antes de QUALQUER `loader` (inclusive
    // o do __root, que semeia profile.me via fetchMeFn) — nesta fase o cache
    // do React Query ainda está vazio no SSR. `ensureQueryData` aqui cairia
    // no fallback de fetch real (getApiProfileMe → mutator), que recusa
    // chamada autenticada no SSR. Por isso busca direto via fetchMeFn (mesma
    // server fn do root) — usa o cache só se já estiver quente (navegação
    // client-side). Mesmo padrão de src/routes/_dashboard/admin/route.tsx.
    const queryKey = profileMeQueryOptions().queryKey;
    const cached = context.queryClient.getQueryData(queryKey);
    const user = cached ?? (await fetchMeFn());
    if (user && !cached) context.queryClient.setQueryData(queryKey, user);

    if (!getUserAreas(user as PermissionUser | null).includes("client")) {
      throw redirect({ to: "/dashboard" });
    }

    // `clientId` do usuário externo logado — persistido na sessão no login
    // (D1, SPEC-09), disponível daqui pra frente no contexto do router pras
    // rotas filhas (ex.: /client/collaborators), sem chamada extra ao Core.
    const clientId = await getClientIdFn();
    return { clientId };
  },
  component: ClientLayout,
});

function ClientLayout() {
  return <Outlet />;
}

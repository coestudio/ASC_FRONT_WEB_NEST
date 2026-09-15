import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { profileMeQueryOptions } from "@/lib/queries/profile";
import { fetchMeFn } from "@/lib/auth-fns";
import { isInternalUser, type PermissionUser } from "@/lib/permissions";

// Layout das áreas internas (/_dashboard/_internal): laboratório, administrativo,
// operacional. Pathless. Filho de /_dashboard (que já garante a sessão).
//
// Guard "guarda-chuva": só confirma que o usuário é Internal (`isInternalUser`,
// src/lib/permissions.ts) — a checagem da área específica (administrativo/
// operacional/laboratorio) fica no `route.tsx` de cada sub-segmento
// (achado R1 da SPEC-22: antes este arquivo testava só
// `getUserAreas(user).includes("laboratorio")` pras três sub-áreas, o que
// funcionava por coincidência porque hoje elas sempre vêm juntas pra
// Internal — deixaria de proteger corretamente se o Core algum dia
// restringir uma área específica por papel).
export const Route = createFileRoute("/_dashboard/_internal")({
  beforeLoad: async ({ context }) => {
    // Todo `beforeLoad` da árvore roda antes de QUALQUER `loader` (inclusive
    // o do __root, que semeia profile.me via fetchMeFn) — nesta fase o cache
    // do React Query ainda está vazio no SSR. `ensureQueryData` aqui cairia
    // no fallback de fetch real (getApiProfileMe → mutator), que recusa
    // chamada autenticada no SSR. Por isso busca direto via fetchMeFn (mesma
    // server fn do root) — usa o cache só se já estiver quente (navegação
    // client-side).
    const queryKey = profileMeQueryOptions().queryKey;
    const cached = context.queryClient.getQueryData(queryKey);
    const user = cached ?? (await fetchMeFn());
    if (user && !cached) context.queryClient.setQueryData(queryKey, user);

    if (!isInternalUser(user as PermissionUser | null)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: InternalLayout,
});

function InternalLayout() {
  return <Outlet />;
}

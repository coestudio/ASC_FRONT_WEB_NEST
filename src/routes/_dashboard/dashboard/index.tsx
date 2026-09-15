import { createFileRoute, redirect } from "@tanstack/react-router";

import { fetchMeFn } from "@/lib/auth-fns";
import { AREA_HOME, getUserAreas, type PermissionUser } from "@/lib/permissions";
import { profileMeQueryOptions } from "@/lib/queries/profile";

// Home da área autenticada (SPEC-19). Não é mais uma página própria: espelha
// o `HomeRedirect` do legado (warren/Portal) e manda o usuário direto pra
// home da primeira área que ele tem permissão (getUserAreas(user)[0]).
// Envolvida pelo layout pathless /_dashboard, que já garante `authed`.
export const Route = createFileRoute("/_dashboard/dashboard/")({
  beforeLoad: async ({ context }) => {
    // Mesmo padrão dos guards irmãos (admin/route.tsx, client/route.tsx,
    // _internal.tsx): usa o cache se já estiver quente (navegação
    // client-side), senão busca via fetchMeFn (server fn, mesma usada no
    // seed do __root) — ensureQueryData cairia no fallback de fetch real
    // via mutator, que recusa chamada autenticada no SSR.
    const queryKey = profileMeQueryOptions().queryKey;
    const cached = context.queryClient.getQueryData(queryKey);
    const user = cached ?? (await fetchMeFn());
    if (user && !cached) context.queryClient.setQueryData(queryKey, user);

    const areas = getUserAreas(user as PermissionUser | null);
    const home = areas.length > 0 ? AREA_HOME[areas[0]] : "/not-found";
    throw redirect({ to: home });
  },
});

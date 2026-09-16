import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { profileMeQueryOptions } from "@/lib/queries/profile";
import { fetchMeFn } from "@/lib/auth-fns";
import { getUserAreas, type PermissionUser } from "@/lib/permissions";

// Layout do segmento /administrative (Home, Clientes, Operações, Cadastros).
// Filho de /_dashboard/_internal, que já garante "usuário Internal"
// (guard guarda-chuva) — aqui checa especificamente a área "administrativo"
// (achado R1 da SPEC-22: antes só _internal.tsx existia e testava
// "laboratorio" pras três sub-áreas juntas).
export const Route = createFileRoute("/_dashboard/_internal/administrative")({
  beforeLoad: async ({ context }) => {
    // Mesmo padrão dos guards irmãos (admin/route.tsx, client/route.tsx) —
    // busca direto via fetchMeFn (server fn do root) porque ensureQueryData
    // cairia no fallback de fetch real via mutator, que recusa chamada
    // autenticada no SSR.
    const queryKey = profileMeQueryOptions().queryKey;
    const cached = context.queryClient.getQueryData(queryKey);
    const user = cached ?? (await fetchMeFn());
    if (user && !cached) context.queryClient.setQueryData(queryKey, user);

    if (!getUserAreas(user as PermissionUser | null).includes("administrativo")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdministrativeLayout,
});

function AdministrativeLayout() {
  return <Outlet />;
}

import { getUserAreas, type AreaId, type PermissionUser } from "@/lib/permissions";

import { useUser } from "./useUser";

/**
 * Guard de UI: `true` se o usuário logado pode ver a área. Para esconder itens
 * dentro de uma página já permitida (sidebar, botão, coluna). Não é guard de
 * rota — isso é o `beforeLoad` de _dashboard/_internal.
 */
export function useCan(area: AreaId): boolean {
  const { user } = useUser();
  return getUserAreas(user as PermissionUser | null).includes(area);
}

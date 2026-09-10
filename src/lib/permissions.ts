/**
 * Permissões de área do AppShell — decide só o que aparece na UI (sidebar).
 * NÃO é proteção de rota; isso continua exclusivamente em src/proxy.ts.
 *
 * Regra (ver UserAdminDTO do Core): `type` 0 = Internal, 1 = External.
 * - Internal (type === 0): vê administrativo, operacional, laboratorio.
 *   Vê também "admin" se `isAdmin === true` — hoje esse é o único sinal de
 *   administrador disponível na sessão, então usamos ele como critério
 *   adicional (decisão registrada aqui por não haver um `roles`/claim mais
 *   específico exposto na sessão ainda).
 * - Não-Internal (type === 1 ou ausente): vê só "client".
 * - Sem usuário logado: nenhuma área.
 */
export type AreaId = "admin" | "administrativo" | "operacional" | "client" | "laboratorio";

export type PermissionUser = {
  isAdmin?: boolean;
  /** UserType do Core: 0 = Internal, 1 = External. */
  type?: number;
};

const INTERNAL_USER_TYPE = 0;

export function getUserAreas(user: PermissionUser | null | undefined): AreaId[] {
  if (!user) return [];

  if (user.type !== INTERNAL_USER_TYPE) {
    return ["client"];
  }

  const areas: AreaId[] = [];
  if (user.isAdmin) areas.push("admin");
  areas.push("administrativo", "operacional", "laboratorio");
  return areas;
}

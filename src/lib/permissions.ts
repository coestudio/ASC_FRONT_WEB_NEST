import { UserType } from "@/api/generated/model";

/**
 * Permissões de área do AppShell — decide só o que aparece na UI (sidebar).
 * NÃO é proteção de rota; isso continua exclusivamente em src/proxy.ts.
 *
 * Regra (ver UserType do Core, SPEC-15 — enum como string): `type` vem como
 * `"Internal"` ou `"External"`, não mais `int`.
 * - Internal (type === UserType.Internal): vê administrativo, operacional,
 *   laboratorio. Vê também "admin" se `isAdmin === true` — hoje esse é o
 *   único sinal de administrador disponível na sessão, então usamos ele
 *   como critério adicional (decisão registrada aqui por não haver um
 *   `roles`/claim mais específico exposto na sessão ainda).
 * - Não-Internal (type === "External" ou ausente): vê só "client".
 * - Sem usuário logado: nenhuma área.
 */
export type AreaId = "admin" | "administrativo" | "operacional" | "client" | "laboratorio";

export type PermissionUser = {
  isAdmin?: boolean;
  /** UserType do Core: "Internal" | "External" (string enum, SPEC-15). */
  type?: UserType;
};

export function getUserAreas(user: PermissionUser | null | undefined): AreaId[] {
  if (!user) return [];

  if (user.type !== UserType.Internal) {
    return ["client"];
  }

  const areas: AreaId[] = [];
  if (user.isAdmin) areas.push("admin");
  areas.push("administrativo", "operacional", "laboratorio");
  return areas;
}

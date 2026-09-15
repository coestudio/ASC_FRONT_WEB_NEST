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

/**
 * Home de cada área — usado por `/dashboard` (SPEC-19) pra redirecionar o
 * usuário logado pra `AREA_HOME[getUserAreas(user)[0]]`, espelhando o
 * `HomeRedirect`/`AREA_HOME` do legado (`warren/Portal`). Assim como
 * `getUserAreas`, é decisão de **navegação/UI**, não de segurança — a
 * proteção real de cada rota continua no `beforeLoad` de cada uma.
 */
export const AREA_HOME: Record<AreaId, string> = {
  admin: "/admin/access",
  administrativo: "/administrative",
  operacional: "/operational",
  client: "/client",
  laboratorio: "/laboratory",
};

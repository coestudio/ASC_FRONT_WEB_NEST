/**
 * Conteúdo estático de `admin/roles` (decisão D1 da SPEC-03: texto mantido
 * à mão, não deriva de `nav/*.ts` nem de uma chamada em runtime a
 * `GET /api/user/roles`).
 *
 * Nomes e valores vêm do snapshot estático real do Core
 * (`src/api/generated/static/getApiUserRoles.ts`, gerado por `just map` —
 * "dados só mudam em restart da API"), não inventados. A descrição de cada
 * perfil (o que ele vê/acessa no NewPortal) ainda não foi confirmada — texto
 * placeholder explícito até vir a confirmação real (ver R1 da SPEC-03: não
 * inventar o que uma role acessa).
 */
import { getApiUserRoles } from "@/api/generated/static/getApiUserRoles";

export type AdminRoleDescription = {
  /** Valor do enum `InternalRole` no Core (número). */
  role: number;
  /** Nome da role — mesmo texto do snapshot `getApiUserRoles` (pt). */
  name: string;
  /** O que essa role vê/acessa no NewPortal — PENDENTE de confirmação. */
  description: string;
};

const PENDING_DESCRIPTION =
  "Descrição do que este perfil acessa ainda não confirmada — ver specs/03-admin-access/spec.md.";

export const ADMIN_ROLES: AdminRoleDescription[] = getApiUserRoles.map((opt) => ({
  role: Number(opt.value),
  name: opt.name.pt ?? String(opt.value),
  description: PENDING_DESCRIPTION,
}));

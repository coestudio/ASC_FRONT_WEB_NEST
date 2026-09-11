/**
 * Conteúdo estático de `admin/roles` (decisão D1 da SPEC-03: texto mantido
 * à mão, não deriva de `nav/*.ts` nem de `GetApiUserRoles`).
 *
 * PENDENTE: preencher com o texto real portado de
 * `warren/Portal/.../Pages/Admin/Acesso/RolesPage.tsx` (repo legado, não
 * acessível nesta sessão) — ou com a descrição de roles fornecida
 * diretamente. Cada entrada precisa bater 1:1 com um valor do enum
 * `InternalRole` real do Core (ver `GET /api/user/roles`, risco R1 da
 * SPEC-03: não inventar role que não existe no enum). Array vazio de
 * propósito até essa informação chegar — a tela renderiza um estado vazio
 * honesto em vez de descrição inventada.
 */
export type AdminRoleDescription = {
  /** Valor do enum `InternalRole` no Core (número). */
  role: number;
  /** Nome da role — mesmo texto que `GET /api/user/roles` devolve pro valor. */
  name: string;
  /** O que essa role vê/acessa no NewPortal. */
  description: string;
};

export const ADMIN_ROLES: AdminRoleDescription[] = [];

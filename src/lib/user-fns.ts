import { createServerFn } from "@tanstack/react-start";

import { coreClient } from "@/lib/core-client";
import { readServerSession } from "@/lib/session.server";
import type { GetApiUserParams } from "@/api/generated/model/getApiUserParams";
import type { EnumOptionDTO, PagedDTOOfUserDTO } from "@/api/generated/model";

/**
 * Server functions do módulo de usuários usadas só para semear o cache do
 * React Query no SSR da rota `/admin/access` (server→Core com o cookie).
 * Mesmo motivo do `fetchMeFn` em auth-fns.ts — o mutator dos hooks gerados
 * roda só no browser (ver specs/auth-httponly-cookie-bff.md §7). Sem sessão
 * ou erro do Core, devolve `null` e o client refetcha normalmente.
 */

export const fetchUserListFn = createServerFn({ method: "GET" })
  .validator((data: GetApiUserParams) => data)
  .handler(async ({ data }): Promise<PagedDTOOfUserDTO | null> => {
    const session = await readServerSession();
    if (!session) return null;
    try {
      const res = await coreClient.get<PagedDTOOfUserDTO>("/api/user", {
        params: data,
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      return res.data;
    } catch {
      return null;
    }
  });

export const fetchUserRolesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<EnumOptionDTO[] | null> => {
    const session = await readServerSession();
    if (!session) return null;
    try {
      const res = await coreClient.get<EnumOptionDTO[]>("/api/user/roles", {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      return res.data;
    } catch {
      return null;
    }
  },
);

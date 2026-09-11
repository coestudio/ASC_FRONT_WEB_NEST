import { queryOptions } from "@tanstack/react-query";

import {
  getApiUser,
  getApiUserRoles,
  getGetApiUserQueryKey,
  getGetApiUserRolesQueryKey,
} from "@/api/generated/endpoints/user/user";
import type { GetApiUserParams } from "@/api/generated/model/getApiUserParams";

/**
 * Mesma queryKey dos hooks gerados (`useGetApiUser`/`useGetApiUserRoles`),
 * então o cache é compartilhado — inclusive o `invalidateQueries` que já
 * usa `getGetApiUserQueryKey()`.
 *
 * Seed: `admin/access.loader` popula via `fetchUserListFn`/`fetchUserRolesFn`
 * (server→Core com o cookie); o client re-hidrata sem refetch. Ver
 * profile.ts pro mesmo padrão.
 */
export function userListQueryOptions(params?: GetApiUserParams) {
  return queryOptions({
    queryKey: getGetApiUserQueryKey(params),
    queryFn: ({ signal }) => getApiUser(params, signal),
    staleTime: 60_000,
  });
}

/** Roles são enum estático do Core — muda raramente, staleTime alto. */
export function userRolesQueryOptions() {
  return queryOptions({
    queryKey: getGetApiUserRolesQueryKey(),
    queryFn: ({ signal }) => getApiUserRoles(signal),
    staleTime: 5 * 60_000,
  });
}

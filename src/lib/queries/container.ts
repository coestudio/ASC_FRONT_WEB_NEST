import { queryOptions } from "@tanstack/react-query";

import {
  getApiContainer,
  getGetApiContainerQueryKey,
} from "@/api/generated/endpoints/container/container";
import type { GetApiContainerParams } from "@/api/generated/model/getApiContainerParams";

/**
 * Mesma queryKey do hook gerado (`useGetApiContainer`) — cache compartilhado
 * com `getGetApiContainerQueryKey()` usado no `invalidateQueries` da tela
 * (SPEC-04). Sem seed via loader: `CrudListPage`/`useSsrSafeQuery` (SPEC-10)
 * já garantem que o `queryFn` nunca roda no SSR.
 */
export function containerListQueryOptions(params?: GetApiContainerParams) {
  return queryOptions({
    queryKey: getGetApiContainerQueryKey(params),
    queryFn: ({ signal }) => getApiContainer(params, signal),
    staleTime: 30_000,
  });
}

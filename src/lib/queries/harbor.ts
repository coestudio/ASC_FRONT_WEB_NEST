import { queryOptions } from "@tanstack/react-query";

import { getApiHarbor, getGetApiHarborQueryKey } from "@/api/generated/endpoints/harbor/harbor";
import type { GetApiHarborParams } from "@/api/generated/model/getApiHarborParams";

/**
 * Mesma queryKey do hook gerado (`useGetApiHarbor`) — cache compartilhado
 * com `getGetApiHarborQueryKey()` usado no `invalidateQueries` da tela
 * (SPEC-04). Sem seed via loader: `CrudListPage`/`useSsrSafeQuery` (SPEC-10)
 * já garantem que o `queryFn` nunca roda no SSR.
 */
export function harborListQueryOptions(params?: GetApiHarborParams) {
  return queryOptions({
    queryKey: getGetApiHarborQueryKey(params),
    queryFn: ({ signal }) => getApiHarbor(params, signal),
    staleTime: 30_000,
  });
}

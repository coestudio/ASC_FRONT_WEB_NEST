import { queryOptions } from "@tanstack/react-query";

import { getApiProduct, getGetApiProductQueryKey } from "@/api/generated/endpoints/product/product";
import type { GetApiProductParams } from "@/api/generated/model/getApiProductParams";

/**
 * Mesma queryKey do hook gerado (`useGetApiProduct`) — cache compartilhado
 * com `getGetApiProductQueryKey()` usado no `invalidateQueries` da tela
 * (SPEC-04). Sem seed via loader: `CrudListPage`/`useSsrSafeQuery` (SPEC-10)
 * já garantem que o `queryFn` nunca roda no SSR.
 */
export function productListQueryOptions(params?: GetApiProductParams) {
  return queryOptions({
    queryKey: getGetApiProductQueryKey(params),
    queryFn: ({ signal }) => getApiProduct(params, signal),
    staleTime: 30_000,
  });
}

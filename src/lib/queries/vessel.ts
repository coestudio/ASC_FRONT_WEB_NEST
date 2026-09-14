import { queryOptions } from "@tanstack/react-query";

import { getApiVessel, getGetApiVesselQueryKey } from "@/api/generated/endpoints/vessel/vessel";
import type { GetApiVesselParams } from "@/api/generated/model/getApiVesselParams";

/**
 * Mesma queryKey do hook gerado (`useGetApiVessel`) — cache compartilhado
 * com `getGetApiVesselQueryKey()` usado no `invalidateQueries` da tela
 * (SPEC-04). Sem seed via loader: `CrudListPage`/`useSsrSafeQuery` (SPEC-10)
 * já garantem que o `queryFn` nunca roda no SSR.
 */
export function vesselListQueryOptions(params?: GetApiVesselParams) {
  return queryOptions({
    queryKey: getGetApiVesselQueryKey(params),
    queryFn: ({ signal }) => getApiVessel(params, signal),
    staleTime: 30_000,
  });
}

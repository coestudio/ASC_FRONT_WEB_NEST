import { queryOptions } from "@tanstack/react-query";

import {
  getApiTerminal,
  getGetApiTerminalQueryKey,
} from "@/api/generated/endpoints/terminal/terminal";
import type { GetApiTerminalParams } from "@/api/generated/model/getApiTerminalParams";

/**
 * Mesma queryKey do hook gerado (`useGetApiTerminal`) — cache compartilhado
 * com `getGetApiTerminalQueryKey()` usado no `invalidateQueries` da tela
 * (SPEC-04). Sem seed via loader: `CrudListPage`/`useSsrSafeQuery` (SPEC-10)
 * já garantem que o `queryFn` nunca roda no SSR.
 */
export function terminalListQueryOptions(params?: GetApiTerminalParams) {
  return queryOptions({
    queryKey: getGetApiTerminalQueryKey(params),
    queryFn: ({ signal }) => getApiTerminal(params, signal),
    staleTime: 30_000,
  });
}

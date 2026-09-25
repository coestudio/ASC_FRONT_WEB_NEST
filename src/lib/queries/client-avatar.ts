import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalida tudo que mostra avatar de cliente (SPEC-101): listagem
 * (`/api/client`), detalhe (`/api/client/{id}`) e o próprio cliente do
 * externo (`/api/client/me`) — todas as queryKeys dos hooks gerados começam
 * pelo path do Core.
 */
export function invalidateClientQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const head = query.queryKey[0];
      return typeof head === "string" && head.startsWith("/api/client");
    },
  });
}

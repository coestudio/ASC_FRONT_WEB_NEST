import { queryOptions } from "@tanstack/react-query";

import { getApiProfileMe } from "@/api/generated/endpoints/profile/profile";

/**
 * Identidade do usuário logado. Mesma queryKey que o hook gerado
 * (`getGetApiProfileMeQueryKey`), então o cache é compartilhado.
 *
 * Seed: no SSR o `__root.loader` popula via `fetchMeFn` (server→Core com o
 * cookie); o client re-hidrata o cache (@tanstack/react-router-ssr-query).
 * `staleTime` alto → navegação client-side não refetcha.
 */
export function profileMeQueryOptions() {
  return queryOptions({
    queryKey: ["/api/profile/me"] as const,
    queryFn: ({ signal }) => getApiProfileMe(signal),
    staleTime: 5 * 60_000,
  });
}

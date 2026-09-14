import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";

/**
 * Wrapper de `useQuery` que nunca deixa o `queryFn` rodar durante o SSR —
 * evita o crash de `src/api/mutator.ts` ("chamada autenticada ao Core no
 * SSR"), que só aceita bater no `/api/core` a partir do browser (SPEC-10).
 *
 * Combina com (não substitui) o padrão de seed via `loader` + server fn
 * (ex.: `userListQueryOptions`/`fetchUserListFn`, mesmo desenho de
 * `profileMeQueryOptions`/`fetchMeFn`): se o cache já estiver quente
 * (seedado no loader), `useQuery` usa o valor cacheado sem refetch: o guard
 * abaixo só entra em ação quando não há seed (ex.: troca de página/busca
 * depois do primeiro load, ou uma rota que ainda não tem loader próprio).
 *
 * Uso: qualquer leitura client-side (hook Orval `useGetApiXxx` ou
 * `getGetApiXxxQueryOptions(...)`/`queryOptions(...)` chamado direto numa
 * rota/componente) deve passar por aqui em vez de `useQuery` puro.
 */
export function useSsrSafeQuery<TData, TError = unknown>(
  // `TQueryKey` fica solto (o queryKey concreto de cada módulo é uma tupla
  // literal, ex. `readonly ["/api/user", ...]`) — não vale a pena repetir
  // esse genérico em todo call-site só pra satisfazer o TS.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: UseQueryOptions<TData, TError, TData, any>,
): UseQueryResult<TData, TError> {
  const isClient = typeof window !== "undefined";
  return useQuery({ ...options, enabled: isClient && (options.enabled ?? true) });
}

import { useQuery } from "@tanstack/react-query";

import { profileMeQueryOptions } from "@/lib/queries/profile";

/**
 * Identidade do usuário logado (cache do React Query, re-hidratado do SSR).
 * `user` é `null` enquanto carrega ou se não há sessão.
 */
export function useUser() {
  const query = useQuery(profileMeQueryOptions());
  return { ...query, user: query.data ?? null };
}

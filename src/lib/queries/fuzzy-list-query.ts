import { useQueryClient, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";

import type { CrudPagedResult } from "@/components/crud/crud-list-page";
import { fuzzyFilter } from "@/lib/fuzzy-search";

const FETCH_BATCH = 100;

type FuzzyListQueryConfig<T, TPaged extends CrudPagedResult<T>> = {
  /** Opções da listagem paginada do Core, **sem** `Search` (usadas quando não há busca). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a queryKey varia por endpoint
  serverOptions: UseQueryOptions<TPaged, any, TPaged, any>;
  /** Chave base da lista (mesma que a tela invalida após criar/editar/excluir). */
  baseKey: QueryKey;
  /** Uma página da listagem do Core (com `Sort` já aplicado pela tela). */
  fetchPage: (offset: number, limit: number) => Promise<{ items: T[] }>;
  /** Sort atual — entra na chave do cache da lista completa. */
  sort: string | undefined;
  search: string;
  page: number;
  pageSize: number;
  /** Textos do item que a busca pode casar (nome, documento, e-mail...). */
  getTexts: (item: T) => Array<string | null | undefined>;
};

async function fetchAll<T>(
  fetchPage: (offset: number, limit: number) => Promise<{ items: T[] }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += FETCH_BATCH) {
    const { items } = await fetchPage(offset, FETCH_BATCH);
    all.push(...items);
    if (items.length < FETCH_BATCH) return all;
  }
}

/**
 * Busca tolerante (sem caixa/acento, aceita erro de digitação — ver
 * `fuzzy-search.ts`) pra listagens paginadas pelo Core. O `Search` do Core é
 * literal, então:
 * - **sem busca**: usa a paginação normal do servidor (`serverOptions`);
 * - **com busca**: baixa a lista completa (em lotes de 100, cacheada por 30 s
 *   e invalidada junto com `baseKey`), filtra por relevância e pagina aqui.
 */
export function useFuzzyListQuery<T, TPaged extends CrudPagedResult<T>>({
  serverOptions,
  baseKey,
  fetchPage,
  sort,
  search,
  page,
  pageSize,
  getTexts,
}: FuzzyListQueryConfig<T, TPaged>): UseQueryOptions<CrudPagedResult<T>> {
  const queryClient = useQueryClient();

  if (!search.trim()) return serverOptions as unknown as UseQueryOptions<CrudPagedResult<T>>;

  return {
    queryKey: [...baseKey, "fuzzy", { search, sort, page }],
    queryFn: async () => {
      const all = await queryClient.fetchQuery({
        queryKey: [...baseKey, "fuzzy-all", { sort }],
        queryFn: () => fetchAll(fetchPage),
        staleTime: 30_000,
      });
      const matches = fuzzyFilter(all, search, getTexts);
      const start = (page - 1) * pageSize;
      return { items: matches.slice(start, start + pageSize), total: matches.length };
    },
  };
}

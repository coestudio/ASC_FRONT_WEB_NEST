import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Badge } from "react-bootstrap";
import { LoadingState } from "@/components/ui/loading-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { getGetApiOperationIdLogQueryOptions } from "@/api/generated/endpoints/operation/operation";
import { getGetApiUserIdQueryOptions } from "@/api/generated/endpoints/user/user";
import { useLocale, useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Aba "Log" (auditoria real da Operação, SPEC-39 — fim do mock) — consome
 * `GET /operation/{id}/log` (Core `specs/28-operation-audit-log`,
 * `IMPLEMENTED`), retorna `OperationEventDTO` paginado. `Action`/
 * `EntityType` nunca tiveram rota `Aux`/lookup no Core (mesmo precedente do
 * `CargoUnitEventAction` antigo) — o rótulo legível vem de um mapa local em
 * i18n (`administrative-operations.log.actions.*`/`.entityTypes.*`), não de
 * snapshot gerado. `createdBy` traz o `Guid` do usuário — SPEC-57 resolve
 * pra um nome legível via `GET /api/user/{id}` (`useQueries`, deduplicado
 * por id único na página atual), com fallback pro Guid cru enquanto carrega
 * ou se a busca falhar (nunca quebra a lista por causa de um usuário).
 */
export function Log({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const isClient = typeof window !== "undefined";

  const query = useSsrSafeQuery(
    getGetApiOperationIdLogQueryOptions(operationId, {
      Offset: (page - 1) * PAGE_SIZE,
      Limit: PAGE_SIZE,
    }),
  );

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items]);
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Ids únicos de `createdBy` na página atual — uma chamada deduplicada por
  // usuário, mesmo que ele apareça em várias entradas do log (RF1/RF2).
  const uniqueUserIds = useMemo(
    () =>
      Array.from(
        new Set(items.map((entry) => entry.createdBy).filter((id): id is string => Boolean(id))),
      ),
    [items],
  );

  const userQueries = useQueries({
    queries: uniqueUserIds.map((id) => {
      const options = getGetApiUserIdQueryOptions(id);
      return { ...options, enabled: isClient };
    }),
  });

  // Mapa id -> nome legível (fullName > userName). Falha/carregamento
  // resolve pra `undefined`, e o render cai de volta pro Guid cru (RF3).
  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    uniqueUserIds.forEach((id, index) => {
      const result = userQueries[index];
      const user = result?.data;
      const name = user?.profile?.fullName || user?.userName;
      if (name) map.set(id, name);
    });
    return map;
  }, [uniqueUserIds, userQueries]);

  return (
    <div>
      <p className="text-body-secondary mb-3">{t("administrative-operations.log.description")}</p>

      {query.isLoading ? (
        <LoadingState variant="inline" />
      ) : query.isError ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
          <span>{t("administrative-operations.log.loadError")}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => query.refetch()}
          >
            {t("administrative-operations.shell.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-body-secondary py-4 mb-0">
          {t("administrative-operations.log.emptyState")}
        </p>
      ) : (
        <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
          {items.map((entry) => (
            <li key={entry.id} className="soft-card p-3">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-1">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <span className="fw-semibold fs-6">
                    {entry.action
                      ? t(`administrative-operations.log.actions.${entry.action}` as TranslationKey)
                      : "—"}
                  </span>
                  {entry.entityType ? (
                    <Badge bg="secondary">
                      {t(
                        `administrative-operations.log.entityTypes.${entry.entityType}` as TranslationKey,
                      )}
                    </Badge>
                  ) : null}
                </div>
                <span className="text-body-secondary small flex-shrink-0">
                  {new Date(entry.createdAt).toLocaleString(locale)}
                </span>
              </div>
              {entry.note ? <p className="mb-2">{entry.note}</p> : null}
              {entry.createdBy ? (
                <span className="d-flex align-items-center gap-1 text-body-secondary small border-top pt-2 mt-1">
                  <i className="bi bi-person" aria-hidden />
                  {t("administrative-operations.log.byUser", {
                    user: userNameById.get(entry.createdBy) ?? entry.createdBy,
                  })}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

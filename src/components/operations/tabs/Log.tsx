import { useState } from "react";
import { Badge } from "react-bootstrap";
import { LoadingState } from "@/components/ui/loading-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { getGetApiOperationIdLogQueryOptions } from "@/api/generated/endpoints/operation/operation";
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
 * snapshot gerado. `createdBy` só traz o `Guid` do usuário, sem nome (SPEC-39
 * §5/R2 — resolver nome via outro endpoint fica pra uma SPEC futura, decisão
 * de UI não bloqueante); mostramos o id cru por ora.
 */
export function Log({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const [page, setPage] = useState(1);

  const query = useSsrSafeQuery(
    getGetApiOperationIdLogQueryOptions(operationId, {
      Offset: (page - 1) * PAGE_SIZE,
      Limit: PAGE_SIZE,
    }),
  );

  const items = query.data?.items ?? [];
  const total = Number(query.data?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <span className="fw-semibold">
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
                <span className="text-body-secondary small">
                  {new Date(entry.createdAt).toLocaleString(locale)}
                </span>
              </div>
              {entry.note ? <p className="mb-1">{entry.note}</p> : null}
              {entry.createdBy ? (
                <span className="text-body-secondary small">
                  {t("administrative-operations.log.byUser", { user: entry.createdBy })}
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

import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Badge, Form } from "react-bootstrap";
import { LoadingState } from "@/components/ui/loading-state";
import { ListPagination } from "@/components/ui/list-pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { getGetApiOperationIdLogQueryOptions } from "@/api/generated/endpoints/operation/operation";
import { getGetApiUserIdQueryOptions } from "@/api/generated/endpoints/user/user";
import { OperationEventEntityType } from "@/api/generated/model";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import { useLocale, useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;
const ENTITY_TYPE_OPTIONS = Object.values(OperationEventEntityType);
type EntityTypeFilterValue =
  (typeof OperationEventEntityType)[keyof typeof OperationEventEntityType] | "";

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
 * SPEC-86 acrescenta o avatar do autor (mesmo `UserDTO` já buscado, via
 * `resolveAvatarUrl`) e o filtro por `EntityType` (único filtro que o Core
 * expõe hoje pra este endpoint — Action/usuário/data ficaram bloqueados,
 * ver `specs/86-operations-log-tab-avatar-filters/spec.md` §6).
 */
export function Log({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  // SPEC-86 §3.2 — filtro por Tipo de entidade, único filtro que o Core já
  // expõe pra este endpoint hoje (Action/CreatedBy/data ficaram bloqueados,
  // ver spec §6).
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypeFilterValue>("");
  const isClient = typeof window !== "undefined";

  const query = useSsrSafeQuery(
    getGetApiOperationIdLogQueryOptions(operationId, {
      EntityType: entityTypeFilter || undefined,
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

  // Mapa id -> URL do avatar (SPEC-86 RF1/RF2). `undefined` cobre
  // carregando/sem avatar/erro — o render cai pro ícone `bi-person`.
  const userAvatarById = useMemo(() => {
    const map = new Map<string, string>();
    uniqueUserIds.forEach((id, index) => {
      const result = userQueries[index];
      const url = resolveAvatarUrl(result?.data?.profile?.avatarFile);
      if (url) map.set(id, url);
    });
    return map;
  }, [uniqueUserIds, userQueries]);

  return (
    <div>
      <p className="text-body-secondary mb-3">{t("administrative-operations.log.description")}</p>

      <div className="d-flex justify-content-end mb-3">
        <Form.Select
          size="sm"
          style={{ width: "auto" }}
          aria-label={t("administrative-operations.log.filterAllEntityTypes")}
          value={entityTypeFilter}
          onChange={(e) => {
            setEntityTypeFilter(e.target.value as EntityTypeFilterValue);
            setPage(1);
          }}
        >
          <option value="">{t("administrative-operations.log.filterAllEntityTypes")}</option>
          {ENTITY_TYPE_OPTIONS.map((entityType) => (
            <option key={entityType} value={entityType}>
              {t(`administrative-operations.log.entityTypes.${entityType}` as TranslationKey)}
            </option>
          ))}
        </Form.Select>
      </div>

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
                <span className="d-flex align-items-center gap-2 text-body-secondary small border-top pt-2 mt-1">
                  {/* SPEC-86 RF1/RF2 — avatar do autor, com fallback pro
                      ícone genérico enquanto carrega, sem avatar ou se a
                      imagem falhar. */}
                  {userAvatarById.get(entry.createdBy) ? (
                    <img
                      src={userAvatarById.get(entry.createdBy)}
                      alt=""
                      width={20}
                      height={20}
                      className="rounded-circle flex-shrink-0"
                      style={{ objectFit: "cover" }}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span
                      className="rounded-circle bg-secondary-subtle d-inline-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 20, height: 20 }}
                    >
                      <i className="bi bi-person" aria-hidden />
                    </span>
                  )}
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

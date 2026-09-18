import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "react-toastify";
import { z } from "zod";
import styles from "./responsible.module.css";

import {
  getApiOperationOperationIdResponsibleEligibleUsers,
  getGetApiOperationOperationIdResponsibleQueryKey,
  getGetApiOperationOperationIdResponsibleQueryOptions,
  useDeleteApiOperationOperationIdResponsibleId,
  usePostApiOperationOperationIdResponsible,
  usePostApiOperationOperationIdResponsibleMe,
} from "@/api/generated/endpoints/responsible/responsible";
import { PostApiOperationOperationIdResponsibleBody } from "@/api/generated/zod/responsible/responsible.zod";
import type { InternalRole, ResponsibleDTO } from "@/api/generated/model";
import {
  internalRoleOptions,
  resolveInternalRoleLabel,
} from "@/api/generated/static/internalRoleOptions";
import { SelectAsync } from "@/layouts/Form/Fields/Index";
import { FilterText } from "@/layouts/Filters/Index";
import { ListPagination } from "@/components/ui/list-pagination";
import { usePagination } from "@/hooks/usePagination";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";
import { useUser } from "@/hooks";
import type { TranslationKey } from "@/i18n/translate";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// SPEC-21 RF2 (ajuste pós-implementação, pedido do usuário): opções do
// filtro vêm do snapshot estático gerado do enum real do Core
// (`internalRoleOptions`, `x-snapshot` de `GET /api/user/roles`, mesmo
// padrão já usado em `src/data/admin-roles.ts` e `admin/access/index.tsx`)
// — não mais uma lista hardcoded no componente. `user.type`
// (Internal/External) não entra: Responsável de Operação só pode ser staff
// interno (SPEC-39 do Core já garante isso na busca de vincular), então
// essa distinção nunca varia e não serve como filtro.
type RoleFilterKey = InternalRole;

type LinkFormValues = z.infer<typeof PostApiOperationOperationIdResponsibleBody>;

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/**
 * Aba **Responsáveis** (SPEC-16, com ajustes da SPEC-21) — módulo
 * `Responsible` real do Core: lista quem já está vinculado
 * (`useGetApiOperationOperationIdResponsible`, sempre vínculos — sem filtro
 * de status, ver SPEC-21 RF1), filtra client-side por papel (RF2), vincula
 * um novo usuário via busca (`SelectAsync` +
 * `getApiOperationOperationIdResponsibleEligibleUsers`, SPEC-21 Fase 2 —
 * já exclui quem está vinculado e filtra só staff interno ativo,
 * SPEC-39 do Core) e desvincula pelo `id` do vínculo (não o `userId`).
 * Papel exibido é o real do Core (`user.type`/`user.roles`), sem inventar
 * rótulo.
 */
export function OperationResponsibleTab({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [roleFilter, setRoleFilter] = useState<Set<RoleFilterKey>>(() => new Set());
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  const [search, setSearch] = useState("");

  const query = useSsrSafeQuery(getGetApiOperationOperationIdResponsibleQueryOptions(operationId));

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdResponsibleQueryKey(operationId),
    });

  const linkMutation = usePostApiOperationOperationIdResponsible();
  const unlinkMutation = useDeleteApiOperationOperationIdResponsibleId();
  const selfLinkMutation = usePostApiOperationOperationIdResponsibleMe();

  // SPEC-54: alternativa ao "Vincular" (busca de usuário) — vincula o
  // próprio usuário logado num clique, sem passar pelo `SelectAsync`
  // (bypassa a pendência de busca registrada no TODO.md).
  const isSelfLinked = query.data?.some((item) => item.user.id === user?.id) ?? false;

  const handleSelfLink = () => {
    selfLinkMutation.mutate(
      { operationId },
      {
        onSuccess: () => {
          toast.success(t("administrative-operations.responsible.toast.linked"));
          invalidateList();
        },
        onError: () => {
          toast.error(t("administrative-operations.responsible.toast.error"));
        },
      },
    );
  };

  // SPEC-21 Fase 2 / SPEC-39 (Core): rota dedicada já devolve só staff
  // interno ativo e ainda não vinculado a esta operação — sem filtro
  // adicional necessário aqui (RF3/RF4 resolvidos no próprio endpoint).
  const fetchUserOptions = (userSearch: string) =>
    getApiOperationOperationIdResponsibleEligibleUsers(operationId, {
      Search: userSearch,
      Limit: 20,
    }).then((res) =>
      res.items.map((user) => ({
        value: user.id,
        label: user.profile.fullName || user.profile.email,
      })),
    );

  const linkForm = useForm<LinkFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdResponsibleBody),
    defaultValues: { userId: "" },
  });
  const selectedUserId = linkForm.watch("userId");

  // Sem botão de salvar extra (mesmo padrão do `Select` de status em
  // `OperationHeader`): assim que o usuário escolhe uma opção no
  // `SelectAsync`, o vínculo já é criado.
  useEffect(() => {
    if (!selectedUserId) return;
    linkMutation.mutate(
      { operationId, data: { userId: selectedUserId } },
      {
        onSuccess: () => {
          toast.success(t("administrative-operations.responsible.toast.linked"));
          invalidateList();
          setLinkModalOpen(false);
          linkForm.reset({ userId: "" });
        },
        onError: () => {
          toast.error(t("administrative-operations.responsible.toast.error"));
          linkForm.reset({ userId: "" });
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  const handleUnlink = async (item: ResponsibleDTO) => {
    try {
      await unlinkMutation.mutateAsync({ operationId, id: item.id });
      toast.success(t("administrative-operations.responsible.toast.unlinked"));
      invalidateList();
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    }
  };

  const list = useMemo(() => {
    const items = query.data ?? [];
    const queryText = search.trim().toLowerCase();
    return items.filter((item) => {
      // SPEC-21 RF2: sem seleção = sem filtro (mostra todos). Com seleção,
      // OR entre as roles marcadas (user.roles — sem user.type, ver
      // internalRoleOptions acima).
      if (roleFilter.size > 0 && !item.user.roles.some((role) => roleFilter.has(role))) {
        return false;
      }
      if (!queryText) return true;
      const name = item.user.profile.fullName ?? item.user.userName;
      return (
        name.toLowerCase().includes(queryText) ||
        item.user.profile.email.toLowerCase().includes(queryText)
      );
    });
  }, [search, roleFilter, query.data]);

  const { page, setPage, totalPages, pageItems } = usePagination(list, PAGE_SIZE);

  const toggleRoleFilter = (key: RoleFilterKey) => {
    setRoleFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      {/* SPEC-87: cabeçalho reorganizado em 2 linhas lógicas (busca+filtro /
          ações) em vez de 3 colunas apertadas — evita quebra feia em
          viewport estreito, sem mudar nenhuma regra de negócio. */}
      <div className="d-flex flex-column gap-2 mb-3">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="flex-grow-1" style={{ minWidth: 220 }}>
            <FilterText
              value={search}
              onChange={setSearch}
              placeholder={t("administrative-operations.responsible.searchPlaceholder")}
            />
          </div>
          <div
            className="btn-group flex-wrap"
            role="group"
            aria-label={t("administrative-operations.responsible.filter.byRole")}
          >
            {internalRoleOptions.map((opt) => {
              const key = opt.key as RoleFilterKey;
              return (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={roleFilter.has(key) ? "primary" : "outline-primary"}
                  onClick={() => toggleRoleFilter(key)}
                  aria-pressed={roleFilter.has(key)}
                >
                  {resolveInternalRoleLabel(key, locale)}
                </Button>
              );
            })}
          </div>
          {roleFilter.size > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="link"
              className="p-0"
              onClick={() => setRoleFilter(new Set())}
            >
              {t("administrative-operations.responsible.filter.clear")}
            </Button>
          ) : null}
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 ms-md-auto">
          <Button
            variant="outline-primary"
            size="sm"
            disabled={isSelfLinked || selfLinkMutation.isPending}
            onClick={handleSelfLink}
          >
            <i className="bi bi-person-plus me-1" aria-hidden />
            {t("administrative-operations.responsible.selfLink")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              linkForm.reset({ userId: "" });
              setLinkModalOpen(true);
            }}
          >
            <i className="bi bi-link-45deg me-1" aria-hidden />
            {t("administrative-operations.responsible.link")}
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <LoadingState variant="inline" />
      ) : query.isError ? (
        <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
          <span>{t("administrative-operations.responsible.toast.loadError")}</span>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => query.refetch()}
          >
            {t("administrative-operations.shell.retry")}
          </button>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {pageItems.map((item) => {
            const name = item.user.profile.fullName || item.user.userName;
            return (
              <div
                key={item.id}
                className="soft-card p-3 d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3"
              >
                <div
                  className="rounded-circle bg-primary-subtle text-primary-emphasis d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
                  style={{ width: 44, height: 44 }}
                >
                  {initials(name)}
                </div>
                <div className="flex-grow-1 min-w-0 w-100">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="fw-semibold text-truncate">{name}</span>
                    {/* SPEC-87: tipo (Interno/Externo) vira rótulo discreto,
                        separado visualmente dos badges de papel abaixo —
                        antes competia com eles como Badge bg="secondary". */}
                    <span className="small text-body-secondary">
                      {t(
                        `administrative-operations.responsible.roles.${item.user.type}` as TranslationKey,
                      )}
                    </span>
                  </div>
                  {item.user.roles.length > 0 ? (
                    // SPEC-95: mesmo tratamento que `admin/access/index.tsx`
                    // já dá pro mesmo tipo de dado (papel/role do usuário,
                    // referência citada pelo usuário) — lá a coluna "papel"
                    // é texto simples separado por vírgula, não `Badge`
                    // (`Badge pill` em `admin/access` é só pra `isActive`/
                    // `type`, campos binários, não pra `roles`).
                    <div className="small text-body-secondary mt-1">
                      {item.user.roles
                        .map((role) =>
                          t(
                            `administrative-operations.responsible.roles.${role}` as TranslationKey,
                          ),
                        )
                        .join(", ")}
                    </div>
                  ) : null}
                  <div className="small text-body-secondary text-truncate mt-1">
                    {item.user.profile.email}
                    {item.user.profile.phone ? ` · ${item.user.profile.phone}` : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline-danger"
                  className={`${styles.unlinkButton} align-self-stretch align-self-md-center flex-shrink-0`}
                  disabled={unlinkMutation.isPending}
                  onClick={() => handleUnlink(item)}
                >
                  <i className="bi bi-x-lg me-1" aria-hidden />
                  {t("administrative-operations.responsible.unlink")}
                </Button>
              </div>
            );
          })}

          {list.length === 0 ? (
            <div className="text-center text-body-secondary py-4">
              <i className="bi bi-people display-6 d-block mb-2" aria-hidden />
              {t("administrative-operations.responsible.emptyState")}
            </div>
          ) : null}
        </div>
      )}

      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal show={linkModalOpen} onHide={() => setLinkModalOpen(false)} centered>
        <Modal.Header>
          <Modal.Title className="h5 mb-0">
            {t("administrative-operations.responsible.link")}
          </Modal.Title>
        </Modal.Header>
        <Form noValidate>
          <Modal.Body>
            <SelectAsync<LinkFormValues>
              methods={linkForm}
              fieldName="userId"
              label={t("administrative-operations.responsible.link")}
              config={{ placeholder: t("administrative-operations.responsible.linkPlaceholder") }}
              fetchOptions={fetchUserOptions}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={() => setLinkModalOpen(false)}>
              {t("crud.recordModal.cancel")}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

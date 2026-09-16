import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, Col, Form, Row } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getApiOperationOperationIdResponsibleEligibleUsers,
  getGetApiOperationOperationIdResponsibleQueryKey,
  getGetApiOperationOperationIdResponsibleQueryOptions,
  useDeleteApiOperationOperationIdResponsibleId,
  usePostApiOperationOperationIdResponsible,
} from "@/api/generated/endpoints/responsible/responsible";
import { PostApiOperationOperationIdResponsibleBody } from "@/api/generated/zod/responsible/responsible.zod";
import type { InternalRole, ResponsibleDTO } from "@/api/generated/model";
import { InputText, SelectAsync } from "@/layouts/Form/Fields/Index";
import { ListPagination } from "@/components/ui/list-pagination";
import { usePagination } from "@/hooks/usePagination";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// SPEC-21 RF2 (ajuste pós-implementação): só `InternalRole` — o filtro por
// `user.type` (Internal/External) foi removido, Responsável de Operação só
// pode ser staff interno (SPEC-39 do Core já garante isso na busca de
// vincular), então a distinção nunca varia e não faz sentido como filtro.
type RoleFilterKey = InternalRole;

const ROLE_FILTER_OPTIONS: RoleFilterKey[] = ["Agent", "Supervisor", "Laboratory"];

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
  const queryClient = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<Set<RoleFilterKey>>(() => new Set());
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  const searchMethods = useForm<{ search: string }>({ defaultValues: { search: "" } });
  const search = searchMethods.watch("search");

  const query = useSsrSafeQuery(getGetApiOperationOperationIdResponsibleQueryOptions(operationId));

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdResponsibleQueryKey(operationId),
    });

  const linkMutation = usePostApiOperationOperationIdResponsible();
  const unlinkMutation = useDeleteApiOperationOperationIdResponsibleId();

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
      toast.error(t("administrative-operations.responsible.toast.error"));
    }
  };

  const list = useMemo(() => {
    const items = query.data ?? [];
    const queryText = search.trim().toLowerCase();
    return items.filter((item) => {
      // SPEC-21 RF2: sem seleção = sem filtro (mostra todos). Com seleção,
      // OR entre as roles marcadas (user.roles — sem user.type, ver
      // ROLE_FILTER_OPTIONS).
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
      <Row className="g-2 mb-3">
        <Col md={4}>
          <InputText
            methods={searchMethods}
            fieldName="search"
            placeholder={t("administrative-operations.responsible.searchPlaceholder")}
            config={{ containerClass: "mb-0" }}
          />
        </Col>
        <Col md={5} className="d-flex align-items-center gap-2 flex-wrap">
          <div
            className="btn-group flex-wrap"
            role="group"
            aria-label={t("administrative-operations.responsible.filter.byRole")}
          >
            {ROLE_FILTER_OPTIONS.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={roleFilter.has(key) ? "primary" : "outline-primary"}
                onClick={() => toggleRoleFilter(key)}
                aria-pressed={roleFilter.has(key)}
              >
                {t(`administrative-operations.responsible.roles.${key}` as TranslationKey)}
              </Button>
            ))}
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
        </Col>
        <Col md={3} className="d-flex justify-content-end align-items-center">
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
        </Col>
      </Row>

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
              <Card
                key={item.id}
                body
                className="d-flex flex-row flex-wrap align-items-center gap-3"
              >
                <div
                  className="rounded-circle bg-primary-subtle text-primary-emphasis d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
                  style={{ width: 44, height: 44 }}
                >
                  {initials(name)}
                </div>
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold text-truncate">{name}</div>
                  <div className="d-flex flex-wrap gap-1 my-1">
                    <Badge bg="secondary">
                      {t(
                        `administrative-operations.responsible.roles.${item.user.type}` as TranslationKey,
                      )}
                    </Badge>
                    {item.user.roles.map((role) => (
                      <Badge key={role} bg="info" text="dark">
                        {t(`administrative-operations.responsible.roles.${role}` as TranslationKey)}
                      </Badge>
                    ))}
                  </div>
                  <div className="small text-body-secondary text-truncate">
                    {item.user.profile.email}
                    {item.user.profile.phone ? ` · ${item.user.profile.phone}` : ""}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline-danger"
                  disabled={unlinkMutation.isPending}
                  onClick={() => handleUnlink(item)}
                >
                  <i className="bi bi-x-lg me-1" aria-hidden />
                  {t("administrative-operations.responsible.unlink")}
                </Button>
              </Card>
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

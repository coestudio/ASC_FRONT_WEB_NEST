import { useState } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import type { UseQueryOptions } from "@tanstack/react-query";
import { Card } from "react-bootstrap";

import {
  getApiClientClientIdCollaborator,
  getGetApiClientClientIdCollaboratorQueryKey,
  getGetApiClientClientIdCollaboratorIdQueryOptions,
  usePostApiClientClientIdCollaborator,
  useDeleteApiClientClientIdCollaboratorId,
} from "@/api/generated/endpoints/collaborator/collaborator";
import type { CollaboratorDTO } from "@/api/generated/model";
import {
  CrudListPage,
  type CrudColumn,
  type CrudPagedResult,
} from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { LoadingState } from "@/components/ui/loading-state";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { collaboratorFormSchema, type CollaboratorFormValues } from "@/lib/validation/collaborator";
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { useMounted } from "@/hooks/useMounted";
import { useLocale, useT } from "@/lib/ui-prefs";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export const Route = createFileRoute("/_dashboard/client/collaborators/")({
  head: () => ({ meta: [{ title: "Colaboradores — ASC" }] }),
  component: CollaboratorsPage,
});

// `clientId` vem do `beforeLoad` de `/_dashboard/client` (D1, SPEC-09) —
// route context é cumulativo, então o hook da própria rota já enxerga o
// valor colocado pelo pai.
const clientRouteApi = getRouteApi("/_dashboard/client");

function toFormValues(record?: CollaboratorDTO): CollaboratorFormValues {
  return {
    fullName: record?.user.profile.fullName ?? "",
    document: record?.user.profile.document ?? "",
    email: record?.user.profile.email ?? "",
    phone: record?.user.profile.phone ?? "",
    birthDate: record?.user.profile.birthDate ?? "",
    userName: record?.user.userName ?? "",
  };
}

/**
 * `GET /api/client/{clientId}/collaborator` devolve `CollaboratorDTO[]` puro
 * (sem `items`/`total`, diferente de todo outro endpoint de listagem do
 * Core) — lacuna de contrato prevista no R1 da SPEC-09 (endpoint nunca
 * exercitado antes desta implementação). Busca/paginação viram client-side
 * aqui em vez de `Search`/`Offset`/`Limit` (o endpoint não aceita nenhum).
 */
function toPagedResult(
  items: CollaboratorDTO[],
  search: string,
  page: number,
): CrudPagedResult<CollaboratorDTO> {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((c) => {
        const fullName = c.user.profile.fullName?.toLowerCase() ?? "";
        const email = c.user.profile.email?.toLowerCase() ?? "";
        return (
          fullName.includes(q) || c.user.userName.toLowerCase().includes(q) || email.includes(q)
        );
      })
    : items;
  const start = (page - 1) * PAGE_SIZE;
  return { items: filtered.slice(start, start + PAGE_SIZE), total: filtered.length };
}

/**
 * Gate de montagem (SPEC-10 §14): `detail` abaixo usa `useSsrSafeQuery` fora
 * do `CrudListPage` — sem esse gate o hook existe na árvore durante o SSR e
 * a integração de streaming pode tentar buscá-lo mesmo com `enabled: false`
 * (mesma causa raiz do bug original de `admin/access`, SPEC-10 §13). Pior
 * caso da §14: usava o hook Orval bruto (`useGetApiClientClientIdCollaboratorId`),
 * nem passava por `useSsrSafeQuery` — trocado junto com o gate.
 * `CollaboratorsPageBody` só monta depois de `mounted = true`.
 */
function CollaboratorsPage() {
  const mounted = useMounted();

  return mounted ? (
    <CollaboratorsPageBody />
  ) : (
    <PageLayout density="wide">
      <LoadingState variant="inline" />
    </PageLayout>
  );
}

function CollaboratorsPageBody() {
  const t = useT();
  const locale = useLocale();
  const { clientId } = clientRouteApi.useRouteContext();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: CollaboratorDTO } | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<CollaboratorDTO | null>(null);

  const listQueryOptions: UseQueryOptions<CrudPagedResult<CollaboratorDTO>> = {
    queryKey: [...getGetApiClientClientIdCollaboratorQueryKey(clientId ?? ""), { search, page }],
    queryFn: async () =>
      toPagedResult(await getApiClientClientIdCollaborator(clientId ?? ""), search, page),
    enabled: Boolean(clientId),
  };

  const createMutation = usePostApiClientClientIdCollaborator();
  const deleteMutation = useDeleteApiClientClientIdCollaboratorId();

  // Sem `onUpdate` — o Core não expõe PUT/PATCH para Collaborator (R3 da
  // SPEC-09), o `handleSubmit` só tem fluxo `create`. `onCreate`/`onDelete`
  // só existem quando `clientId` já resolveu (mesmo guard do `if (!clientId)
  // return` que o código tinha antes).
  const { submit, remove } = useCrudMutations<CollaboratorFormValues, CollaboratorDTO>({
    onCreate: clientId
      ? (values) =>
          createMutation.mutateAsync({
            clientId,
            data: {
              userName: values.userName,
              profile: {
                fullName: values.fullName,
                document: values.document,
                email: values.email,
                phone: values.phone || null,
                birthDate: values.birthDate || null,
              },
            },
          })
      : undefined,
    onDelete: clientId
      ? (record) => deleteMutation.mutateAsync({ clientId, id: record.id })
      : undefined,
    invalidateKey: getGetApiClientClientIdCollaboratorQueryKey(clientId ?? ""),
    messages: {
      created: "client.collaborators.toast.created",
      deleted: "client.collaborators.toast.deleted",
      error: "client.collaborators.toast.error",
    },
  });

  // `view` refaz a busca por `GET /api/client/{clientId}/collaborator/{id}`
  // (endpoint de detalhe, nunca exercitado antes) em vez de reusar o item da
  // lista — confirma que também funciona de ponta a ponta (RF1/CA1).
  const { data: detail } = useSsrSafeQuery({
    ...getGetApiClientClientIdCollaboratorIdQueryOptions(clientId ?? "", modal?.record?.id ?? ""),
    enabled: modal?.mode === "view" && Boolean(clientId) && Boolean(modal?.record?.id),
  });

  const fields: LayoutField[] = [
    {
      type: "InputText",
      fieldName: "fullName",
      label: t("client.collaborators.form.fullName"),
      col: { md: 6 },
    },
    {
      type: "InputText",
      fieldName: "userName",
      label: t("client.collaborators.form.userName"),
      col: { md: 6 },
    },
    {
      type: "InputEmail",
      fieldName: "email",
      label: t("client.collaborators.form.email"),
      col: { md: 6 },
    },
    {
      type: "InputDocument",
      fieldName: "document",
      label: t("client.collaborators.form.document"),
      col: { md: 6 },
    },
    {
      type: "InputPhone",
      fieldName: "phone",
      label: t("client.collaborators.form.phone"),
      col: { md: 6 },
    },
    {
      type: "InputDate",
      fieldName: "birthDate",
      label: t("client.collaborators.form.birthDate"),
      col: { md: 6 },
    },
  ];

  const columns: CrudColumn<CollaboratorDTO>[] = [
    {
      key: "fullName",
      headerKey: "client.collaborators.colFullName",
      render: (c) => c.user.profile.fullName ?? "—",
    },
    {
      key: "userName",
      headerKey: "client.collaborators.colUserName",
      render: (c) => c.user.userName,
    },
    {
      key: "email",
      headerKey: "client.collaborators.colEmail",
      render: (c) => c.user.profile.email ?? "—",
    },
    {
      key: "createdAt",
      headerKey: "client.collaborators.colCreatedAt",
      render: (c) => new Date(c.createdAt).toLocaleDateString(locale),
    },
  ];

  const handleSubmit = async (values: CollaboratorFormValues) => {
    if (!modal) return;
    const ok = await submit(modal.mode as "create" | "edit", values, modal.record);
    if (ok) setModal(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await remove(pendingDelete);
    setPendingDelete(null);
  };

  return (
    <>
      <PageLayout density="wide">
        <CrudListPage
          titleKey="client.collaborators.title"
          descriptionKey="client.collaborators.description"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(c) => (
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-0">
                  {c.user.profile.fullName ?? c.user.userName}
                </Card.Title>
                <Card.Subtitle className="text-body-secondary small mt-1">
                  {c.user.profile.email ?? "—"}
                </Card.Subtitle>
              </Card.Body>
            </Card>
          )}
          getItemKey={(c) => c.id}
          rowActions={(c, ctl) => (
            // Sem botão de editar — o Core não expõe PUT/PATCH para
            // Collaborator (R3 da SPEC-09). Só ver e excluir.
            <CrudRowActions
              show={ctl.show}
              onToggle={ctl.onToggle}
              onView={() => setModal({ mode: "view", record: c })}
              onDelete={() => setPendingDelete(c)}
            />
          )}
          onRowOpen={(c) => setModal({ mode: "view", record: c })}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => setModal({ mode: "create" })}
          emptyMessageKey="client.collaborators.emptyState"
        />
      </PageLayout>

      {modal ? (
        <CrudRecordModal<CollaboratorFormValues>
          show
          mode={modal.mode}
          titleKeys={{
            create: "client.collaborators.newTitle",
            edit: "client.collaborators.newTitle",
            view: "client.collaborators.viewTitle",
          }}
          schema={collaboratorFormSchema}
          fields={fields}
          defaultValues={toFormValues(
            modal.mode === "view" ? (detail ?? modal.record) : modal.record,
          )}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          onDelete={
            modal.record ? () => setPendingDelete(modal.record as CollaboratorDTO) : undefined
          }
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("client.collaborators.confirm.deleteTitle")}
          message={t("client.collaborators.confirm.deleteMessage", {
            name: pendingDelete.user.profile.fullName ?? pendingDelete.user.userName,
          })}
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  );
}

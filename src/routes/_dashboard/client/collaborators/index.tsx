import { useState } from "react";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";

import {
  getApiClientClientIdCollaborator,
  getGetApiClientClientIdCollaboratorQueryKey,
  useGetApiClientClientIdCollaboratorId,
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
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { collaboratorFormSchema, type CollaboratorFormValues } from "@/lib/validation/collaborator";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 20;

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

function CollaboratorsPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
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

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiClientClientIdCollaboratorQueryKey(clientId ?? ""),
    });

  const createMutation = usePostApiClientClientIdCollaborator();
  const deleteMutation = useDeleteApiClientClientIdCollaboratorId();

  // `view` refaz a busca por `GET /api/client/{clientId}/collaborator/{id}`
  // (endpoint de detalhe, nunca exercitado antes) em vez de reusar o item da
  // lista — confirma que também funciona de ponta a ponta (RF1/CA1).
  const { data: detail } = useGetApiClientClientIdCollaboratorId(
    clientId ?? "",
    modal?.record?.id ?? "",
    {
      query: { enabled: modal?.mode === "view" && Boolean(clientId) && Boolean(modal?.record?.id) },
    },
  );

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
    {
      key: "actions",
      headerKey: "client.collaborators.colActions",
      // Sem botão de editar — o Core não expõe PUT/PATCH para Collaborator
      // (R3 da SPEC-09). Só ver e excluir.
      render: (c) => (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setModal({ mode: "view", record: c })}
          >
            <i className="bi bi-eye" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setPendingDelete(c)}
          >
            <i className="bi bi-trash" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (values: CollaboratorFormValues) => {
    if (!clientId) return;
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({
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
        });
        toast.success(t("client.collaborators.toast.created"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("client.collaborators.toast.error"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !clientId) return;
    try {
      await deleteMutation.mutateAsync({ clientId, id: pendingDelete.id });
      toast.success(t("client.collaborators.toast.deleted"));
      invalidateList();
    } catch {
      toast.error(t("client.collaborators.toast.error"));
    } finally {
      setPendingDelete(null);
    }
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

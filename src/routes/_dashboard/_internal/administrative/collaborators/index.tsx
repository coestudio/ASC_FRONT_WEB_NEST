import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { UseQueryOptions } from "@tanstack/react-query";
import { Card } from "react-bootstrap";

import { getApiClient } from "@/api/generated/endpoints/client/client";
import {
  getApiClientClientIdCollaborator,
  usePostApiClientClientIdCollaborator,
  useDeleteApiClientClientIdCollaboratorId,
} from "@/api/generated/endpoints/collaborator/collaborator";
import type { ClientDTO, CollaboratorDTO } from "@/api/generated/model";
import {
  CrudListPage,
  type CrudColumn,
  type CrudPagedResult,
} from "@/components/crud/crud-list-page";
import { useCollaboratorUserActions } from "@/components/collaborators/use-collaborator-user-actions";
import { CrudRecordModal } from "@/components/crud/crud-record-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { LoadingState } from "@/components/ui/loading-state";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import {
  adminCollaboratorFormSchema,
  type AdminCollaboratorFormValues,
} from "@/lib/validation/collaborator";
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { useMounted } from "@/hooks/useMounted";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;
const CLIENTS_BATCH = 100;
const LIST_KEY = ["administrative", "collaborators"] as const;

export const Route = createFileRoute("/_dashboard/_internal/administrative/collaborators/")({
  head: () => ({ meta: [{ title: "Colaboradores — ASC" }] }),
  component: AdministrativeCollaboratorsPage,
});

type CollaboratorRow = CollaboratorDTO & { clientName: string };

// Todos os clientes da API, paginando de 100 em 100.
async function fetchAllClients(): Promise<ClientDTO[]> {
  const all: ClientDTO[] = [];
  for (let offset = 0; ; offset += CLIENTS_BATCH) {
    const page = await getApiClient({ Offset: offset, Limit: CLIENTS_BATCH });
    all.push(...page.items);
    if (page.items.length < CLIENTS_BATCH) return all;
  }
}

/**
 * O Core só expõe colaboradores por cliente (`GET /api/client/{clientId}/
 * collaborator`), sem endpoint global — junta os de todos os clientes.
 * Cliente cujo fetch falha é ignorado (não derruba a lista inteira).
 */
async function fetchAllCollaborators(): Promise<CollaboratorRow[]> {
  const clients = await fetchAllClients();
  const lists = await Promise.all(
    clients.map(async (client) => {
      try {
        const items = await getApiClientClientIdCollaborator(client.id);
        return items.map((c) => ({ ...c, clientName: client.fullName }));
      } catch {
        return [];
      }
    }),
  );
  return lists.flat();
}

function sortValue(c: CollaboratorRow, key: string): string {
  switch (key) {
    case "fullName":
      return c.user.profile.fullName ?? "";
    case "userName":
      return c.user.userName;
    case "email":
      return c.user.profile.email ?? "";
    case "clientName":
      return c.clientName;
    case "createdAt":
      return c.createdAt;
    default:
      return "";
  }
}

// Busca, ordenação e paginação client-side (endpoint não aceita nenhuma).
function toPagedResult(
  items: CollaboratorRow[],
  search: string,
  sort: string | undefined,
  page: number,
): CrudPagedResult<CollaboratorRow> {
  const q = search.trim().toLowerCase();
  let list = q
    ? items.filter((c) =>
        [c.user.profile.fullName, c.user.userName, c.user.profile.email, c.clientName].some((v) =>
          v?.toLowerCase().includes(q),
        ),
      )
    : items;
  if (sort) {
    const desc = sort.startsWith("-");
    const key = desc ? sort.slice(1) : sort;
    list = [...list].sort((a, b) => sortValue(a, key).localeCompare(sortValue(b, key)));
    if (desc) list.reverse();
  }
  const start = (page - 1) * PAGE_SIZE;
  return { items: list.slice(start, start + PAGE_SIZE), total: list.length };
}

// Gate de montagem (SPEC-10 §14) — mesmo padrão das outras listagens.
function AdministrativeCollaboratorsPage() {
  const mounted = useMounted();

  return mounted ? (
    <AdministrativeCollaboratorsBody />
  ) : (
    <PageLayout density="wide">
      <LoadingState variant="inline" />
    </PageLayout>
  );
}

function AdministrativeCollaboratorsBody() {
  const t = useT();
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CollaboratorRow | null>(null);

  const listQueryOptions: UseQueryOptions<CrudPagedResult<CollaboratorRow>> = {
    queryKey: [...LIST_KEY, { search, sort, page }],
    queryFn: async () => toPagedResult(await fetchAllCollaborators(), search, sort, page),
  };

  const deleteMutation = useDeleteApiClientClientIdCollaboratorId();
  const userActions = useCollaboratorUserActions(LIST_KEY);
  const createMutation = usePostApiClientClientIdCollaborator();
  const { submit, remove } = useCrudMutations<AdminCollaboratorFormValues, CollaboratorRow>({
    onCreate: ({ clientId, userName, fullName, document, email, phone, birthDate }) =>
      createMutation.mutateAsync({
        clientId,
        data: {
          userName,
          profile: {
            fullName,
            document,
            email,
            phone: phone || null,
            birthDate: birthDate || null,
          },
        },
      }),
    onDelete: (record) => deleteMutation.mutateAsync({ clientId: record.clientId, id: record.id }),
    invalidateKey: LIST_KEY,
    messages: {
      created: "client.collaborators.toast.created",
      deleted: "client.collaborators.toast.deleted",
      error: "client.collaborators.toast.error",
    },
  });

  const fields: LayoutField[] = [
    {
      type: "SelectAsync",
      fieldName: "clientId",
      label: t("administrative-clients.colClient"),
      col: { md: 12 },
      config: {
        fetchOptions: (search) =>
          getApiClient({ Search: search || undefined, Limit: 20 }).then((res) =>
            res.items.map((c) => ({ value: c.id, label: c.fullName })),
          ),
      },
    },
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

  const handleSubmit = async (values: AdminCollaboratorFormValues) => {
    if (await submit("create", values)) setCreating(false);
  };

  const columns: CrudColumn<CollaboratorRow>[] = [
    {
      key: "fullName",
      headerKey: "client.collaborators.colFullName",
      sortKey: "fullName",
      render: (c) => c.user.profile.fullName ?? "—",
    },
    {
      key: "userName",
      headerKey: "client.collaborators.colUserName",
      sortKey: "userName",
      render: (c) => c.user.userName,
    },
    {
      key: "email",
      headerKey: "client.collaborators.colEmail",
      sortKey: "email",
      render: (c) => c.user.profile.email ?? "—",
    },
    {
      key: "clientName",
      headerKey: "administrative-clients.colClient",
      sortKey: "clientName",
      render: (c) => c.clientName,
    },
    {
      key: "createdAt",
      headerKey: "client.collaborators.colCreatedAt",
      sortKey: "createdAt",
      render: (c) => new Date(c.createdAt).toLocaleDateString(locale),
    },
    {
      // Botão ⋮ com o menu de ações da linha (sem menu por clique).
      key: "actions",
      headerKey: "client.collaborators.colActions",
      width: "1%",
      render: (c) => (
        <CrudRowActions
          extraActions={userActions.extraActions(c)}
          onDelete={() => setPendingDelete(c)}
        />
      ),
    },
  ];

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await remove(pendingDelete);
    setPendingDelete(null);
  };

  return (
    <>
      <PageLayout density="wide">
        <CrudListPage
          titleKey="administrative-clients.collaboratorsPickerTitle"
          descriptionKey="administrative-clients.collaboratorsPickerDescription"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(c) => (
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-0">
                  {c.user.profile.fullName ?? c.user.userName}
                </Card.Title>
                <Card.Subtitle className="text-body-secondary small mt-1">
                  {c.clientName} · {c.user.profile.email ?? "—"}
                </Card.Subtitle>
              </Card.Body>
            </Card>
          )}
          getItemKey={(c) => c.id}
          search={search}
          searchButton
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          sort={sort}
          onSortChange={setSort}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => setCreating(true)}
          emptyMessageKey="client.collaborators.emptyState"
        />
      </PageLayout>

      {userActions.dialog}

      {creating ? (
        <CrudRecordModal<AdminCollaboratorFormValues>
          show
          mode="create"
          titleKeys={{
            create: "client.collaborators.newTitle",
            edit: "client.collaborators.newTitle",
            view: "client.collaborators.viewTitle",
          }}
          schema={adminCollaboratorFormSchema}
          fields={fields}
          defaultValues={{
            clientId: "",
            fullName: "",
            document: "",
            email: "",
            phone: "",
            birthDate: "",
            userName: "",
          }}
          onSubmit={handleSubmit}
          onClose={() => setCreating(false)}
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

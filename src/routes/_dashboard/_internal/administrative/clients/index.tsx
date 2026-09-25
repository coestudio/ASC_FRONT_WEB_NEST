import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiClientQueryOptions,
  getGetApiClientQueryKey,
  getGetApiClientIdQueryOptions,
  useDeleteApiClientId,
  usePostApiClient,
  usePutApiClientId,
  getApiClient,
} from "@/api/generated/endpoints/client/client";
import { PostApiClientBody } from "@/api/generated/zod/client/client.zod";
import type { ClientDTO, ClientDetailDTO, FileDTO } from "@/api/generated/model";
import { ClientAvatarField } from "@/components/clients/client-avatar-field";
import { clientInitials } from "@/components/clients/client-avatar-utils";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { LoadingState } from "@/components/ui/loading-state";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { useMounted } from "@/hooks/useMounted";
import { useLocale, useT } from "@/lib/ui-prefs";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { resolveAvatarUrl } from "@/lib/avatar-url";
import {
  clientAvatarOf,
  invalidateClientQueries,
  patchClientAvatar,
} from "@/lib/queries/client-avatar";
import styles from "./index.module.css";
import { useFuzzyListQuery } from "@/lib/queries/fuzzy-list-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// Formata `document` — CPF (11 dígitos) ou CNPJ (14), opcional desde a
// SPEC-42/50 (antes só cabia CNPJ). Vazio/nulo retorna vazio (RF2).
function formatDocument(doc: string | null | undefined): string {
  if (!doc) return "";
  const d = doc.replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return doc;
}

// Tipo de documento pelo tamanho normalizado — RF3 (chip do card).
function documentType(doc: string | null | undefined): "cpf" | "cnpj" | null {
  if (!doc) return null;
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return "cpf";
  if (d.length === 14) return "cnpj";
  return null;
}

export const Route = createFileRoute("/_dashboard/_internal/administrative/clients/")({
  head: () => ({ meta: [{ title: "Clientes — ASC" }] }),
  component: ClientsPage,
});

// Create/Update do Core têm o mesmo shape — um schema só, reusado nos dois
// modos (regra 2 do AGENTS.md: zero Zod escrito à mão, só o gerado).
type ClientFormValues = z.infer<typeof PostApiClientBody>;

/**
 * `ClientDTO` (item de lista) não tem `address`/`razaoSocial`/`ie`/
 * `observations` — só `ClientDetailDTO` (`GET /api/client/{id}`) tem o
 * cadastro completo (D1 da SPEC-05). Por isso `edit`/`view` sempre partem
 * de `ClientDetailDTO`, nunca do item de lista direto — ver `detailRequest`
 * abaixo.
 */
function toFormValues(record?: ClientDetailDTO): ClientFormValues {
  return {
    fullName: record?.fullName ?? "",
    shortName: record?.shortName ?? "",
    document: record?.document ?? "",
    razaoSocial: record?.razaoSocial ?? "",
    ie: record?.ie ?? "",
    phone: record?.phone ?? "",
    email: record?.email ?? "",
    observations: record?.observations ?? "",
    address: {
      postalCode: record?.address?.postalCode ?? "",
      street: record?.address?.street ?? "",
      number: record?.address?.number ?? "",
      complement: record?.address?.complement ?? "",
      neighborhood: record?.address?.neighborhood ?? "",
      city: record?.address?.city ?? "",
      state: record?.address?.state ?? "",
      // Default "BR" (não string vazia — o Zod gerado exige exatamente 2
      // letras quando o campo é preenchido; SPEC-24, mesmo padrão do
      // AddressGroup, que assume Brasil quando o país vem vazio/ausente).
      country: record?.address?.country ?? "BR",
    },
  };
}

/**
 * Gate de montagem (SPEC-10 §14): `detailQuery` abaixo usa `useSsrSafeQuery`
 * fora do `CrudListPage` — sem esse gate o hook existe na árvore durante o
 * SSR e a integração de streaming pode tentar buscá-lo mesmo com
 * `enabled: false` (mesma causa raiz do bug original de `admin/access`,
 * SPEC-10 §13). `ClientsPageBody` só monta depois de `mounted = true`
 * (nunca roda no servidor).
 */
function ClientsPage() {
  const mounted = useMounted();

  return mounted ? (
    <ClientsPageBody />
  ) : (
    <PageLayout density="wide">
      <LoadingState variant="inline" />
    </PageLayout>
  );
}

function ClientsPageBody() {
  const t = useT();
  const locale = useLocale();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [modal, setModal] = useState<{
    mode: CrudRecordMode;
    record?: ClientDetailDTO;
    // Avatar atual do registro aberto (SPEC-101) — separado do `record`
    // porque troca na hora, sem passar pelo "Salvar" do formulário.
    avatarFile?: FileDTO | null;
  } | null>(null);
  // Arquivo escolhido no modo criar — só sobe depois do `POST` (SPEC-101 RF5).
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<ClientDTO | null>(null);
  // Requisição de detalhe (`GET /api/client/{id}`) em andamento — só depois
  // dela resolver é que o modal `edit`/`view` abre, já com o cadastro
  // completo (ver `toFormValues`).
  const [detailRequest, setDetailRequest] = useState<{
    id: string;
    mode: Extract<CrudRecordMode, "edit" | "view">;
  } | null>(null);

  // Busca tolerante (sem caixa/acento, aceita erro de digitação) — ver `useFuzzyListQuery`.
  const listQueryOptions = useFuzzyListQuery({
    serverOptions: getGetApiClientQueryOptions({
      Offset: (page - 1) * PAGE_SIZE,
      Limit: PAGE_SIZE,
      Sort: sort,
    }),
    baseKey: getGetApiClientQueryKey(),
    fetchPage: (offset, limit) => getApiClient({ Offset: offset, Limit: limit, Sort: sort }),
    sort,
    search,
    page,
    pageSize: PAGE_SIZE,
    getTexts: (v: ClientDTO) => [v.fullName, v.shortName, v.document, v.email, v.phone],
  });

  const createMutation = usePostApiClient();
  const updateMutation = usePutApiClientId();
  const deleteMutation = useDeleteApiClientId();

  const { submit, remove } = useCrudMutations<ClientFormValues, ClientDetailDTO, ClientDTO>({
    onCreate: async (values) => {
      const created = await createMutation.mutateAsync({ data: values });
      if (pendingAvatar) {
        // Falha no upload não desfaz o cadastro (SPEC-101 RF5) — o
        // interceptor já avisa o erro do Core; aqui só explica o estado.
        try {
          await patchClientAvatar(created.id, pendingAvatar);
          await invalidateClientQueries(queryClient);
        } catch {
          toast.warning(t("clientAvatar.createdWithoutPhoto"));
        }
      }
      return created;
    },
    onUpdate: (values, record) => updateMutation.mutateAsync({ id: record.id, data: values }),
    onDelete: (record) => deleteMutation.mutateAsync({ id: record.id }),
    invalidateKey: getGetApiClientQueryKey(),
    messages: {
      created: "administrative-clients.toast.created",
      updated: "administrative-clients.toast.updated",
      deleted: "administrative-clients.toast.deleted",
      error: "administrative-clients.toast.error",
    },
  });

  const detailQueryOptions = getGetApiClientIdQueryOptions(detailRequest?.id ?? "");
  const detailQuery = useSsrSafeQuery({
    ...detailQueryOptions,
    enabled: !!detailRequest,
  });

  useEffect(() => {
    if (detailRequest && detailQuery.data && detailQuery.data.id === detailRequest.id) {
      setModal({
        mode: detailRequest.mode,
        record: detailQuery.data,
        avatarFile: clientAvatarOf(detailQuery.data),
      });
      setDetailRequest(null);
    }
  }, [detailRequest, detailQuery.data]);

  useEffect(() => {
    if (detailRequest && detailQuery.isError) {
      toast.error(t("administrative-clients.toast.loadError"));
      setDetailRequest(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailRequest, detailQuery.isError]);

  const fields: LayoutField[] = [
    {
      type: "InputText",
      fieldName: "fullName",
      label: t("administrative-clients.form.fullName"),
      col: { md: 6 },
    },
    {
      type: "InputText",
      fieldName: "shortName",
      label: t("administrative-clients.form.shortName"),
      col: { md: 6 },
    },
    {
      type: "InputDocument",
      fieldName: "document",
      label: t("administrative-clients.form.document"),
      col: { md: 6 },
    },
    {
      type: "InputText",
      fieldName: "razaoSocial",
      label: t("administrative-clients.form.razaoSocial"),
      col: { md: 6 },
    },
    {
      type: "InputText",
      fieldName: "ie",
      label: t("administrative-clients.form.ie"),
      col: { md: 4 },
    },
    {
      type: "InputPhone",
      fieldName: "phone",
      label: t("administrative-clients.form.phone"),
      col: { md: 4 },
    },
    {
      type: "InputEmail",
      fieldName: "email",
      label: t("administrative-clients.form.email"),
      col: { md: 4 },
    },
    {
      type: "AddressGroup",
      fieldName: "address",
      label: t("administrative-clients.form.address"),
      col: { md: 12 },
    },
    {
      type: "InputTextArea",
      fieldName: "observations",
      label: t("administrative-clients.form.observations"),
      col: { md: 12 },
    },
  ];

  const columns: CrudColumn<ClientDTO>[] = [
    {
      key: "fullName",
      headerKey: "administrative-clients.colFullName",
      sortKey: "fullName",
      render: (c) => c.fullName,
    },
    {
      key: "shortName",
      headerKey: "administrative-clients.colShortName",
      render: (c) => c.shortName ?? "—",
    },
    {
      key: "document",
      headerKey: "administrative-clients.colDocument",
      sortKey: "document",
      render: (c) => formatDocument(c.document) || "—",
    },
    {
      key: "phone",
      headerKey: "administrative-clients.colPhone",
      render: (c) => c.phone ?? "—",
    },
    {
      key: "email",
      headerKey: "administrative-clients.colEmail",
      sortKey: "email",
      render: (c) => c.email ?? "—",
    },
    {
      key: "createdAt",
      headerKey: "administrative-clients.colCreatedAt",
      sortKey: "createdAt",
      render: (c) => new Date(c.createdAt).toLocaleDateString(locale),
    },
  ];

  const handleSubmit = async (values: ClientFormValues) => {
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
          titleKey="administrative-clients.title"
          descriptionKey="administrative-clients.description"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(c) => {
            const docType = documentType(c.document);
            return (
              <Card className={styles.card}>
                <Card.Body>
                  <div className={styles.top}>
                    <div className={styles.avatar}>
                      {clientAvatarOf(c) ? (
                        <img src={resolveAvatarUrl(clientAvatarOf(c)) ?? undefined} alt="" />
                      ) : (
                        clientInitials(c.fullName)
                      )}
                    </div>
                    {docType ? (
                      <span className={styles.chip}>
                        {t(
                          docType === "cpf"
                            ? "administrative-clients.docTypeCpf"
                            : "administrative-clients.docTypeCnpj",
                        )}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.name}>{c.fullName}</div>
                  {c.document ? (
                    <div className={styles.doc}>
                      <i className="bi bi-card-text me-1" aria-hidden />
                      {formatDocument(c.document)}
                    </div>
                  ) : null}
                </Card.Body>
              </Card>
            );
          }}
          getItemKey={(c) => c.id}
          rowActions={(c, ctl) => {
            const isLoadingDetail = detailRequest?.id === c.id;
            return (
              <CrudRowActions
                show={ctl.show}
                position={ctl.position}
                onToggle={ctl.onToggle}
                onView={() => setDetailRequest({ id: c.id, mode: "view" })}
                onEdit={() => setDetailRequest({ id: c.id, mode: "edit" })}
                onDelete={() => setPendingDelete(c)}
                viewLoading={isLoadingDetail && detailRequest?.mode === "view"}
                editLoading={isLoadingDetail && detailRequest?.mode === "edit"}
              />
            );
          }}
          onRowOpen={(c) => setDetailRequest({ id: c.id, mode: "view" })}
          onRowEdit={(c) => setDetailRequest({ id: c.id, mode: "edit" })}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          sort={sort}
          onSortChange={setSort}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => {
            setPendingAvatar(null);
            setModal({ mode: "create" });
          }}
          emptyMessageKey="administrative-clients.emptyState"
        />
      </PageLayout>

      {modal ? (
        <CrudRecordModal<ClientFormValues>
          show
          mode={modal.mode}
          titleKeys={{
            create: "administrative-clients.newTitle",
            edit: "administrative-clients.editTitle",
            view: "administrative-clients.viewTitle",
          }}
          schema={PostApiClientBody}
          fields={fields}
          defaultValues={toFormValues(modal.record)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          headerContent={
            <ClientAvatarField
              clientId={modal.record?.id}
              name={modal.record?.fullName ?? ""}
              avatarFile={modal.avatarFile ?? null}
              readOnly={modal.mode === "view"}
              onPendingFileChange={setPendingAvatar}
              onAvatarChange={(avatarFile) =>
                setModal((prev) => (prev ? { ...prev, avatarFile } : prev))
              }
            />
          }
          onDelete={modal.record ? () => setPendingDelete(modal.record as ClientDTO) : undefined}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-clients.confirm.deleteTitle")}
          message={t("administrative-clients.confirm.deleteMessage", {
            name: pendingDelete.fullName,
          })}
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  );
}

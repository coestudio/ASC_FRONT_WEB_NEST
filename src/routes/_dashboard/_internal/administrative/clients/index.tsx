import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
} from "@/api/generated/endpoints/client/client";
import { PostApiClientBody } from "@/api/generated/zod/client/client.zod";
import type { ClientDTO, ClientDetailDTO } from "@/api/generated/model";
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
import styles from "./index.module.css";
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

// Iniciais do nome pro avatar do card — mesma ideia do `ClientCards.tsx`
// legado (primeira letra do primeiro + último nome).
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
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
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: ClientDetailDTO } | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<ClientDTO | null>(null);
  // Requisição de detalhe (`GET /api/client/{id}`) em andamento — só depois
  // dela resolver é que o modal `edit`/`view` abre, já com o cadastro
  // completo (ver `toFormValues`).
  const [detailRequest, setDetailRequest] = useState<{
    id: string;
    mode: Extract<CrudRecordMode, "edit" | "view">;
  } | null>(null);

  const listQueryOptions = getGetApiClientQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  const createMutation = usePostApiClient();
  const updateMutation = usePutApiClientId();
  const deleteMutation = useDeleteApiClientId();

  const { submit, remove } = useCrudMutations<ClientFormValues, ClientDetailDTO, ClientDTO>({
    onCreate: (values) => createMutation.mutateAsync({ data: values }),
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
      setModal({ mode: detailRequest.mode, record: detailQuery.data });
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
      render: (c) => c.email ?? "—",
    },
    {
      key: "createdAt",
      headerKey: "administrative-clients.colCreatedAt",
      render: (c) => new Date(c.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-clients.colActions",
      align: "end",
      render: (c) => {
        const isLoadingDetail = detailRequest?.id === c.id;
        return (
          <CrudRowActions
            onView={() => setDetailRequest({ id: c.id, mode: "view" })}
            onEdit={() => setDetailRequest({ id: c.id, mode: "edit" })}
            onDelete={() => setPendingDelete(c)}
            viewLoading={isLoadingDetail && detailRequest?.mode === "view"}
            editLoading={isLoadingDetail && detailRequest?.mode === "edit"}
          />
        );
      },
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
                    <div className={styles.avatar}>{initials(c.fullName)}</div>
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
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => setModal({ mode: "create" })}
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

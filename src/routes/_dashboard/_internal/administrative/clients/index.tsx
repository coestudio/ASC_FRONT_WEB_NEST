import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Spinner, Table } from "react-bootstrap";
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
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { MockDataBanner } from "@/components/ui/mock-data-banner";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useLocale, useT } from "@/lib/ui-prefs";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import styles from "./index.module.css";

const PAGE_SIZE = 20;

// Formata `document` (só CNPJ cabe no shape gerado, `ClientCreate.document`
// tem min/max 14) pro padrão `00.000.000/0000-00" — mesmo helper do
// `ClientCards.tsx` do Portal legado, adaptado (lá também tratava CPF, aqui
// não precisa).
function formatDocument(doc: string): string {
  const d = doc.replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
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
      country: record?.address?.country ?? "",
    },
  };
}

/**
 * Relatórios/histórico do cliente — array mockado local, nunca uma query.
 *
 * MOCK — sem endpoint no Core, ver specs/05-administrativo-clientes/spec.md
 * ("Relatórios operacionais" está classificado "Faltante/não comprovado" no
 * mapa de paridade Portal×Core). Geração real de relatório é fora de escopo
 * da SPEC-05 (§4).
 */
type MockClientReport = {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  status: "Concluído" | "Pendente";
};

function buildMockReports(client: ClientDetailDTO): MockClientReport[] {
  return [
    {
      id: `${client.id}-mock-1`,
      name: "Resumo de operações do trimestre",
      type: "Operacional",
      generatedAt: "2026-06-30",
      status: "Concluído",
    },
    {
      id: `${client.id}-mock-2`,
      name: "Extrato de romaneios",
      type: "Financeiro",
      generatedAt: "2026-07-15",
      status: "Pendente",
    },
  ];
}

/** Seção extra do modal `view` (§9 da SPEC-02) — dados cadastrais reais já vêm pelos `fields`; aqui só o bloco mock de relatórios/histórico. */
function ClientReportsSection({ client }: { client: ClientDetailDTO }) {
  const t = useT();
  const locale = useLocale();
  const reports = buildMockReports(client);

  return (
    <div className="mt-4 border-top pt-3">
      <h2 className="h6">{t("administrative-clients.detail.reportsTitle")}</h2>
      <MockDataBanner className="mb-3" />
      <Table responsive size="sm" className="align-middle mb-0">
        <thead>
          <tr>
            <th>{t("administrative-clients.detail.reportsColName")}</th>
            <th>{t("administrative-clients.detail.reportsColType")}</th>
            <th>{t("administrative-clients.detail.reportsColGeneratedAt")}</th>
            <th>{t("administrative-clients.detail.reportsColStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>{report.name}</td>
              <td>{report.type}</td>
              <td>{new Date(report.generatedAt).toLocaleDateString(locale)}</td>
              <td>{report.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function ClientsPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

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

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetApiClientQueryKey() });

  const createMutation = usePostApiClient();
  const updateMutation = usePutApiClientId();
  const deleteMutation = useDeleteApiClientId();

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
      type: "InputCNPJ",
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
      render: (c) => c.document,
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
      render: (c) => {
        const isLoadingDetail = detailRequest?.id === c.id;
        return (
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={isLoadingDetail}
              onClick={() => setDetailRequest({ id: c.id, mode: "view" })}
            >
              {isLoadingDetail && detailRequest?.mode === "view" ? (
                <Spinner size="sm" animation="border" />
              ) : (
                <i className="bi bi-eye" aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-success"
              disabled={isLoadingDetail}
              onClick={() => setDetailRequest({ id: c.id, mode: "edit" })}
            >
              {isLoadingDetail && detailRequest?.mode === "edit" ? (
                <Spinner size="sm" animation="border" />
              ) : (
                <i className="bi bi-pencil" aria-hidden />
              )}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => setPendingDelete(c)}
            >
              <i className="bi bi-trash" aria-hidden />
            </button>
          </div>
        );
      },
    },
  ];

  const handleSubmit = async (values: ClientFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-clients.toast.created"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-clients.toast.updated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-clients.toast.error"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-clients.toast.deleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-clients.toast.error"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageLayout density="wide">
        <CrudListPage
          titleKey="administrative-clients.title"
          descriptionKey="administrative-clients.description"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(c) => (
            <Card className={styles.card}>
              <Card.Body>
                <div className={styles.top}>
                  <div className={styles.avatar}>{initials(c.fullName)}</div>
                  <span className={styles.chip}>{t("administrative-clients.docTypeCnpj")}</span>
                </div>
                <div className={styles.name}>{c.fullName}</div>
                <div className={styles.doc}>
                  <i className="bi bi-card-text me-1" aria-hidden />
                  {formatDocument(c.document)}
                </div>
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
          extraContent={
            modal.mode === "view" && modal.record ? (
              <ClientReportsSection client={modal.record} />
            ) : undefined
          }
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

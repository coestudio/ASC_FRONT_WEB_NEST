import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiHarborQueryOptions,
  getGetApiHarborQueryKey,
  useDeleteApiHarborId,
  usePostApiHarbor,
  usePutApiHarborId,
} from "@/api/generated/endpoints/harbor/harbor";
import { getGetApiTerminalQueryOptions } from "@/api/generated/endpoints/terminal/terminal";
import { PostApiHarborBody } from "@/api/generated/zod/harbor/harbor.zod";
import type { HarborDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useLocale, useT } from "@/lib/ui-prefs";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/harbor/")({
  head: () => ({ meta: [{ title: "Portos — ASC" }] }),
  component: HarborPage,
});

// Create/Update do Core têm o mesmo shape (`name`/`address`) — um schema
// só, reusado nos dois modos (regra 2 do AGENTS.md: zero Zod escrito à mão).
type HarborFormValues = z.infer<typeof PostApiHarborBody>;

function toFormValues(record?: HarborDTO): HarborFormValues {
  return {
    name: record?.name ?? "",
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

function formatAddress(record: HarborDTO): string {
  const a = record.address;
  if (!a) return "—";
  return [a.street, a.city].filter(Boolean).join(", ") || "—";
}

/** RF4 (§8/§9 da SPEC-04): terminais do porto, só leitura, via `getApiTerminal({HarborId})` — vínculo é inverso, `HarborDTO` não tem lista de terminais. */
function RelatedTerminals({ harborId }: { harborId: string }) {
  const t = useT();
  const { data } = useSsrSafeQuery(
    getGetApiTerminalQueryOptions({ HarborId: harborId, Limit: 100 }),
  );
  const items = data?.items ?? [];

  return (
    <div className="mt-4 border-top pt-3">
      <h2 className="h6">{t("administrative-registry.harbor.relatedTerminalsTitle")}</h2>
      {items.length === 0 ? (
        <p className="text-body-secondary small mb-0">
          {t("administrative-registry.harbor.relatedTerminalsEmpty")}
        </p>
      ) : (
        <ul className="mb-0">
          {items.map((terminal) => (
            <li key={terminal.id}>{terminal.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HarborPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: HarborDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HarborDTO | null>(null);

  const listQueryOptions = getGetApiHarborQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetApiHarborQueryKey() });

  const createMutation = usePostApiHarbor();
  const updateMutation = usePutApiHarborId();
  const deleteMutation = useDeleteApiHarborId();

  const fields: LayoutField[] = [
    {
      type: "InputText",
      fieldName: "name",
      label: t("administrative-registry.harbor.form.name"),
      col: { md: 12 },
    },
    {
      type: "AddressGroup",
      fieldName: "address",
      label: t("administrative-registry.harbor.form.address"),
      col: { md: 12 },
    },
  ];

  const columns: CrudColumn<HarborDTO>[] = [
    {
      key: "name",
      headerKey: "administrative-registry.harbor.colName",
      render: (h) => h.name,
    },
    {
      key: "address",
      headerKey: "administrative-registry.harbor.colAddress",
      render: (h) => formatAddress(h),
    },
    {
      key: "createdAt",
      headerKey: "administrative-registry.harbor.colCreatedAt",
      render: (h) => new Date(h.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-registry.harbor.colActions",
      render: (h) => (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setModal({ mode: "view", record: h })}
          >
            <i className="bi bi-eye" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => setModal({ mode: "edit", record: h })}
          >
            <i className="bi bi-pencil" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setPendingDelete(h)}
          >
            <i className="bi bi-trash" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (values: HarborFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.harbor.toast.created"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.harbor.toast.updated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.harbor.toast.error"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.harbor.toast.deleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.harbor.toast.error"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageLayout density="wide">
        <CrudListPage
          titleKey="administrative-registry.harbor.title"
          descriptionKey="administrative-registry.harbor.description"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(h) => (
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-0">{h.name}</Card.Title>
                <Card.Subtitle className="text-body-secondary small mt-1">
                  {formatAddress(h)}
                </Card.Subtitle>
              </Card.Body>
            </Card>
          )}
          getItemKey={(h) => h.id}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => setModal({ mode: "create" })}
          emptyMessageKey="administrative-registry.harbor.emptyState"
        />
      </PageLayout>

      {modal ? (
        <CrudRecordModal<HarborFormValues>
          show
          mode={modal.mode}
          titleKeys={{
            create: "administrative-registry.harbor.newTitle",
            edit: "administrative-registry.harbor.editTitle",
            view: "administrative-registry.harbor.viewTitle",
          }}
          schema={PostApiHarborBody}
          fields={fields}
          defaultValues={toFormValues(modal.record)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          extraContent={
            modal.mode === "view" && modal.record ? (
              <RelatedTerminals harborId={modal.record.id} />
            ) : undefined
          }
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-registry.harbor.confirm.deleteTitle")}
          message={t("administrative-registry.harbor.confirm.deleteMessage", {
            name: pendingDelete.name,
          })}
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  );
}

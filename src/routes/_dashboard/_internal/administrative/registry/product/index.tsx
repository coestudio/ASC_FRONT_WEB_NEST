import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiProductQueryOptions,
  getGetApiProductQueryKey,
  useDeleteApiProductId,
  usePostApiProduct,
  usePutApiProductId,
} from "@/api/generated/endpoints/product/product";
import { PostApiProductBody } from "@/api/generated/zod/product/product.zod";
import type { ProductDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useLocale, useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/product/")({
  head: () => ({ meta: [{ title: "Produtos — ASC" }] }),
  component: ProductPage,
});

// Create/Update do Core têm o mesmo shape (`name`) — um schema só, reusado
// nos dois modos (regra 2 do AGENTS.md: zero Zod escrito à mão, só o gerado).
type ProductFormValues = z.infer<typeof PostApiProductBody>;

function toFormValues(record?: ProductDTO): ProductFormValues {
  return { name: record?.name ?? "" };
}

function ProductPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: ProductDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductDTO | null>(null);

  const listQueryOptions = getGetApiProductQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetApiProductQueryKey() });

  const createMutation = usePostApiProduct();
  const updateMutation = usePutApiProductId();
  const deleteMutation = useDeleteApiProductId();

  const fields: LayoutField[] = [
    {
      type: "InputText",
      fieldName: "name",
      label: t("administrative-registry.product.form.name"),
      col: { md: 12 },
    },
  ];

  const columns: CrudColumn<ProductDTO>[] = [
    {
      key: "name",
      headerKey: "administrative-registry.product.colName",
      render: (p) => p.name,
    },
    {
      key: "createdAt",
      headerKey: "administrative-registry.product.colCreatedAt",
      render: (p) => new Date(p.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-registry.product.colActions",
      render: (p) => (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => setModal({ mode: "view", record: p })}
          >
            <i className="bi bi-eye" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => setModal({ mode: "edit", record: p })}
          >
            <i className="bi bi-pencil" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setPendingDelete(p)}
          >
            <i className="bi bi-trash" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.product.toast.created"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.product.toast.updated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.product.toast.error"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.product.toast.deleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.product.toast.error"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageLayout density="wide">
        <CrudListPage
          titleKey="administrative-registry.product.title"
          descriptionKey="administrative-registry.product.description"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(p) => (
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-0">{p.name}</Card.Title>
              </Card.Body>
            </Card>
          )}
          getItemKey={(p) => p.id}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => setModal({ mode: "create" })}
          emptyMessageKey="administrative-registry.product.emptyState"
        />
      </PageLayout>

      {modal ? (
        <CrudRecordModal<ProductFormValues>
          show
          mode={modal.mode}
          titleKeys={{
            create: "administrative-registry.product.newTitle",
            edit: "administrative-registry.product.editTitle",
            view: "administrative-registry.product.viewTitle",
          }}
          schema={PostApiProductBody}
          fields={fields}
          defaultValues={toFormValues(modal.record)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-registry.product.confirm.deleteTitle")}
          message={t("administrative-registry.product.confirm.deleteMessage", {
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

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";
import type { z } from "zod";

import {
  useDeleteApiProductId,
  usePostApiProduct,
  usePutApiProductId,
  getGetApiProductQueryKey,
} from "@/api/generated/endpoints/product/product";
import { PostApiProductBody } from "@/api/generated/zod/product/product.zod";
import type { ProductDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { productListQueryOptions } from "@/lib/queries/product";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/product/")({
  head: () => ({ meta: [{ title: "Produto — ASC" }] }),
  component: ProductRegistryPage,
});

// Create/edit usam o mesmo schema gerado (`ProductCreate`/`ProductUpdate`
// têm exatamente o mesmo shape) — zero Zod à mão (RF2/CA2 da SPEC-04).
type ProductFormValues = z.infer<typeof PostApiProductBody>;

function toFormValues(record?: ProductDTO): ProductFormValues {
  return { name: record?.name ?? "" };
}

function ProductRegistryPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: ProductDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductDTO | null>(null);

  const listQueryOptions = productListQueryOptions({
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
    { type: "InputText", fieldName: "name", label: t("administrative-registry.product.formName") },
  ];

  const columns: CrudColumn<ProductDTO>[] = [
    { key: "name", headerKey: "administrative-registry.product.colName", render: (p) => p.name },
    {
      key: "createdAt",
      headerKey: "administrative-registry.product.colCreatedAt",
      render: (p) => new Date(p.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-registry.product.colActions",
      render: (p) => (
        <CrudRowActions
          onEdit={() => setModal({ mode: "edit", record: p })}
          onDelete={() => setPendingDelete(p)}
        />
      ),
    },
  ];

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.product.toastCreated"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.product.toastUpdated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.product.toastError"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.product.toastDeleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.product.toastError"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <CrudListPage
        titleKey="administrative-registry.product.title"
        descriptionKey="administrative-registry.product.description"
        queryOptions={listQueryOptions}
        columns={columns}
        renderCard={(p) => (
          <Card>
            <Card.Body>
              <Card.Title className="h6">{p.name}</Card.Title>
              <div className="small text-body-secondary mb-2">
                {new Date(p.createdAt).toLocaleDateString(locale)}
              </div>
              <CrudRowActions
                onEdit={() => setModal({ mode: "edit", record: p })}
                onDelete={() => setPendingDelete(p)}
              />
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
          title={t("administrative-registry.product.confirmDeleteTitle")}
          message={t("administrative-registry.product.confirmDeleteMessage", {
            name: pendingDelete.name,
          })}
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </div>
  );
}

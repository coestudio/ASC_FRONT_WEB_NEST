import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "react-bootstrap";
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
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useCrudMutations } from "@/hooks/useCrudMutations";
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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: ProductDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductDTO | null>(null);

  const listQueryOptions = getGetApiProductQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  const createMutation = usePostApiProduct();
  const updateMutation = usePutApiProductId();
  const deleteMutation = useDeleteApiProductId();

  const { submit, remove } = useCrudMutations<ProductFormValues, ProductDTO>({
    onCreate: (values) => createMutation.mutateAsync({ data: values }),
    onUpdate: (values, record) => updateMutation.mutateAsync({ id: record.id, data: values }),
    onDelete: (record) => deleteMutation.mutateAsync({ id: record.id }),
    invalidateKey: getGetApiProductQueryKey(),
    messages: {
      created: "administrative-registry.product.toast.created",
      updated: "administrative-registry.product.toast.updated",
      deleted: "administrative-registry.product.toast.deleted",
      error: "administrative-registry.product.toast.error",
    },
  });

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
  ];

  const handleSubmit = async (values: ProductFormValues) => {
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
          rowActions={(p, ctl) => (
            <CrudRowActions
              show={ctl.show}
              position={ctl.position}
              onToggle={ctl.onToggle}
              onView={() => setModal({ mode: "view", record: p })}
              onEdit={() => setModal({ mode: "edit", record: p })}
              onDelete={() => setPendingDelete(p)}
            />
          )}
          onRowOpen={(p) => setModal({ mode: "view", record: p })}
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
          onDelete={modal.record ? () => setPendingDelete(modal.record as ProductDTO) : undefined}
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

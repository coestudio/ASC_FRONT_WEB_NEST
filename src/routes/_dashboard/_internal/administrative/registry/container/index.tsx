import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "react-bootstrap";
import { z } from "zod";

import {
  getGetApiContainerQueryOptions,
  getGetApiContainerQueryKey,
  useDeleteApiContainerId,
  usePostApiContainer,
  usePutApiContainerId,
} from "@/api/generated/endpoints/container/container";
import { PostApiContainerBody } from "@/api/generated/zod/container/container.zod";
import type { ContainerDTO } from "@/api/generated/model";
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

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/container/")({
  head: () => ({ meta: [{ title: "Containers — ASC" }] }),
  component: ContainerPage,
});

// Create/Update do Core têm o mesmo shape (`identifier`/`tara`) — um schema
// só, reusado nos dois modos (regra 2 do AGENTS.md: zero Zod escrito à mão).
type ContainerFormValues = z.infer<typeof PostApiContainerBody>;

function toFormValues(record?: ContainerDTO): ContainerFormValues {
  return {
    identifier: record?.identifier ?? "",
    tara: record?.tara != null ? String(record.tara) : "",
    maxWeight: record?.maxWeight != null ? String(record.maxWeight) : "",
  };
}

function ContainerPage() {
  const t = useT();
  const locale = useLocale();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: ContainerDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContainerDTO | null>(null);

  const listQueryOptions = getGetApiContainerQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  const createMutation = usePostApiContainer();
  const updateMutation = usePutApiContainerId();
  const deleteMutation = useDeleteApiContainerId();

  const { submit, remove } = useCrudMutations<ContainerFormValues, ContainerDTO>({
    onCreate: (values) => createMutation.mutateAsync({ data: values }),
    onUpdate: (values, record) => updateMutation.mutateAsync({ id: record.id, data: values }),
    onDelete: (record) => deleteMutation.mutateAsync({ id: record.id }),
    invalidateKey: getGetApiContainerQueryKey(),
    messages: {
      created: "administrative-registry.container.toast.created",
      updated: "administrative-registry.container.toast.updated",
      deleted: "administrative-registry.container.toast.deleted",
      error: "administrative-registry.container.toast.error",
    },
  });

  const fields: LayoutField[] = [
    {
      type: "InputText",
      fieldName: "identifier",
      label: t("administrative-registry.container.form.identifier"),
      col: { md: 8 },
    },
    {
      type: "InputText",
      fieldName: "tara",
      label: t("administrative-registry.container.form.tara"),
      col: { md: 4 },
    },
    {
      type: "InputText",
      fieldName: "maxWeight",
      label: t("administrative-registry.container.form.maxWeight"),
      col: { md: 4 },
    },
  ];

  const columns: CrudColumn<ContainerDTO>[] = [
    {
      key: "identifier",
      headerKey: "administrative-registry.container.colIdentifier",
      render: (c) => c.identifier,
    },
    {
      key: "tara",
      headerKey: "administrative-registry.container.colTara",
      render: (c) => (c.tara != null ? String(c.tara) : "—"),
    },
    {
      key: "maxWeight",
      headerKey: "administrative-registry.container.colMaxWeight",
      render: (c) => (c.maxWeight != null ? String(c.maxWeight) : "—"),
    },
    {
      key: "createdAt",
      headerKey: "administrative-registry.container.colCreatedAt",
      render: (c) => new Date(c.createdAt).toLocaleDateString(locale),
    },
  ];

  const handleSubmit = async (values: ContainerFormValues) => {
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
          titleKey="administrative-registry.container.title"
          descriptionKey="administrative-registry.container.description"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(c) => (
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-0">{c.identifier}</Card.Title>
                <Card.Subtitle className="text-body-secondary small mt-1">
                  {c.tara != null ? String(c.tara) : "—"}
                </Card.Subtitle>
              </Card.Body>
            </Card>
          )}
          getItemKey={(c) => c.id}
          rowActions={(c, ctl) => (
            <CrudRowActions
              show={ctl.show}
              onToggle={ctl.onToggle}
              onView={() => setModal({ mode: "view", record: c })}
              onEdit={() => setModal({ mode: "edit", record: c })}
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
          emptyMessageKey="administrative-registry.container.emptyState"
        />
      </PageLayout>

      {modal ? (
        <CrudRecordModal<ContainerFormValues>
          show
          mode={modal.mode}
          titleKeys={{
            create: "administrative-registry.container.newTitle",
            edit: "administrative-registry.container.editTitle",
            view: "administrative-registry.container.viewTitle",
          }}
          schema={PostApiContainerBody}
          fields={fields}
          defaultValues={toFormValues(modal.record)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
          onDelete={modal.record ? () => setPendingDelete(modal.record as ContainerDTO) : undefined}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-registry.container.confirm.deleteTitle")}
          message={t("administrative-registry.container.confirm.deleteMessage", {
            name: pendingDelete.identifier,
          })}
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </>
  );
}

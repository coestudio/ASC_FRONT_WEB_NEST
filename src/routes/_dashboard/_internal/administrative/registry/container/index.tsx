import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";
import type { z } from "zod";

import {
  useDeleteApiContainerId,
  usePostApiContainer,
  usePutApiContainerId,
  getGetApiContainerQueryKey,
} from "@/api/generated/endpoints/container/container";
import { PostApiContainerBody } from "@/api/generated/zod/container/container.zod";
import type { ContainerDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { containerListQueryOptions } from "@/lib/queries/container";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/container/")({
  head: () => ({ meta: [{ title: "Container — ASC" }] }),
  component: ContainerRegistryPage,
});

// Create/edit usam o mesmo schema gerado (`ContainerCreate`/`ContainerUpdate`
// têm exatamente o mesmo shape) — zero Zod à mão (RF2/CA2 da SPEC-04).
type ContainerFormValues = z.infer<typeof PostApiContainerBody>;

function toFormValues(record?: ContainerDTO): ContainerFormValues {
  return { identifier: record?.identifier ?? "", tara: record?.tara ?? "" };
}

function ContainerRegistryPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: ContainerDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContainerDTO | null>(null);

  const listQueryOptions = containerListQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetApiContainerQueryKey() });

  const createMutation = usePostApiContainer();
  const updateMutation = usePutApiContainerId();
  const deleteMutation = useDeleteApiContainerId();

  const fields: LayoutField[] = [
    {
      type: "InputText",
      fieldName: "identifier",
      label: t("administrative-registry.container.formIdentifier"),
      col: { md: 6 },
    },
    {
      type: "InputNumber",
      fieldName: "tara",
      label: t("administrative-registry.container.formTara"),
      col: { md: 6 },
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
      render: (c) => (c.tara != null && c.tara !== "" ? String(c.tara) : "—"),
    },
    {
      key: "createdAt",
      headerKey: "administrative-registry.container.colCreatedAt",
      render: (c) => new Date(c.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-registry.container.colActions",
      render: (c) => (
        <CrudRowActions
          onEdit={() => setModal({ mode: "edit", record: c })}
          onDelete={() => setPendingDelete(c)}
        />
      ),
    },
  ];

  const handleSubmit = async (values: ContainerFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.container.toastCreated"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.container.toastUpdated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.container.toastError"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.container.toastDeleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.container.toastError"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <CrudListPage
        titleKey="administrative-registry.container.title"
        descriptionKey="administrative-registry.container.description"
        queryOptions={listQueryOptions}
        columns={columns}
        renderCard={(c) => (
          <Card>
            <Card.Body>
              <Card.Title className="h6">{c.identifier}</Card.Title>
              <div className="small text-body-secondary mb-2">
                {new Date(c.createdAt).toLocaleDateString(locale)}
              </div>
              <CrudRowActions
                onEdit={() => setModal({ mode: "edit", record: c })}
                onDelete={() => setPendingDelete(c)}
              />
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
        emptyMessageKey="administrative-registry.container.emptyState"
      />

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
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-registry.container.confirmDeleteTitle")}
          message={t("administrative-registry.container.confirmDeleteMessage", {
            name: pendingDelete.identifier,
          })}
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </div>
  );
}

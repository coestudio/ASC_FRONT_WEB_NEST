import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";
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
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 20;

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
  };
}

function ContainerPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: ContainerDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContainerDTO | null>(null);

  const listQueryOptions = getGetApiContainerQueryOptions({
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
      label: t("administrative-registry.container.form.identifier"),
      col: { md: 8 },
    },
    {
      type: "InputText",
      fieldName: "tara",
      label: t("administrative-registry.container.form.tara"),
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
      key: "createdAt",
      headerKey: "administrative-registry.container.colCreatedAt",
      render: (c) => new Date(c.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-registry.container.colActions",
      render: (c) => (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setModal({ mode: "view", record: c })}
          >
            <i className="bi bi-eye" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => setModal({ mode: "edit", record: c })}
          >
            <i className="bi bi-pencil" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setPendingDelete(c)}
          >
            <i className="bi bi-trash" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (values: ContainerFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.container.toast.created"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.container.toast.updated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.container.toast.error"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.container.toast.deleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.container.toast.error"));
    } finally {
      setPendingDelete(null);
    }
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

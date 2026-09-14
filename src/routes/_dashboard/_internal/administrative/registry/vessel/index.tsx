import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiVesselQueryOptions,
  getGetApiVesselQueryKey,
  useDeleteApiVesselId,
  usePostApiVessel,
  usePutApiVesselId,
} from "@/api/generated/endpoints/vessel/vessel";
import { PostApiVesselBody } from "@/api/generated/zod/vessel/vessel.zod";
import type { VesselDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/vessel/")({
  head: () => ({ meta: [{ title: "Navios — ASC" }] }),
  component: VesselPage,
});

// Create/Update do Core têm o mesmo shape (`name`) — um schema só, reusado
// nos dois modos (regra 2 do AGENTS.md: zero Zod escrito à mão, só o gerado).
type VesselFormValues = z.infer<typeof PostApiVesselBody>;

function toFormValues(record?: VesselDTO): VesselFormValues {
  return { name: record?.name ?? "" };
}

function VesselPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: VesselDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VesselDTO | null>(null);

  const listQueryOptions = getGetApiVesselQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetApiVesselQueryKey() });

  const createMutation = usePostApiVessel();
  const updateMutation = usePutApiVesselId();
  const deleteMutation = useDeleteApiVesselId();

  const fields: LayoutField[] = [
    {
      type: "InputText",
      fieldName: "name",
      label: t("administrative-registry.vessel.form.name"),
      col: { md: 12 },
    },
  ];

  const columns: CrudColumn<VesselDTO>[] = [
    {
      key: "name",
      headerKey: "administrative-registry.vessel.colName",
      render: (v) => v.name,
    },
    {
      key: "createdAt",
      headerKey: "administrative-registry.vessel.colCreatedAt",
      render: (v) => new Date(v.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-registry.vessel.colActions",
      render: (v) => (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setModal({ mode: "view", record: v })}
          >
            <i className="bi bi-eye" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => setModal({ mode: "edit", record: v })}
          >
            <i className="bi bi-pencil" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setPendingDelete(v)}
          >
            <i className="bi bi-trash" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (values: VesselFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.vessel.toast.created"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.vessel.toast.updated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.vessel.toast.error"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.vessel.toast.deleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.vessel.toast.error"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageLayout density="wide">
        <CrudListPage
          titleKey="administrative-registry.vessel.title"
          descriptionKey="administrative-registry.vessel.description"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(v) => (
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-0">{v.name}</Card.Title>
              </Card.Body>
            </Card>
          )}
          getItemKey={(v) => v.id}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => setModal({ mode: "create" })}
          emptyMessageKey="administrative-registry.vessel.emptyState"
        />
      </PageLayout>

      {modal ? (
        <CrudRecordModal<VesselFormValues>
          show
          mode={modal.mode}
          titleKeys={{
            create: "administrative-registry.vessel.newTitle",
            edit: "administrative-registry.vessel.editTitle",
            view: "administrative-registry.vessel.viewTitle",
          }}
          schema={PostApiVesselBody}
          fields={fields}
          defaultValues={toFormValues(modal.record)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-registry.vessel.confirm.deleteTitle")}
          message={t("administrative-registry.vessel.confirm.deleteMessage", {
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

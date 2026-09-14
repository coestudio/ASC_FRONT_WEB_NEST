import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";
import type { z } from "zod";

import {
  useDeleteApiVesselId,
  usePostApiVessel,
  usePutApiVesselId,
  getGetApiVesselQueryKey,
} from "@/api/generated/endpoints/vessel/vessel";
import { PostApiVesselBody } from "@/api/generated/zod/vessel/vessel.zod";
import type { VesselDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { vesselListQueryOptions } from "@/lib/queries/vessel";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/vessel/")({
  head: () => ({ meta: [{ title: "Navio — ASC" }] }),
  component: VesselRegistryPage,
});

// Create/edit usam o mesmo schema gerado (`VesselCreate`/`VesselUpdate` têm
// exatamente o mesmo shape) — zero Zod à mão (RF2/CA2 da SPEC-04).
type VesselFormValues = z.infer<typeof PostApiVesselBody>;

function toFormValues(record?: VesselDTO): VesselFormValues {
  return { name: record?.name ?? "" };
}

function VesselRegistryPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: VesselDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VesselDTO | null>(null);

  const listQueryOptions = vesselListQueryOptions({
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
    { type: "InputText", fieldName: "name", label: t("administrative-registry.vessel.formName") },
  ];

  const columns: CrudColumn<VesselDTO>[] = [
    { key: "name", headerKey: "administrative-registry.vessel.colName", render: (v) => v.name },
    {
      key: "createdAt",
      headerKey: "administrative-registry.vessel.colCreatedAt",
      render: (v) => new Date(v.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-registry.vessel.colActions",
      render: (v) => (
        <CrudRowActions
          onEdit={() => setModal({ mode: "edit", record: v })}
          onDelete={() => setPendingDelete(v)}
        />
      ),
    },
  ];

  const handleSubmit = async (values: VesselFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.vessel.toastCreated"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.vessel.toastUpdated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.vessel.toastError"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.vessel.toastDeleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.vessel.toastError"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <CrudListPage
        titleKey="administrative-registry.vessel.title"
        descriptionKey="administrative-registry.vessel.description"
        queryOptions={listQueryOptions}
        columns={columns}
        renderCard={(v) => (
          <Card>
            <Card.Body>
              <Card.Title className="h6">{v.name}</Card.Title>
              <div className="small text-body-secondary mb-2">
                {new Date(v.createdAt).toLocaleDateString(locale)}
              </div>
              <CrudRowActions
                onEdit={() => setModal({ mode: "edit", record: v })}
                onDelete={() => setPendingDelete(v)}
              />
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
          title={t("administrative-registry.vessel.confirmDeleteTitle")}
          message={t("administrative-registry.vessel.confirmDeleteMessage", {
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

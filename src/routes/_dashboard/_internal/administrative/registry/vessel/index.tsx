import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "react-bootstrap";
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
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { useLocale, useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

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

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: VesselDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<VesselDTO | null>(null);

  const listQueryOptions = getGetApiVesselQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  const createMutation = usePostApiVessel();
  const updateMutation = usePutApiVesselId();
  const deleteMutation = useDeleteApiVesselId();

  const { submit, remove } = useCrudMutations<VesselFormValues, VesselDTO>({
    onCreate: (values) => createMutation.mutateAsync({ data: values }),
    onUpdate: (values, record) => updateMutation.mutateAsync({ id: record.id, data: values }),
    onDelete: (record) => deleteMutation.mutateAsync({ id: record.id }),
    invalidateKey: getGetApiVesselQueryKey(),
    messages: {
      created: "administrative-registry.vessel.toast.created",
      updated: "administrative-registry.vessel.toast.updated",
      deleted: "administrative-registry.vessel.toast.deleted",
      error: "administrative-registry.vessel.toast.error",
    },
  });

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
      align: "end",
      render: (v) => (
        <CrudRowActions
          onView={() => setModal({ mode: "view", record: v })}
          onEdit={() => setModal({ mode: "edit", record: v })}
          onDelete={() => setPendingDelete(v)}
        />
      ),
    },
  ];

  const handleSubmit = async (values: VesselFormValues) => {
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

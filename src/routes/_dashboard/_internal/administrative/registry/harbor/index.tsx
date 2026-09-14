import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, ListGroup, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import type { z } from "zod";

import {
  useDeleteApiHarborId,
  usePostApiHarbor,
  usePutApiHarborId,
  getGetApiHarborQueryKey,
} from "@/api/generated/endpoints/harbor/harbor";
import { PostApiHarborBody } from "@/api/generated/zod/harbor/harbor.zod";
import type { HarborDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { harborListQueryOptions } from "@/lib/queries/harbor";
import { terminalListQueryOptions } from "@/lib/queries/terminal";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/harbor/")({
  head: () => ({ meta: [{ title: "Porto — ASC" }] }),
  component: HarborRegistryPage,
});

// Create/edit usam o mesmo schema gerado (`HarborCreate`/`HarborUpdate` têm
// exatamente o mesmo shape) — zero Zod à mão (RF2/CA2 da SPEC-04).
type HarborFormValues = z.infer<typeof PostApiHarborBody>;

function toFormValues(record?: HarborDTO): HarborFormValues {
  return {
    name: record?.name ?? "",
    address: {
      country: record?.address.country ?? "",
      postalCode: record?.address.postalCode ?? "",
      state: record?.address.state ?? "",
      neighborhood: record?.address.neighborhood ?? "",
      street: record?.address.street ?? "",
      number: record?.address.number ?? "",
      complement: record?.address.complement ?? "",
      city: record?.address.city ?? "",
    },
  };
}

/**
 * Terminais vinculados ao porto (RF4/D2, SPEC-04) — só leitura, via
 * `getApiTerminal({HarborId})`. Renderizado dentro do `extraContent` do
 * `CrudRecordModal`, montado só quando o modal de editar/ver está aberto
 * (nunca no SSR, já que `modal` começa `null` e só é setado por clique).
 */
function HarborTerminalsExtra({ harborId }: { harborId: string }) {
  const t = useT();
  const { data, isLoading } = useSsrSafeQuery(
    terminalListQueryOptions({ HarborId: harborId, Limit: 100 }),
  );
  const items = data?.items ?? [];

  return (
    <div className="mt-3">
      <h2 className="h6">{t("administrative-registry.harbor.relatedTerminalsTitle")}</h2>
      {isLoading ? (
        <Spinner animation="border" size="sm" />
      ) : items.length === 0 ? (
        <p className="text-body-secondary small mb-0">
          {t("administrative-registry.harbor.relatedTerminalsEmpty")}
        </p>
      ) : (
        <ListGroup>
          {items.map((te) => (
            <ListGroup.Item key={te.id}>{te.name}</ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
}

function HarborRegistryPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: HarborDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HarborDTO | null>(null);

  const listQueryOptions = harborListQueryOptions({
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
    { type: "InputText", fieldName: "name", label: t("administrative-registry.harbor.formName") },
    {
      type: "GroupAddress",
      fieldName: "address",
      label: t("administrative-registry.harbor.formAddress"),
    },
  ];

  const columns: CrudColumn<HarborDTO>[] = [
    { key: "name", headerKey: "administrative-registry.harbor.colName", render: (h) => h.name },
    {
      key: "address",
      headerKey: "administrative-registry.harbor.colAddress",
      render: (h) => h.address.fullAddress || "—",
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
        <CrudRowActions
          onEdit={() => setModal({ mode: "edit", record: h })}
          onDelete={() => setPendingDelete(h)}
        />
      ),
    },
  ];

  const handleSubmit = async (values: HarborFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.harbor.toastCreated"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.harbor.toastUpdated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.harbor.toastError"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.harbor.toastDeleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.harbor.toastError"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <CrudListPage
        titleKey="administrative-registry.harbor.title"
        descriptionKey="administrative-registry.harbor.description"
        queryOptions={listQueryOptions}
        columns={columns}
        renderCard={(h) => (
          <Card>
            <Card.Body>
              <Card.Title className="h6">{h.name}</Card.Title>
              <div className="small text-body-secondary mb-2">{h.address.fullAddress || "—"}</div>
              <CrudRowActions
                onEdit={() => setModal({ mode: "edit", record: h })}
                onDelete={() => setPendingDelete(h)}
              />
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
            modal.mode !== "create" && modal.record ? (
              <HarborTerminalsExtra harborId={modal.record.id} />
            ) : undefined
          }
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-registry.harbor.confirmDeleteTitle")}
          message={t("administrative-registry.harbor.confirmDeleteMessage", {
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

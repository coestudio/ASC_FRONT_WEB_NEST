import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiTerminalQueryOptions,
  getGetApiTerminalQueryKey,
  useDeleteApiTerminalId,
  usePostApiTerminal,
  usePutApiTerminalId,
} from "@/api/generated/endpoints/terminal/terminal";
import {
  getApiHarbor,
  getGetApiHarborIdQueryOptions,
} from "@/api/generated/endpoints/harbor/harbor";
import { PostApiTerminalBody } from "@/api/generated/zod/terminal/terminal.zod";
import type { TerminalDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useLocale, useT } from "@/lib/ui-prefs";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/terminal/")({
  head: () => ({ meta: [{ title: "Terminais — ASC" }] }),
  component: TerminalPage,
});

// Create/Update do Core têm o mesmo shape (`name`/`harborId`) — um schema
// só, reusado nos dois modos (regra 2 do AGENTS.md: zero Zod escrito à mão).
type TerminalFormValues = z.infer<typeof PostApiTerminalBody>;

function toFormValues(record?: TerminalDTO): TerminalFormValues {
  return { name: record?.name ?? "", harborId: record?.harborId ?? "" };
}

/** Nome do porto na coluna da lista — `TerminalDTO` só tem `harborId` (RF4/§8 da SPEC-04), sem o nome embutido. */
function HarborNameCell({ harborId }: { harborId: string }) {
  const { data } = useSsrSafeQuery(getGetApiHarborIdQueryOptions(harborId));
  return <>{data?.name ?? harborId}</>;
}

function TerminalPage() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: TerminalDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TerminalDTO | null>(null);

  const listQueryOptions = getGetApiTerminalQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  // Rótulo já resolvido do porto selecionado (edição/detalhe) — o
  // `SelectAsync` só busca opções por digitação, não tem o nome de quem já
  // está selecionado antes do usuário digitar de novo (SPEC-SHARE-01).
  const { data: selectedHarbor } = useSsrSafeQuery(
    getGetApiHarborIdQueryOptions(modal?.record?.harborId ?? "", {
      query: { enabled: !!modal?.record?.harborId },
    }),
  );

  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: getGetApiTerminalQueryKey() });

  const createMutation = usePostApiTerminal();
  const updateMutation = usePutApiTerminalId();
  const deleteMutation = useDeleteApiTerminalId();

  const fields: LayoutField[] = [
    {
      type: "InputText",
      fieldName: "name",
      label: t("administrative-registry.terminal.form.name"),
      col: { md: 6 },
    },
    {
      type: "SelectAsync",
      fieldName: "harborId",
      label: t("administrative-registry.terminal.form.harbor"),
      col: { md: 6 },
      config: {
        selectedLabel: selectedHarbor?.name,
        fetchOptions: (search) =>
          getApiHarbor({ Search: search, Limit: 20 }).then((res) =>
            res.items.map((h) => ({ value: h.id, label: h.name })),
          ),
      },
    },
  ];

  const columns: CrudColumn<TerminalDTO>[] = [
    {
      key: "name",
      headerKey: "administrative-registry.terminal.colName",
      render: (r) => r.name,
    },
    {
      key: "harbor",
      headerKey: "administrative-registry.terminal.colHarbor",
      render: (r) => <HarborNameCell harborId={r.harborId} />,
    },
    {
      key: "createdAt",
      headerKey: "administrative-registry.terminal.colCreatedAt",
      render: (r) => new Date(r.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-registry.terminal.colActions",
      render: (r) => (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setModal({ mode: "view", record: r })}
          >
            <i className="bi bi-eye" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            onClick={() => setModal({ mode: "edit", record: r })}
          >
            <i className="bi bi-pencil" aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={() => setPendingDelete(r)}
          >
            <i className="bi bi-trash" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  const handleSubmit = async (values: TerminalFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.terminal.toast.created"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.terminal.toast.updated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.terminal.toast.error"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.terminal.toast.deleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.terminal.toast.error"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageLayout density="wide">
        <CrudListPage
          titleKey="administrative-registry.terminal.title"
          descriptionKey="administrative-registry.terminal.description"
          queryOptions={listQueryOptions}
          columns={columns}
          renderCard={(r) => (
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-0">{r.name}</Card.Title>
                <Card.Subtitle className="text-body-secondary small mt-1">
                  <HarborNameCell harborId={r.harborId} />
                </Card.Subtitle>
              </Card.Body>
            </Card>
          )}
          getItemKey={(r) => r.id}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onCreate={() => setModal({ mode: "create" })}
          emptyMessageKey="administrative-registry.terminal.emptyState"
        />
      </PageLayout>

      {modal ? (
        <CrudRecordModal<TerminalFormValues>
          show
          mode={modal.mode}
          titleKeys={{
            create: "administrative-registry.terminal.newTitle",
            edit: "administrative-registry.terminal.editTitle",
            view: "administrative-registry.terminal.viewTitle",
          }}
          schema={PostApiTerminalBody}
          fields={fields}
          defaultValues={toFormValues(modal.record)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-registry.terminal.confirm.deleteTitle")}
          message={t("administrative-registry.terminal.confirm.deleteMessage", {
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

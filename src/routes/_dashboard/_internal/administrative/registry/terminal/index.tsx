import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "react-bootstrap";
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
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { LoadingState } from "@/components/ui/loading-state";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { useMounted } from "@/hooks/useMounted";
import { useLocale, useT } from "@/lib/ui-prefs";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

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

/**
 * Gate de montagem (SPEC-10 §14 / SPEC-18 `useMounted`): `selectedHarbor`
 * abaixo usa `useSsrSafeQuery` fora do `CrudListPage` — sem esse gate o
 * hook existe na árvore durante o SSR e a integração de streaming pode
 * tentar buscá-lo mesmo com `enabled: false` (mesma causa raiz do bug
 * original de `admin/access`, SPEC-10 §13). `TerminalPageBody` só monta
 * depois de `mounted = true` (nunca roda no servidor).
 */
function TerminalPage() {
  const mounted = useMounted();

  return mounted ? (
    <TerminalPageBody />
  ) : (
    <PageLayout density="wide">
      <LoadingState variant="inline" />
    </PageLayout>
  );
}

function TerminalPageBody() {
  const t = useT();
  const locale = useLocale();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: TerminalDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TerminalDTO | null>(null);

  const listQueryOptions = getGetApiTerminalQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    Sort: sort,
  });

  // Rótulo já resolvido do porto selecionado (edição/detalhe) — o
  // `SelectAsync` só busca opções por digitação, não tem o nome de quem já
  // está selecionado antes do usuário digitar de novo (SPEC-SHARE-01).
  const { data: selectedHarbor } = useSsrSafeQuery(
    getGetApiHarborIdQueryOptions(modal?.record?.harborId ?? "", {
      query: { enabled: !!modal?.record?.harborId },
    }),
  );

  const createMutation = usePostApiTerminal();
  const updateMutation = usePutApiTerminalId();
  const deleteMutation = useDeleteApiTerminalId();

  const { submit, remove } = useCrudMutations<TerminalFormValues, TerminalDTO>({
    onCreate: (values) => createMutation.mutateAsync({ data: values }),
    onUpdate: (values, record) => updateMutation.mutateAsync({ id: record.id, data: values }),
    onDelete: (record) => deleteMutation.mutateAsync({ id: record.id }),
    invalidateKey: getGetApiTerminalQueryKey(),
    messages: {
      created: "administrative-registry.terminal.toast.created",
      updated: "administrative-registry.terminal.toast.updated",
      deleted: "administrative-registry.terminal.toast.deleted",
      error: "administrative-registry.terminal.toast.error",
    },
  });

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
      sortKey: "name",
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
      sortKey: "createdAt",
      render: (r) => new Date(r.createdAt).toLocaleDateString(locale),
    },
  ];

  const handleSubmit = async (values: TerminalFormValues) => {
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
          rowActions={(r, ctl) => (
            <CrudRowActions
              show={ctl.show}
              position={ctl.position}
              onToggle={ctl.onToggle}
              onView={() => setModal({ mode: "view", record: r })}
              onEdit={() => setModal({ mode: "edit", record: r })}
              onDelete={() => setPendingDelete(r)}
            />
          )}
          onRowOpen={(r) => setModal({ mode: "view", record: r })}
          onRowEdit={(r) => setModal({ mode: "edit", record: r })}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          sort={sort}
          onSortChange={setSort}
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
          onDelete={modal.record ? () => setPendingDelete(modal.record as TerminalDTO) : undefined}
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

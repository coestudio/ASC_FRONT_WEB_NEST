import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import type { z } from "zod";

import {
  useDeleteApiTerminalId,
  usePostApiTerminal,
  usePutApiTerminalId,
  getGetApiTerminalQueryKey,
} from "@/api/generated/endpoints/terminal/terminal";
import { PostApiTerminalBody } from "@/api/generated/zod/terminal/terminal.zod";
import type { TerminalDTO } from "@/api/generated/model";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { CrudRowActions } from "@/components/crud/crud-row-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import { terminalListQueryOptions } from "@/lib/queries/terminal";
import { harborListQueryOptions } from "@/lib/queries/harbor";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 20;
// Limite alto pra popular o `InputSelect` de porto sem paginação própria —
// não existe endpoint "lista completa sem paginação" no Core; cadastro de
// porto é pequeno (dezenas, não milhares), então isso é suficiente pra
// nesta SPEC (RF4/§8).
const HARBOR_OPTIONS_LIMIT = 200;

export const Route = createFileRoute("/_dashboard/_internal/administrative/registry/terminal/")({
  head: () => ({ meta: [{ title: "Terminal — ASC" }] }),
  component: TerminalRegistryPage,
});

// Create/edit usam o mesmo schema gerado (`TerminalCreate`/`TerminalUpdate`
// têm exatamente o mesmo shape) — zero Zod à mão (RF2/CA2 da SPEC-04).
type TerminalFormValues = z.infer<typeof PostApiTerminalBody>;

function toFormValues(record?: TerminalDTO): TerminalFormValues {
  return { name: record?.name ?? "", harborId: record?.harborId ?? "" };
}

/**
 * Gate de montagem: o lookup de portos pro `InputSelect` usa
 * `useSsrSafeQuery` fora do `CrudListPage` (que já se protege por conta
 * própria) — pra esse hook nunca existir durante o SSR (SPEC-10, mesmo
 * padrão de `admin/access`), o conteúdo real só monta depois que o
 * componente confirma que está rodando no client.
 */
function TerminalRegistryPage() {
  const t = useT();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div>
        <h1 className="h4 mb-3">{t("administrative-registry.terminal.title")}</h1>
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      </div>
    );
  }

  return <TerminalRegistryContent />;
}

function TerminalRegistryContent() {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: TerminalDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TerminalDTO | null>(null);

  const listQueryOptions = terminalListQueryOptions({
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  // Lookup de portos: popula o `InputSelect` do form (RF4/§8) e a coluna
  // "Porto" da lista (nome resolvido por id).
  const { data: harborList } = useSsrSafeQuery(
    harborListQueryOptions({ Limit: HARBOR_OPTIONS_LIMIT }),
  );
  const harborNameById = useMemo(() => {
    const map = new Map<string, string>();
    (harborList?.items ?? []).forEach((h) => map.set(h.id, h.name));
    return map;
  }, [harborList]);
  const harborOptions = useMemo(
    () => (harborList?.items ?? []).map((h) => ({ value: h.id, label: h.name })),
    [harborList],
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
      label: t("administrative-registry.terminal.formName"),
      col: { md: 6 },
    },
    {
      type: "InputSelect",
      fieldName: "harborId",
      label: t("administrative-registry.terminal.formHarbor"),
      placeholder: t("administrative-registry.terminal.formHarborPlaceholder"),
      col: { md: 6 },
      config: { options: harborOptions },
    },
  ];

  const columns: CrudColumn<TerminalDTO>[] = [
    { key: "name", headerKey: "administrative-registry.terminal.colName", render: (te) => te.name },
    {
      key: "harbor",
      headerKey: "administrative-registry.terminal.colHarbor",
      render: (te) => harborNameById.get(te.harborId) ?? "—",
    },
    {
      key: "createdAt",
      headerKey: "administrative-registry.terminal.colCreatedAt",
      render: (te) => new Date(te.createdAt).toLocaleDateString(locale),
    },
    {
      key: "actions",
      headerKey: "administrative-registry.terminal.colActions",
      render: (te) => (
        <CrudRowActions
          onEdit={() => setModal({ mode: "edit", record: te })}
          onDelete={() => setPendingDelete(te)}
        />
      ),
    },
  ];

  const handleSubmit = async (values: TerminalFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ data: values });
        toast.success(t("administrative-registry.terminal.toastCreated"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ id: modal.record.id, data: values });
        toast.success(t("administrative-registry.terminal.toastUpdated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-registry.terminal.toastError"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
      toast.success(t("administrative-registry.terminal.toastDeleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-registry.terminal.toastError"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div>
      <CrudListPage
        titleKey="administrative-registry.terminal.title"
        descriptionKey="administrative-registry.terminal.description"
        queryOptions={listQueryOptions}
        columns={columns}
        renderCard={(te) => (
          <Card>
            <Card.Body>
              <Card.Title className="h6">{te.name}</Card.Title>
              <div className="small text-body-secondary mb-2">
                {harborNameById.get(te.harborId) ?? "—"}
              </div>
              <CrudRowActions
                onEdit={() => setModal({ mode: "edit", record: te })}
                onDelete={() => setPendingDelete(te)}
              />
            </Card.Body>
          </Card>
        )}
        getItemKey={(te) => te.id}
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
          title={t("administrative-registry.terminal.confirmDeleteTitle")}
          message={t("administrative-registry.terminal.confirmDeleteMessage", {
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

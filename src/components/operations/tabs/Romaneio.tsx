import { useState } from "react";
import { useForm, type FieldValues, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Row, Spinner } from "react-bootstrap";
import { Modal } from "@/components/ui/modal";
import { toast } from "react-toastify";
import { z, type ZodType } from "zod";

import {
  getGetApiOperationOperationIdRomaneioExportQueryKey,
  getGetApiOperationOperationIdRomaneioQueryKey,
  getGetApiOperationOperationIdRomaneioQueryOptions,
  usePostApiOperationOperationIdRomaneio,
  usePostApiOperationOperationIdRomaneioDeleteBatch,
  usePostApiOperationOperationIdRomaneioUpdateBatch,
  usePutApiOperationOperationIdRomaneioId,
} from "@/api/generated/endpoints/romaneio/romaneio";
import { axiosInstance } from "@/api/mutator";
import {
  PostApiOperationOperationIdRomaneioBody,
  PutApiOperationOperationIdRomaneioIdBody,
  PostApiOperationOperationIdRomaneioUpdateBatchBody,
} from "@/api/generated/zod/romaneio/romaneio.zod";
import type { RomaneioDTO } from "@/api/generated/model";
import {
  CrudListPage,
  type CrudColumn,
  type CrudSelection,
} from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { CrudBulkActions } from "@/components/crud/crud-bulk-actions";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ImportRomaneioModal } from "./RomaneioImportModal";
import { buildRomaneioFields, toFormValues, type RomaneioFormValues } from "./RomaneioForm";
import { InputText } from "@/layouts/Form/Fields/Index";
import { useCrudMutations } from "@/hooks/useCrudMutations";
import { useT } from "@/lib/ui-prefs";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

/**
 * Aba Romaneio (SPEC-07-04) — CRUD de fardos da operação + import de
 * planilha em 2 etapas (analyze → revisão → apply, RF2). Montada pelo shell
 * de `/administrative/operations/$id` (SPEC-07-02) via estado local de aba,
 * sem rota própria.
 */
export function Romaneio({ operationId }: { operationId: string }) {
  const t = useT();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: RomaneioDTO } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Filtro "Estufado" (RF1, §3.6) — `null` = Todos, sem parâmetro `IsStuffed`.
  const [isStuffedFilter, setIsStuffedFilter] = useState<boolean | null>(null);
  // Ordenação clicável por NF/Lote (RF5, §3.2) — valor cru de `Sort`.
  const [sort, setSort] = useState<string | undefined>(undefined);
  // Seleção em massa (RF2, §3.1) — linha estufada nunca entra aqui.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const listQueryOptions = getGetApiOperationOperationIdRomaneioQueryOptions(operationId, {
    Search: search || undefined,
    IsStuffed: isStuffedFilter ?? undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
    Sort: sort,
  });

  const createMutation = usePostApiOperationOperationIdRomaneio();
  const updateMutation = usePutApiOperationOperationIdRomaneioId();
  const deleteBatchMutation = usePostApiOperationOperationIdRomaneioDeleteBatch();
  const updateBatchMutation = usePostApiOperationOperationIdRomaneioUpdateBatch();

  const { submit } = useCrudMutations<RomaneioFormValues, RomaneioDTO>({
    onCreate: (values) => createMutation.mutateAsync({ operationId, data: values }),
    onUpdate: (values, record) =>
      updateMutation.mutateAsync({ operationId, id: record.id, data: values }),
    invalidateKey: getGetApiOperationOperationIdRomaneioQueryKey(operationId),
    messages: {
      created: "administrative-operations.romaneio.toast.created",
      updated: "administrative-operations.romaneio.toast.updated",
      error: "administrative-operations.romaneio.toast.error",
    },
  });

  // `invalidateList` usado pelo wizard de import (`ImportRomaneioModal`) e
  // pelas ações em massa (§3.3), fora do fluxo create/update do
  // `useCrudMutations` — mesma `queryKey`, chamada direta (cada fluxo mostra
  // seu próprio toast de sucesso/erro).
  const queryClient = useQueryClient();
  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdRomaneioQueryKey(operationId),
    });

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selection: CrudSelection<RomaneioDTO> = {
    selectedIds,
    onToggle: toggleSelected,
    onToggleAll: (ids, checked) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        // `ids` já vem filtrado pelo `CrudListPage` (só os selecionáveis da
        // página atual) — aqui só marca/desmarca esse conjunto.
        ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
        return next;
      });
    },
    isDisabled: (r) => r.isStuffed === true,
  };

  const handleBulkDelete = async () => {
    try {
      await deleteBatchMutation.mutateAsync({
        operationId,
        data: { ids: Array.from(selectedIds) },
      });
      toast.success(t("administrative-operations.romaneio.bulkActions.toastDeleteSuccess"));
      setSelectedIds(new Set());
      invalidateList();
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const fields = buildRomaneioFields(t);

  const columns: CrudColumn<RomaneioDTO>[] = [
    {
      key: "itemIdentifier",
      headerKey: "administrative-operations.romaneio.colItemIdentifier",
      render: (r) => r.itemIdentifier,
    },
    {
      key: "itemCode",
      headerKey: "administrative-operations.romaneio.colItemCode",
      render: (r) => r.itemCode,
    },
    {
      key: "notaFiscal",
      headerKey: "administrative-operations.romaneio.colNotaFiscal",
      sortKey: "notaFiscal",
      render: (r) => r.notaFiscal ?? "—",
    },
    {
      key: "instruction",
      headerKey: "administrative-operations.romaneio.colInstruction",
      render: (r) => r.instruction || "—",
    },
    {
      key: "lote",
      headerKey: "administrative-operations.romaneio.colLote",
      sortKey: "lote",
      render: (r) => r.lote,
    },
    {
      key: "pilha",
      headerKey: "administrative-operations.romaneio.colPilha",
      render: (r) => r.pilha || "—",
    },
    {
      key: "pesoTara",
      headerKey: "administrative-operations.romaneio.colPesoTara",
      align: "end",
      render: (r) => (r.pesoTara != null ? String(r.pesoTara) : "—"),
    },
    {
      key: "peso",
      headerKey: "administrative-operations.romaneio.colPeso",
      align: "end",
      render: (r) => (r.peso != null ? String(r.peso) : "—"),
    },
    {
      key: "pesoBruto",
      headerKey: "administrative-operations.romaneio.colPesoBruto",
      align: "end",
      render: (r) => (r.pesoBruto != null ? String(r.pesoBruto) : "—"),
    },
    {
      key: "contrato",
      headerKey: "administrative-operations.romaneio.colContrato",
      render: (r) => r.contrato || "—",
    },
    {
      key: "isStuffed",
      headerKey: "administrative-operations.romaneio.colIsStuffed",
      align: "center",
      // SPEC-94, item 12: coluna do tamanho do ícone, não da palavra "Estufado".
      width: "1%",
      render: (r) => (
        <i
          className={`bi ${r.isStuffed ? "bi-check-circle-fill text-success" : "bi-x-circle text-body-secondary"}`}
          title={t(
            r.isStuffed
              ? "administrative-operations.romaneio.isStuffedYes"
              : "administrative-operations.romaneio.isStuffedNo",
          )}
          aria-label={t(
            r.isStuffed
              ? "administrative-operations.romaneio.isStuffedYes"
              : "administrative-operations.romaneio.isStuffedNo",
          )}
        />
      ),
    },
  ];

  const handleSubmit = async (values: RomaneioFormValues) => {
    if (!modal) return;
    const ok = await submit(modal.mode as "create" | "edit", values, modal.record);
    if (ok) setModal(null);
  };

  /**
   * Dispara o download do romaneio exportado (RF1). O endpoint gerado
   * (`getApiOperationOperationIdRomaneioExport`) passa pelo `apiRequest`
   * genérico, que só devolve o corpo já desembrulhado — sem acesso aos
   * headers da resposta (`Content-Disposition`, necessário pro nome do
   * arquivo) nem controle de `responseType`. Por isso a chamada aqui usa
   * `axiosInstance` (mesmo transporte do mutator, exportado por ele pra
   * esse tipo de caso) direto, reaproveitando a URL do endpoint gerado
   * (`getGetApiOperationOperationIdRomaneioExportQueryKey`) em vez de
   * duplicar o path à mão.
   */
  const handleExport = async () => {
    setExporting(true);
    try {
      const [url] = getGetApiOperationOperationIdRomaneioExportQueryKey(operationId);
      const response = await axiosInstance.get<Blob>(url, { responseType: "blob" });

      // Nome do arquivo: usa o `Content-Disposition` do Core quando vem
      // (RF1); sem ele, cai num default com o id da operação (R1 da SPEC —
      // formato exato do Core não confirmado até a implementação).
      const disposition = (response.headers as Record<string, string>)["content-disposition"];
      const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const filename = match ? decodeURIComponent(match[1]) : `romaneio-${operationId}.xlsx`;

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      toast.success(t("administrative-operations.romaneio.export.toast.success"));
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro da chamada HTTP —
      // nada a fazer aqui (manipulação de DOM depois do GET raramente lança)
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <CrudListPage
        titleKey="administrative-operations.romaneio.title"
        descriptionKey="administrative-operations.romaneio.description"
        headerActions={
          <>
            <Button variant="outline-primary" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Spinner size="sm" animation="border" className="me-1" />
              ) : (
                <i className="bi bi-download me-1" aria-hidden />
              )}
              {t("administrative-operations.romaneio.export.button")}
            </Button>
            <Button variant="outline-primary" size="sm" onClick={() => setImportOpen(true)}>
              <i className="bi bi-file-earmark-spreadsheet me-1" aria-hidden />
              {t("administrative-operations.romaneio.import.button")}
            </Button>
          </>
        }
        queryOptions={listQueryOptions}
        columns={columns}
        spreadsheetVariant
        // SPEC-97 (RF7): migra a barra de ação em massa pra `belowSearch`
        // (mesma posição que `Operational.tsx` já usa) — sempre visível,
        // botões desabilitados (não escondidos) sem seleção.
        belowSearch={
          <div className="d-flex align-items-center gap-2 flex-wrap mb-3 p-2 border rounded bg-body-tertiary">
            <span className="fw-semibold">
              {t("administrative-operations.romaneio.bulkActions.selectedCount", {
                count: String(selectedIds.size),
              })}
            </span>
            <Button
              variant="outline-primary"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkEditOpen(true)}
            >
              <i className="bi bi-pencil me-1" aria-hidden />
              {t("administrative-operations.romaneio.bulkActions.editNfLote")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkDeleteOpen(true)}
            >
              <i className="bi bi-trash me-1" aria-hidden />
              {t("administrative-operations.romaneio.bulkActions.deleteSelected")}
            </Button>
          </div>
        }
        selection={selection}
        // SPEC-97 (RF4): botão direito com ≥1 item selecionado abre o mesmo
        // menu de ações da barra acima — segundo ponto de entrada pros
        // mesmos handlers (`setBulkEditOpen`/`setBulkDeleteOpen`), nenhuma
        // lógica de negócio nova.
        bulkActions={(ctl) => (
          <CrudBulkActions
            show={ctl.show}
            position={ctl.position}
            onToggle={ctl.onToggle}
            actions={[
              {
                key: "edit",
                icon: "bi-pencil",
                label: t("administrative-operations.romaneio.bulkActions.editNfLote"),
                onClick: () => setBulkEditOpen(true),
              },
              {
                key: "delete",
                icon: "bi-trash",
                label: t("administrative-operations.romaneio.bulkActions.deleteSelected"),
                onClick: () => setBulkDeleteOpen(true),
                variant: "danger",
              },
            ]}
          />
        )}
        onRowSingleClick={(r) => {
          if (!selection.isDisabled?.(r)) selection.onToggle(r.id);
        }}
        onRowDoubleClick={(r) => {
          // Fardo estufado não edita — abre só a visualização (somente leitura).
          setModal({ mode: r.isStuffed ? "view" : "edit", record: r });
        }}
        sort={sort}
        onSortChange={setSort}
        renderCard={(r) => (
          <Card>
            <Card.Body>
              <Card.Title className="h6 mb-0">{r.itemIdentifier}</Card.Title>
              <Card.Subtitle className="text-body-secondary small mt-1">
                {r.itemCode} · {r.lote}
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
        filters={
          <Form.Select
            size="sm"
            style={{ width: "auto" }}
            aria-label={t("administrative-operations.romaneio.colIsStuffed")}
            value={isStuffedFilter === null ? "all" : isStuffedFilter ? "stuffed" : "notStuffed"}
            onChange={(e) => {
              const value = e.target.value;
              setIsStuffedFilter(value === "all" ? null : value === "stuffed");
              setPage(1);
            }}
          >
            <option value="all">
              {t("administrative-operations.romaneio.filterIsStuffed.all")}
            </option>
            <option value="stuffed">
              {t("administrative-operations.romaneio.filterIsStuffed.stuffed")}
            </option>
            <option value="notStuffed">
              {t("administrative-operations.romaneio.filterIsStuffed.notStuffed")}
            </option>
          </Form.Select>
        }
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onCreate={() => setModal({ mode: "create" })}
        emptyMessageKey="administrative-operations.romaneio.emptyState"
      />

      {modal ? (
        <CrudRecordModal<RomaneioFormValues>
          show
          mode={modal.mode}
          titleKeys={{
            create: "administrative-operations.romaneio.newTitle",
            edit: "administrative-operations.romaneio.editTitle",
            view: "administrative-operations.romaneio.viewTitle",
          }}
          // Core SPEC-53: Nota fiscal é obrigatória só no Create — editar fardo
          // antigo sem NF usa o schema do PUT (NF opcional).
          schema={
            modal.mode === "create"
              ? PostApiOperationOperationIdRomaneioBody
              : (PutApiOperationOperationIdRomaneioIdBody as unknown as typeof PostApiOperationOperationIdRomaneioBody)
          }
          fields={fields}
          defaultValues={toFormValues(modal.record)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      ) : null}

      {bulkDeleteOpen ? (
        <ConfirmationModal
          show
          title={t("administrative-operations.romaneio.bulkActions.confirmDeleteTitle")}
          message={t("administrative-operations.romaneio.bulkActions.confirmDelete", {
            count: String(selectedIds.size),
          })}
          variant="danger"
          onConfirm={handleBulkDelete}
          onCancel={() => setBulkDeleteOpen(false)}
        />
      ) : null}

      {bulkEditOpen ? (
        <RomaneioBulkEditModal
          operationId={operationId}
          selectedIds={selectedIds}
          mutation={updateBatchMutation}
          onApplied={() => {
            setSelectedIds(new Set());
            invalidateList();
          }}
          onClose={() => setBulkEditOpen(false)}
        />
      ) : null}

      {importOpen ? (
        <ImportRomaneioModal
          operationId={operationId}
          onClose={() => setImportOpen(false)}
          onApplied={invalidateList}
        />
      ) : null}
    </>
  );
}

type RomaneioBulkEditFormValues = z.infer<
  typeof PostApiOperationOperationIdRomaneioUpdateBatchBody
>;

/**
 * Normaliza `""` → `undefined` (não `null`) antes de validar — diferente do
 * `emptyStringsToNull` do `CrudRecordModal` (que usa `null` pra *limpar*
 * explicitamente um campo opcional num registro só). Aqui campo vazio
 * significa "não mexe" (RF4, §3.3): mandar `undefined` faz o schema
 * `.nullish()` aceitar sem violar o `min(1)` de `lote`, e o `update-batch`
 * do Core não recebe a chave (JSON.stringify descarta `undefined`).
 */
function emptyStringsToUndefined<V>(value: V): V {
  if (value === "") return undefined as unknown as V;
  if (Array.isArray(value)) {
    return value.map((item) => emptyStringsToUndefined(item)) as unknown as V;
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        emptyStringsToUndefined(val),
      ]),
    ) as V;
  }
  return value;
}

function withEmptyStringsAsUndefined<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  const resolver = zodResolver(schema as never) as unknown as Resolver<T>;
  return (values, context, options) => resolver(emptyStringsToUndefined(values), context, options);
}

/**
 * Modal de edição em massa de NF/Lote (RF4, §3.3) — só os campos preenchidos
 * são enviados ao `update-batch`; campo vazio não altera as linhas
 * selecionadas. `ids` é montado a partir da seleção corrente, não é um campo
 * editável do form (sem `Field` renderizado pra ele).
 */
function RomaneioBulkEditModal({
  operationId,
  selectedIds,
  mutation,
  onApplied,
  onClose,
}: {
  operationId: string;
  selectedIds: Set<string>;
  mutation: ReturnType<typeof usePostApiOperationOperationIdRomaneioUpdateBatch>;
  onApplied: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const methods = useForm<RomaneioBulkEditFormValues>({
    resolver: withEmptyStringsAsUndefined(PostApiOperationOperationIdRomaneioUpdateBatchBody),
    defaultValues: { ids: Array.from(selectedIds), notaFiscal: "", lote: "" },
  });

  const handleSubmit = methods.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({
        operationId,
        data: { ids: Array.from(selectedIds), notaFiscal: values.notaFiscal, lote: values.lote },
      });
      toast.success(t("administrative-operations.romaneio.bulkActions.toastSuccess"));
      onApplied();
      onClose();
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    }
  });

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header>
        <Modal.Title className="h5 mb-0">
          {t("administrative-operations.romaneio.bulkActions.editTitle")}
        </Modal.Title>
      </Modal.Header>
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <InputText<RomaneioBulkEditFormValues>
              methods={methods}
              fieldName="notaFiscal"
              label={t("administrative-operations.romaneio.bulkActions.fieldNotaFiscal")}
              md={6}
            />
            <InputText<RomaneioBulkEditFormValues>
              methods={methods}
              fieldName="lote"
              label={t("administrative-operations.romaneio.bulkActions.fieldLote")}
              md={6}
            />
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-primary" onClick={onClose}>
            {t("crud.recordModal.cancel")}
          </Button>
          <Button type="submit" variant="primary" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : (
              <i className="bi bi-check-lg me-1" aria-hidden />
            )}
            {t("crud.recordModal.save")}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

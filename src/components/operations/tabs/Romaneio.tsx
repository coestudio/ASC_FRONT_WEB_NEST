import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Form, Modal, Row, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  getGetApiOperationOperationIdRomaneioQueryKey,
  getGetApiOperationOperationIdRomaneioQueryOptions,
  useDeleteApiOperationOperationIdRomaneioId,
  usePostApiOperationOperationIdRomaneio,
  usePostApiOperationOperationIdRomaneioImportAnalyze,
  usePostApiOperationOperationIdRomaneioImportApply,
  usePutApiOperationOperationIdRomaneioId,
} from "@/api/generated/endpoints/romaneio/romaneio";
import {
  PostApiOperationOperationIdRomaneioBody,
  PostApiOperationOperationIdRomaneioImportAnalyzeBody,
  PostApiOperationOperationIdRomaneioImportApplyBody,
} from "@/api/generated/zod/romaneio/romaneio.zod";
import type {
  RomaneioDTO,
  RomaneioImportAnalysisDTO,
  RomaneioImportConflictDTO,
  RomaneioImportForeignDTO,
  RomaneioImportInvalidDTO,
  RomaneioImportRowDTO,
} from "@/api/generated/model";
import { resolveRomaneioSourceLabel } from "@/api/generated/static/romaneioSourceOptions";
import { CrudListPage, type CrudColumn } from "@/components/crud/crud-list-page";
import { CrudRecordModal, type CrudRecordMode } from "@/components/crud/crud-record-modal";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { InputFileSingle } from "@/layouts/Form/Fields/Index";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import type { TranslationKey } from "@/i18n/translate";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 20;

/**
 * Create/Update do Core têm o mesmo shape — reusa o schema do POST nos dois
 * modos do `CrudRecordModal` (regra 2 do AGENTS.md: zero Zod escrito à mão),
 * mesmo padrão de `VesselPage`/`ContainerPage`.
 */
type RomaneioFormValues = z.infer<typeof PostApiOperationOperationIdRomaneioBody>;

function toFormValues(record?: RomaneioDTO): RomaneioFormValues {
  return {
    itemIdentifier: record?.itemIdentifier ?? "",
    itemCode: record?.itemCode ?? "",
    tipo: record?.tipo ?? "",
    contrato: record?.contrato ?? "",
    peso: record?.peso != null ? String(record.peso) : "",
    pesoTara: record?.pesoTara != null ? String(record.pesoTara) : "",
    pesoBruto: record?.pesoBruto != null ? String(record.pesoBruto) : "",
    instruction: record?.instruction ?? "",
    notaFiscal: record?.notaFiscal ?? "",
    lote: record?.lote ?? "",
    pilha: record?.pilha ?? "",
  };
}

/** Rótulo (chave i18n) de cada campo comparável do import — RN2 do Core
 * (`RomaneioImportClassifier`), os mesmos 10 nomes usados em `diff`. */
const DIFF_FIELD_LABELS: Record<string, TranslationKey> = {
  itemCode: "administrative-operations.romaneio.import.fields.itemCode",
  tipo: "administrative-operations.romaneio.import.fields.tipo",
  contrato: "administrative-operations.romaneio.import.fields.contrato",
  peso: "administrative-operations.romaneio.import.fields.peso",
  pesoTara: "administrative-operations.romaneio.import.fields.pesoTara",
  pesoBruto: "administrative-operations.romaneio.import.fields.pesoBruto",
  instruction: "administrative-operations.romaneio.import.fields.instruction",
  notaFiscal: "administrative-operations.romaneio.import.fields.notaFiscal",
  lote: "administrative-operations.romaneio.import.fields.lote",
  pilha: "administrative-operations.romaneio.import.fields.pilha",
};

/**
 * Aba Romaneio (SPEC-07-04) — CRUD de fardos da operação + import de
 * planilha em 2 etapas (analyze → revisão → apply, RF2). Montada pelo shell
 * de `/administrative/operations/$id` (SPEC-07-02) via estado local de aba,
 * sem rota própria.
 */
export function Romaneio({ operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: CrudRecordMode; record?: RomaneioDTO } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<RomaneioDTO | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const listQueryOptions = getGetApiOperationOperationIdRomaneioQueryOptions(operationId, {
    Search: search || undefined,
    Offset: (page - 1) * PAGE_SIZE,
    Limit: PAGE_SIZE,
  });

  const invalidateList = () =>
    queryClient.invalidateQueries({
      queryKey: getGetApiOperationOperationIdRomaneioQueryKey(operationId),
    });

  const createMutation = usePostApiOperationOperationIdRomaneio();
  const updateMutation = usePutApiOperationOperationIdRomaneioId();
  const deleteMutation = useDeleteApiOperationOperationIdRomaneioId();

  const fields: LayoutField[] = [
    {
      type: "InputText",
      fieldName: "itemIdentifier",
      label: t("administrative-operations.romaneio.form.itemIdentifier"),
      col: { md: 6 },
    },
    {
      type: "InputText",
      fieldName: "itemCode",
      label: t("administrative-operations.romaneio.form.itemCode"),
      col: { md: 6 },
    },
    {
      type: "InputText",
      fieldName: "lote",
      label: t("administrative-operations.romaneio.form.lote"),
      col: { md: 4 },
    },
    {
      type: "InputText",
      fieldName: "tipo",
      label: t("administrative-operations.romaneio.form.tipo"),
      col: { md: 4 },
    },
    {
      type: "InputText",
      fieldName: "contrato",
      label: t("administrative-operations.romaneio.form.contrato"),
      col: { md: 4 },
    },
    {
      type: "InputText",
      fieldName: "peso",
      label: t("administrative-operations.romaneio.form.peso"),
      col: { md: 4 },
    },
    {
      type: "InputText",
      fieldName: "pesoTara",
      label: t("administrative-operations.romaneio.form.pesoTara"),
      col: { md: 4 },
    },
    {
      type: "InputText",
      fieldName: "pesoBruto",
      label: t("administrative-operations.romaneio.form.pesoBruto"),
      col: { md: 4 },
    },
    {
      type: "InputText",
      fieldName: "instruction",
      label: t("administrative-operations.romaneio.form.instruction"),
      col: { md: 6 },
    },
    {
      type: "InputText",
      fieldName: "notaFiscal",
      label: t("administrative-operations.romaneio.form.notaFiscal"),
      col: { md: 6 },
    },
    {
      type: "InputText",
      fieldName: "pilha",
      label: t("administrative-operations.romaneio.form.pilha"),
      col: { md: 6 },
    },
  ];

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
      key: "lote",
      headerKey: "administrative-operations.romaneio.colLote",
      render: (r) => r.lote,
    },
    {
      key: "peso",
      headerKey: "administrative-operations.romaneio.colPeso",
      render: (r) => (r.peso != null ? String(r.peso) : "—"),
    },
    {
      key: "source",
      headerKey: "administrative-operations.romaneio.colSource",
      render: (r) => (
        <span className="badge text-bg-secondary">
          {r.source ? resolveRomaneioSourceLabel(r.source, locale) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      headerKey: "administrative-operations.romaneio.colActions",
      render: (r) => (
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
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

  const handleSubmit = async (values: RomaneioFormValues) => {
    try {
      if (modal?.mode === "create") {
        await createMutation.mutateAsync({ operationId, data: values });
        toast.success(t("administrative-operations.romaneio.toast.created"));
      } else if (modal?.mode === "edit" && modal.record) {
        await updateMutation.mutateAsync({ operationId, id: modal.record.id, data: values });
        toast.success(t("administrative-operations.romaneio.toast.updated"));
      }
      invalidateList();
      setModal(null);
    } catch {
      toast.error(t("administrative-operations.romaneio.toast.error"));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync({ operationId, id: pendingDelete.id });
      toast.success(t("administrative-operations.romaneio.toast.deleted"));
      invalidateList();
    } catch {
      toast.error(t("administrative-operations.romaneio.toast.error"));
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-end mb-2">
        <Button variant="outline-primary" size="sm" onClick={() => setImportOpen(true)}>
          <i className="bi bi-file-earmark-spreadsheet me-1" aria-hidden />
          {t("administrative-operations.romaneio.import.button")}
        </Button>
      </div>

      <CrudListPage
        titleKey="administrative-operations.romaneio.title"
        descriptionKey="administrative-operations.romaneio.description"
        queryOptions={listQueryOptions}
        columns={columns}
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
          schema={PostApiOperationOperationIdRomaneioBody}
          fields={fields}
          defaultValues={toFormValues(modal.record)}
          onSubmit={handleSubmit}
          onClose={() => setModal(null)}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmationModal
          show
          title={t("administrative-operations.romaneio.confirm.deleteTitle")}
          message={t("administrative-operations.romaneio.confirm.deleteMessage", {
            name: pendingDelete.itemIdentifier,
          })}
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
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

type AnalyzeFormValues = z.infer<typeof PostApiOperationOperationIdRomaneioImportAnalyzeBody>;

/**
 * Wizard de import: etapa 1 (`analyze`, upload real via `InputFileSingle` —
 * SPEC-SHARE-01/CA4) → etapa 2 (revisão dos grupos classificados pelo Core,
 * RF2) → `apply`. A seleção da revisão (quais fardos criar/excluir, quais
 * campos de conflito aceitar) é estado local simples — não é um campo de DTO
 * individual, e sim uma lista dinâmica montada a partir da resposta do
 * `analyze`; o payload final de fato enviado ao Core (`RomaneioImportApply`)
 * passa pelo schema gerado (`.parse`) antes do POST de `apply`, então a regra
 * "zero Zod à mão" continua valendo — nenhuma validação escrita manualmente,
 * só a montagem do array a partir das checkboxes.
 */
function ImportRomaneioModal({
  operationId,
  onClose,
  onApplied,
}: {
  operationId: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const t = useT();
  const [analysis, setAnalysis] = useState<RomaneioImportAnalysisDTO | null>(null);
  const [selectedNew, setSelectedNew] = useState<Set<string>>(new Set());
  const [selectedMissing, setSelectedMissing] = useState<Set<string>>(new Set());
  const [conflictFields, setConflictFields] = useState<Record<string, Set<string>>>({});

  const analyzeMutation = usePostApiOperationOperationIdRomaneioImportAnalyze();
  const applyMutation = usePostApiOperationOperationIdRomaneioImportApply();

  const analyzeMethods = useForm<AnalyzeFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdRomaneioImportAnalyzeBody),
    defaultValues: {},
  });
  const file = analyzeMethods.watch("File");

  const handleAnalyze = analyzeMethods.handleSubmit(async (values) => {
    try {
      const result = await analyzeMutation.mutateAsync({ operationId, data: values });
      setAnalysis(result);
      // Default: cria todo fardo novo, aceita todo campo divergente, não
      // exclui nenhum ausente (ação destrutiva exige opt-in do usuário).
      setSelectedNew(new Set((result.new ?? []).map((r) => r.itemIdentifier ?? "")));
      setSelectedMissing(new Set());
      setConflictFields(
        Object.fromEntries(
          (result.conflicts ?? []).map((c) => [
            c.incoming?.itemIdentifier ?? "",
            new Set(c.diff ?? []),
          ]),
        ),
      );
    } catch {
      toast.error(t("administrative-operations.romaneio.import.toast.analyzeError"));
    }
  });

  const toggleNew = (id: string) =>
    setSelectedNew((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleMissing = (id: string) =>
    setSelectedMissing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleConflictField = (certificado: string, field: string) =>
    setConflictFields((prev) => {
      const current = new Set(prev[certificado] ?? []);
      if (current.has(field)) current.delete(field);
      else current.add(field);
      return { ...prev, [certificado]: current };
    });

  const handleApply = async () => {
    if (!analysis?.importId) return;
    const conflicts = Object.entries(conflictFields)
      .filter(([, set]) => set.size > 0)
      .map(([certificado, set]) => ({ certificado, fields: Array.from(set) }));

    try {
      const payload = PostApiOperationOperationIdRomaneioImportApplyBody.parse({
        importId: analysis.importId,
        createNew: Array.from(selectedNew),
        conflicts,
        deleteMissing: Array.from(selectedMissing),
      });
      const result = await applyMutation.mutateAsync({ operationId, data: payload });
      toast.success(
        t("administrative-operations.romaneio.import.toast.applySuccess", {
          created: String(result.created ?? 0),
          updated: String(result.updated ?? 0),
          deleted: String(result.deleted ?? 0),
        }),
      );
      onApplied();
      onClose();
    } catch {
      toast.error(t("administrative-operations.romaneio.import.toast.applyError"));
    }
  };

  const step: "upload" | "review" = analysis ? "review" : "upload";

  return (
    <Modal show onHide={onClose} centered size="xl" scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="h5 mb-0">
          {t("administrative-operations.romaneio.import.title")} —{" "}
          {step === "upload"
            ? t("administrative-operations.romaneio.import.stepUpload")
            : t("administrative-operations.romaneio.import.stepReview")}
        </Modal.Title>
      </Modal.Header>

      {step === "upload" ? (
        <Form noValidate onSubmit={handleAnalyze}>
          <Modal.Body>
            <Row>
              <InputFileSingle<AnalyzeFormValues>
                methods={analyzeMethods}
                fieldName="File"
                label={t("administrative-operations.romaneio.import.fileLabel")}
                accept=".xlsx,.csv"
                md={12}
              />
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={onClose}>
              {t("administrative-operations.romaneio.import.cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={!file || analyzeMutation.isPending}>
              {analyzeMutation.isPending ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  {t("administrative-operations.romaneio.import.analyzing")}
                </>
              ) : (
                t("administrative-operations.romaneio.import.analyze")
              )}
            </Button>
          </Modal.Footer>
        </Form>
      ) : (
        <>
          <Modal.Body>
            <ImportSummary analysis={analysis!} />

            <ImportNewSection
              rows={analysis!.new ?? []}
              selected={selectedNew}
              onToggle={toggleNew}
            />
            <ImportMissingSection
              rows={analysis!.missing ?? []}
              selected={selectedMissing}
              onToggle={toggleMissing}
            />
            <ImportConflictsSection
              rows={analysis!.conflicts ?? []}
              selectedFields={conflictFields}
              onToggleField={toggleConflictField}
            />
            <ImportForeignSection rows={analysis!.foreign ?? []} />
            <ImportInvalidSection rows={analysis!.invalid ?? []} />
            <ImportDuplicatedSection rows={analysis!.duplicated ?? []} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-primary" onClick={() => setAnalysis(null)}>
              {t("administrative-operations.romaneio.import.back")}
            </Button>
            <Button variant="outline-primary" onClick={onClose}>
              {t("administrative-operations.romaneio.import.cancel")}
            </Button>
            <Button variant="primary" onClick={handleApply} disabled={applyMutation.isPending}>
              {applyMutation.isPending ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  {t("administrative-operations.romaneio.import.applying")}
                </>
              ) : (
                t("administrative-operations.romaneio.import.apply")
              )}
            </Button>
          </Modal.Footer>
        </>
      )}
    </Modal>
  );
}

function ImportSummary({ analysis }: { analysis: RomaneioImportAnalysisDTO }) {
  const t = useT();
  const summary = analysis.summary;
  if (!summary) return null;

  const items: { key: TranslationKey; value: number | string | undefined }[] = [
    {
      key: "administrative-operations.romaneio.import.summary.totalDataRows",
      value: summary.totalDataRows,
    },
    { key: "administrative-operations.romaneio.import.summary.new", value: summary.new },
    { key: "administrative-operations.romaneio.import.summary.missing", value: summary.missing },
    {
      key: "administrative-operations.romaneio.import.summary.conflicts",
      value: summary.conflicts,
    },
    { key: "administrative-operations.romaneio.import.summary.foreign", value: summary.foreign },
    { key: "administrative-operations.romaneio.import.summary.invalid", value: summary.invalid },
    {
      key: "administrative-operations.romaneio.import.summary.duplicated",
      value: summary.duplicated,
    },
    {
      key: "administrative-operations.romaneio.import.summary.unchanged",
      value: summary.unchanged,
    },
  ];

  return (
    <div className="d-flex flex-wrap gap-2 mb-4">
      {items.map((item) => (
        <span key={item.key} className="badge text-bg-secondary">
          {t(item.key)}: {String(item.value ?? 0)}
        </span>
      ))}
    </div>
  );
}

function ImportNewSection({
  rows,
  selected,
  onToggle,
}: {
  rows: RomaneioImportRowDTO[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const t = useT();
  if (rows.length === 0) return null;

  return (
    <section className="mb-4">
      <h2 className="h6 mb-1">{t("administrative-operations.romaneio.import.sections.new")}</h2>
      <p className="text-body-secondary small mb-2">
        {t("administrative-operations.romaneio.import.sections.newHint")}
      </p>
      <div className="list-group">
        {rows.map((row) => {
          const id = row.itemIdentifier ?? "";
          return (
            <label key={id} className="list-group-item d-flex align-items-center gap-2">
              <Form.Check
                type="checkbox"
                checked={selected.has(id)}
                onChange={() => onToggle(id)}
              />
              <span className="fw-semibold">{id}</span>
              <span className="text-body-secondary small">
                {row.itemCode} · {row.lote} · {row.peso != null ? String(row.peso) : "—"} kg
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function ImportMissingSection({
  rows,
  selected,
  onToggle,
}: {
  rows: RomaneioDTO[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const t = useT();
  if (rows.length === 0) return null;

  return (
    <section className="mb-4">
      <h2 className="h6 mb-1">{t("administrative-operations.romaneio.import.sections.missing")}</h2>
      <p className="text-body-secondary small mb-2">
        {t("administrative-operations.romaneio.import.sections.missingHint")}
      </p>
      <div className="list-group">
        {rows.map((row) => (
          <label
            key={row.itemIdentifier}
            className="list-group-item d-flex align-items-center gap-2"
          >
            <Form.Check
              type="checkbox"
              checked={selected.has(row.itemIdentifier)}
              onChange={() => onToggle(row.itemIdentifier)}
            />
            <span className="fw-semibold">{row.itemIdentifier}</span>
            <span className="text-body-secondary small">
              {row.itemCode} · {row.lote}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function ImportConflictsSection({
  rows,
  selectedFields,
  onToggleField,
}: {
  rows: RomaneioImportConflictDTO[];
  selectedFields: Record<string, Set<string>>;
  onToggleField: (certificado: string, field: string) => void;
}) {
  const t = useT();
  if (rows.length === 0) return null;

  return (
    <section className="mb-4">
      <h2 className="h6 mb-1">
        {t("administrative-operations.romaneio.import.sections.conflicts")}
      </h2>
      <p className="text-body-secondary small mb-2">
        {t("administrative-operations.romaneio.import.sections.conflictsHint")}
      </p>
      <div className="d-flex flex-column gap-3">
        {rows.map((conflict) => {
          const certificado = conflict.incoming?.itemIdentifier ?? "";
          const selected = selectedFields[certificado] ?? new Set<string>();
          return (
            <div key={certificado} className="border rounded p-2">
              <div className="fw-semibold mb-2">{certificado}</div>
              <div className="d-flex flex-wrap gap-3">
                {(conflict.diff ?? []).map((field) => (
                  <Form.Check
                    key={field}
                    type="checkbox"
                    label={t(
                      DIFF_FIELD_LABELS[field] ??
                        "administrative-operations.romaneio.import.fields.itemCode",
                    )}
                    checked={selected.has(field)}
                    onChange={() => onToggleField(certificado, field)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ImportForeignSection({ rows }: { rows: RomaneioImportForeignDTO[] }) {
  const t = useT();
  if (rows.length === 0) return null;

  return (
    <section className="mb-4">
      <h2 className="h6 mb-1">{t("administrative-operations.romaneio.import.sections.foreign")}</h2>
      <p className="text-body-secondary small mb-2">
        {t("administrative-operations.romaneio.import.sections.foreignHint")}
      </p>
      <ul className="list-group">
        {rows.map((row, i) => (
          <li key={i} className="list-group-item">
            {row.incoming?.itemIdentifier} — {row.incoming?.itemCode}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImportInvalidSection({ rows }: { rows: RomaneioImportInvalidDTO[] }) {
  const t = useT();
  if (rows.length === 0) return null;

  return (
    <section className="mb-4">
      <h2 className="h6 mb-1">{t("administrative-operations.romaneio.import.sections.invalid")}</h2>
      <p className="text-body-secondary small mb-2">
        {t("administrative-operations.romaneio.import.sections.invalidHint")}
      </p>
      <ul className="list-group">
        {rows.map((row, i) => (
          <li key={i} className="list-group-item">
            <span className="fw-semibold">
              {t("administrative-operations.romaneio.import.sheetRowLabel", {
                row: String(row.sheetRow ?? ""),
              })}
            </span>
            {" — "}
            {(row.errors ?? []).join(", ")}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ImportDuplicatedSection({ rows }: { rows: RomaneioImportRowDTO[] }) {
  const t = useT();
  if (rows.length === 0) return null;

  return (
    <section className="mb-4">
      <h2 className="h6 mb-1">
        {t("administrative-operations.romaneio.import.sections.duplicated")}
      </h2>
      <p className="text-body-secondary small mb-2">
        {t("administrative-operations.romaneio.import.sections.duplicatedHint")}
      </p>
      <ul className="list-group">
        {rows.map((row, i) => (
          <li key={i} className="list-group-item">
            {row.itemIdentifier} — {row.itemCode}
          </li>
        ))}
      </ul>
    </section>
  );
}

import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Nav, Row, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  usePostApiOperationOperationIdRomaneioImportAnalyze,
  usePostApiOperationOperationIdRomaneioImportApply,
} from "@/api/generated/endpoints/romaneio/romaneio";
import {
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
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ListPagination } from "@/components/ui/list-pagination";
import { Modal } from "@/components/ui/modal";
import type { TranslationKey } from "@/i18n/translate";
import { FilterText } from "@/layouts/Filters/Index";
import { InputFileSingle } from "@/layouts/Form/Fields/Index";
import { useT } from "@/lib/ui-prefs";

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

/** SPEC-100 RF6 — itens por página dentro de cada aba da revisão. */
const REVIEW_PAGE_SIZE = 50;

type ReviewTab =
  "new" | "missing" | "conflicts" | "foreign" | "invalid" | "duplicated" | "unchanged";

/** Ordem visual das abas. */
const TAB_ORDER: ReviewTab[] = [
  "new",
  "missing",
  "conflicts",
  "foreign",
  "invalid",
  "duplicated",
  "unchanged",
];

/** SPEC-100 RF3 — prioridade da aba inicial (primeira com itens). */
const TAB_PRIORITY: ReviewTab[] = [
  "conflicts",
  "missing",
  "new",
  "foreign",
  "invalid",
  "duplicated",
  "unchanged",
];

/** SPEC-100 RF4 — abas que pedem atenção quando têm itens. */
const ATTENTION_TABS = new Set<ReviewTab>(["missing", "conflicts"]);

const TAB_LABELS: Record<ReviewTab, TranslationKey> = {
  new: "administrative-operations.romaneio.import.summary.new",
  missing: "administrative-operations.romaneio.import.summary.missing",
  conflicts: "administrative-operations.romaneio.import.summary.conflicts",
  foreign: "administrative-operations.romaneio.import.summary.foreign",
  invalid: "administrative-operations.romaneio.import.summary.invalid",
  duplicated: "administrative-operations.romaneio.import.summary.duplicated",
  unchanged: "administrative-operations.romaneio.import.summary.unchanged",
};

const TAB_HINTS: Record<ReviewTab, TranslationKey> = {
  new: "administrative-operations.romaneio.import.sections.newHint",
  missing: "administrative-operations.romaneio.import.sections.missingHint",
  conflicts: "administrative-operations.romaneio.import.sections.conflictsHint",
  foreign: "administrative-operations.romaneio.import.sections.foreignHint",
  invalid: "administrative-operations.romaneio.import.sections.invalidHint",
  duplicated: "administrative-operations.romaneio.import.sections.duplicatedHint",
  unchanged: "administrative-operations.romaneio.import.sections.unchangedHint",
};

/** Junta os campos pesquisáveis de um item num texto só, em minúsculas. */
function searchText(...parts: (string | number | null | undefined)[]): string {
  return parts
    .filter((p) => p != null && p !== "")
    .join(" ")
    .toLowerCase();
}

function rowSearchText(row: RomaneioImportRowDTO | undefined): string {
  if (!row) return "";
  return searchText(row.itemIdentifier, row.itemCode, row.lote, row.notaFiscal, row.sheetRow);
}

/** Filtro por busca + paginação local sobre uma lista já em memória (RF5/RF6). */
function useFilteredPage<T>(rows: T[], toText: (row: T) => string, search: string, page: number) {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => toText(row).includes(term));
  }, [rows, toText, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / REVIEW_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * REVIEW_PAGE_SIZE, safePage * REVIEW_PAGE_SIZE);

  return { filtered, pageRows, page: safePage, totalPages };
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
 *
 * SPEC-100: a etapa de revisão é uma tela só com abas por categoria, busca
 * e paginação local por aba (planilhas de até ~2.500 linhas), ações em massa
 * e rodapé com o efeito do "Aplicar". A seleção continua guardada por id em
 * `Set`, independente de quais linhas estão renderizadas na página.
 */
export function ImportRomaneioModal({
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
  const [activeTab, setActiveTab] = useState<ReviewTab>("new");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const analyzeMutation = usePostApiOperationOperationIdRomaneioImportAnalyze();
  const applyMutation = usePostApiOperationOperationIdRomaneioImportApply();

  const analyzeMethods = useForm<AnalyzeFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdRomaneioImportAnalyzeBody),
    defaultValues: {},
  });
  const file = analyzeMethods.watch("File");

  const newRows = analysis?.new ?? [];
  const missingRows = analysis?.missing ?? [];
  const conflictRows = analysis?.conflicts ?? [];
  const foreignRows = analysis?.foreign ?? [];
  const invalidRows = analysis?.invalid ?? [];
  const duplicatedRows = analysis?.duplicated ?? [];
  const unchangedRows = analysis?.unchangedCertificados ?? [];

  const counts: Record<ReviewTab, number> = {
    new: newRows.length,
    missing: missingRows.length,
    conflicts: conflictRows.length,
    foreign: foreignRows.length,
    invalid: invalidRows.length,
    duplicated: duplicatedRows.length,
    unchanged: unchangedRows.length,
  };

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
      // RF3 — abre na primeira aba com itens, na ordem de prioridade.
      const resultCounts: Record<ReviewTab, number> = {
        new: result.new?.length ?? 0,
        missing: result.missing?.length ?? 0,
        conflicts: result.conflicts?.length ?? 0,
        foreign: result.foreign?.length ?? 0,
        invalid: result.invalid?.length ?? 0,
        duplicated: result.duplicated?.length ?? 0,
        unchanged: result.unchangedCertificados?.length ?? 0,
      };
      setActiveTab(TAB_PRIORITY.find((tab) => resultCounts[tab] > 0) ?? "new");
      setSearch("");
      setPage(1);
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro — nada a fazer aqui
    }
  });

  const changeTab = (tab: ReviewTab) => {
    setActiveTab(tab);
    setSearch("");
    setPage(1);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const toggleIn = (setter: typeof setSelectedNew) => (id: string) =>
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** Marca/desmarca em massa um conjunto de ids (todos os filtrados da aba). */
  const setManyIn = (setter: typeof setSelectedNew) => (ids: string[], checked: boolean) =>
    setter((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const toggleConflictField = (certificado: string, field: string) =>
    setConflictFields((prev) => {
      const current = new Set(prev[certificado] ?? []);
      if (current.has(field)) current.delete(field);
      else current.add(field);
      return { ...prev, [certificado]: current };
    });

  const setConflictsAll = (conflicts: RomaneioImportConflictDTO[], accept: boolean) =>
    setConflictFields((prev) => {
      const next = { ...prev };
      for (const c of conflicts) {
        next[c.incoming?.itemIdentifier ?? ""] = new Set(accept ? (c.diff ?? []) : []);
      }
      return next;
    });

  const updatedCount = Object.values(conflictFields).filter((set) => set.size > 0).length;

  const applyImport = async () => {
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
      const created = Number(result.created ?? 0);
      const updated = Number(result.updated ?? 0);
      const deleted = Number(result.deleted ?? 0);

      // BUGFIX (investigação do fluxo de import — ver relatório da branch
      // fix/sidebar-romaneio-import-acoes): o Core sempre responde 200 aqui,
      // mesmo quando nada foi de fato criado/atualizado/excluído (ex.: todos
      // os fardos da planilha já existem sem divergência — "unchanged" — ou
      // ficaram em grupos não-acionáveis como "foreign"/"duplicated"). Sem
      // essa checagem, o wizard fechava com um toast verde de "sucesso"
      // mesmo sem persistir nada, e o usuário não entendia por que o fardo
      // não aparecia na listagem depois. Avisa em vez de comemorar um no-op.
      if (created === 0 && updated === 0 && deleted === 0) {
        toast.warn(t("administrative-operations.romaneio.import.toast.applyNoop"));
      } else {
        toast.success(
          t("administrative-operations.romaneio.import.toast.applySuccess", {
            created: String(created),
            updated: String(updated),
            deleted: String(deleted),
          }),
        );
      }
      onApplied();
      onClose();
    } catch (err) {
      // `payload` vem de `.parse()` (síncrono, local) antes do `mutateAsync` (HTTP) —
      // só mostra o toast aqui se o erro for de validação Zod local; erro vindo do
      // `mutateAsync` já foi notificado pelo interceptor global (mutator.ts).
      if (err instanceof z.ZodError) {
        toast.error(t("administrative-operations.romaneio.import.toast.applyError"));
      }
    }
  };

  // RF10 — exclusão de ausentes exige confirmação explícita.
  const handleApply = () => {
    if (selectedMissing.size > 0) setConfirmDelete(true);
    else void applyImport();
  };

  const step: "upload" | "review" = analysis ? "review" : "upload";
  const tabProps = { search, page, onPageChange: setPage };

  return (
    <Modal show onHide={onClose} centered size="xl" fullscreen="md-down">
      <Modal.Header>
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

            <Nav
              variant="pills"
              className="mb-3 flex-nowrap overflow-auto"
              activeKey={activeTab}
              onSelect={(key) => key && changeTab(key as ReviewTab)}
            >
              {TAB_ORDER.map((tab) => (
                <Nav.Item key={tab}>
                  <Nav.Link eventKey={tab} disabled={counts[tab] === 0} className="text-nowrap">
                    {ATTENTION_TABS.has(tab) && counts[tab] > 0 ? (
                      <i
                        className="bi bi-exclamation-triangle-fill text-warning me-1"
                        aria-hidden="true"
                      />
                    ) : null}
                    {t(TAB_LABELS[tab])} ({counts[tab]})
                  </Nav.Link>
                </Nav.Item>
              ))}
            </Nav>

            <p className="text-body-secondary small mb-2">{t(TAB_HINTS[activeTab])}</p>

            {activeTab === "new" ? (
              <SelectableTab
                {...tabProps}
                rows={newRows}
                toText={rowSearchText}
                getId={(row) => row.itemIdentifier ?? ""}
                selected={selectedNew}
                onToggle={toggleIn(setSelectedNew)}
                onSetMany={setManyIn(setSelectedNew)}
                onSearchChange={changeSearch}
                renderLabel={(row) => (
                  <>
                    <span className="fw-semibold text-break">{row.itemIdentifier}</span>
                    <span className="text-body-secondary small">
                      {row.itemCode} · {row.lote} · {row.peso != null ? String(row.peso) : "—"} kg
                    </span>
                  </>
                )}
              />
            ) : null}

            {activeTab === "missing" ? (
              <SelectableTab
                {...tabProps}
                rows={missingRows}
                toText={missingSearchText}
                getId={(row) => row.itemIdentifier}
                selected={selectedMissing}
                onToggle={toggleIn(setSelectedMissing)}
                onSetMany={setManyIn(setSelectedMissing)}
                onSearchChange={changeSearch}
                renderLabel={(row) => (
                  <>
                    <span className="fw-semibold text-break">{row.itemIdentifier}</span>
                    <span className="text-body-secondary small">
                      {row.itemCode} · {row.lote}
                    </span>
                  </>
                )}
              />
            ) : null}

            {activeTab === "conflicts" ? (
              <ConflictsTab
                {...tabProps}
                rows={conflictRows}
                selectedFields={conflictFields}
                onToggleField={toggleConflictField}
                onSetAll={setConflictsAll}
                onSearchChange={changeSearch}
              />
            ) : null}

            {activeTab === "foreign" ? (
              <ReadOnlyTab
                {...tabProps}
                rows={foreignRows}
                toText={foreignSearchText}
                onSearchChange={changeSearch}
                renderItem={(row) => (
                  <>
                    {row.incoming?.itemIdentifier} — {row.incoming?.itemCode}
                  </>
                )}
              />
            ) : null}

            {activeTab === "invalid" ? (
              <ReadOnlyTab
                {...tabProps}
                rows={invalidRows}
                toText={invalidSearchText}
                onSearchChange={changeSearch}
                renderItem={(row) => (
                  <>
                    <span className="fw-semibold">
                      {t("administrative-operations.romaneio.import.sheetRowLabel", {
                        row: String(row.sheetRow ?? ""),
                      })}
                    </span>
                    {" — "}
                    {(row.errors ?? []).join(", ")}
                  </>
                )}
              />
            ) : null}

            {activeTab === "duplicated" ? (
              <ReadOnlyTab
                {...tabProps}
                rows={duplicatedRows}
                toText={rowSearchText}
                onSearchChange={changeSearch}
                renderItem={(row) => (
                  <>
                    {row.itemIdentifier} — {row.itemCode}
                  </>
                )}
              />
            ) : null}

            {activeTab === "unchanged" ? (
              <ReadOnlyTab
                {...tabProps}
                rows={unchangedRows}
                toText={unchangedSearchText}
                onSearchChange={changeSearch}
                renderItem={(certificado) => <>{certificado}</>}
              />
            ) : null}
          </Modal.Body>
          <Modal.Footer className="justify-content-between gap-2">
            <span className="small text-body-secondary">
              {t("administrative-operations.romaneio.import.review.footerSummary", {
                created: String(selectedNew.size),
                updated: String(updatedCount),
                deleted: String(selectedMissing.size),
              })}
            </span>
            <div className="d-flex flex-wrap gap-2 ms-auto">
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
            </div>
          </Modal.Footer>
        </>
      )}

      <ConfirmationModal
        show={confirmDelete}
        variant="danger"
        title={t("administrative-operations.romaneio.import.confirmDelete.title")}
        message={t("administrative-operations.romaneio.import.confirmDelete.message", {
          count: String(selectedMissing.size),
        })}
        confirmLabel={t("administrative-operations.romaneio.import.confirmDelete.confirm")}
        cancelLabel={t("administrative-operations.romaneio.import.cancel")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await applyImport();
          setConfirmDelete(false);
        }}
      />
    </Modal>
  );
}

// Extratores de texto de busca por categoria — funções estáveis (fora do
// componente) pra não invalidar o `useMemo` do filtro a cada render.
function missingSearchText(row: RomaneioDTO): string {
  return searchText(row.itemIdentifier, row.itemCode, row.lote, row.notaFiscal);
}

function conflictSearchText(row: RomaneioImportConflictDTO): string {
  return rowSearchText(row.incoming);
}

function foreignSearchText(row: RomaneioImportForeignDTO): string {
  return rowSearchText(row.incoming);
}

function invalidSearchText(row: RomaneioImportInvalidDTO): string {
  return searchText(rowSearchText(row.row), row.sheetRow, (row.errors ?? []).join(" "));
}

function unchangedSearchText(certificado: string): string {
  return certificado.toLowerCase();
}

type PagedTabProps = {
  search: string;
  page: number;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
};

/** Barra da aba: busca à esquerda, ações em massa/contador à direita. */
function TabToolbar({
  search,
  onSearchChange,
  children,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
      <div className="flex-grow-1" style={{ minWidth: "14rem", maxWidth: "24rem" }}>
        <FilterText
          value={search}
          onChange={onSearchChange}
          placeholder={t("administrative-operations.romaneio.import.review.searchPlaceholder")}
          icon="bi-search"
        />
      </div>
      {children ? (
        <div className="d-flex flex-wrap align-items-center gap-2 ms-auto">{children}</div>
      ) : null}
    </div>
  );
}

/** Lista paginada + estado vazio + paginação, comum a todas as abas. */
function PagedList({
  total,
  filteredCount,
  page,
  totalPages,
  onPageChange,
  children,
}: {
  total: number;
  filteredCount: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  children: ReactNode;
}) {
  const t = useT();
  if (total === 0) {
    return (
      <p className="text-body-secondary small mb-0">
        {t("administrative-operations.romaneio.import.review.empty")}
      </p>
    );
  }
  if (filteredCount === 0) {
    return (
      <p className="text-body-secondary small mb-0">
        {t("administrative-operations.romaneio.import.review.noResults")}
      </p>
    );
  }
  return (
    <>
      {children}
      {totalPages > 1 ? (
        <ListPagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      ) : null}
    </>
  );
}

/** Abas Novos/Ausentes — checkbox por item + marcar/desmarcar todos (RF7). */
function SelectableTab<T>({
  rows,
  toText,
  getId,
  selected,
  onToggle,
  onSetMany,
  renderLabel,
  search,
  page,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: T[];
  toText: (row: T) => string;
  getId: (row: T) => string;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], checked: boolean) => void;
  renderLabel: (row: T) => ReactNode;
}) {
  const t = useT();
  const view = useFilteredPage(rows, toText, search, page);
  const filteredIds = view.filtered.map(getId);
  const selectedCount = rows.filter((row) => selected.has(getId(row))).length;

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <span className="small text-body-secondary">
          {t("administrative-operations.romaneio.import.review.selectedCount", {
            selected: String(selectedCount),
            total: String(rows.length),
          })}
        </span>
        <Button size="sm" variant="outline-primary" onClick={() => onSetMany(filteredIds, true)}>
          {t("administrative-operations.romaneio.import.review.selectAll", {
            count: String(filteredIds.length),
          })}
        </Button>
        <Button size="sm" variant="outline-secondary" onClick={() => onSetMany(filteredIds, false)}>
          {t("administrative-operations.romaneio.import.review.clearAll")}
        </Button>
      </TabToolbar>
      <PagedList
        total={rows.length}
        filteredCount={view.filtered.length}
        page={view.page}
        totalPages={view.totalPages}
        onPageChange={onPageChange}
      >
        <div className="list-group">
          {view.pageRows.map((row) => {
            const id = getId(row);
            return (
              <label key={id} className="list-group-item d-flex flex-wrap align-items-center gap-2">
                <Form.Check
                  type="checkbox"
                  checked={selected.has(id)}
                  onChange={() => onToggle(id)}
                />
                {renderLabel(row)}
              </label>
            );
          })}
        </div>
      </PagedList>
    </>
  );
}

/** Aba Conflitos — checkbox por campo divergente + aceitar/ignorar todos (RF7). */
function ConflictsTab({
  rows,
  selectedFields,
  onToggleField,
  onSetAll,
  search,
  page,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: RomaneioImportConflictDTO[];
  selectedFields: Record<string, Set<string>>;
  onToggleField: (certificado: string, field: string) => void;
  onSetAll: (rows: RomaneioImportConflictDTO[], accept: boolean) => void;
}) {
  const t = useT();
  const view = useFilteredPage(rows, conflictSearchText, search, page);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button size="sm" variant="outline-primary" onClick={() => onSetAll(view.filtered, true)}>
          {t("administrative-operations.romaneio.import.review.acceptAllFields")}
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={() => onSetAll(view.filtered, false)}
        >
          {t("administrative-operations.romaneio.import.review.ignoreAllFields")}
        </Button>
      </TabToolbar>
      <PagedList
        total={rows.length}
        filteredCount={view.filtered.length}
        page={view.page}
        totalPages={view.totalPages}
        onPageChange={onPageChange}
      >
        <div className="d-flex flex-column gap-2">
          {view.pageRows.map((conflict) => {
            const certificado = conflict.incoming?.itemIdentifier ?? "";
            const selected = selectedFields[certificado] ?? new Set<string>();
            return (
              <div key={certificado} className="border rounded p-2">
                <div className="fw-semibold mb-2 text-break">{certificado}</div>
                <div className="d-flex flex-wrap gap-3">
                  {(conflict.diff ?? []).map((field) => (
                    <Form.Check
                      key={field}
                      id={`conflict-${certificado}-${field}`}
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
      </PagedList>
    </>
  );
}

/** Abas informativas (outra operação, inválidos, duplicados, sem alteração) — RF8. */
function ReadOnlyTab<T>({
  rows,
  toText,
  renderItem,
  search,
  page,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: T[];
  toText: (row: T) => string;
  renderItem: (row: T) => ReactNode;
}) {
  const view = useFilteredPage(rows, toText, search, page);
  const offset = (view.page - 1) * REVIEW_PAGE_SIZE;

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange} />
      <PagedList
        total={rows.length}
        filteredCount={view.filtered.length}
        page={view.page}
        totalPages={view.totalPages}
        onPageChange={onPageChange}
      >
        <ul className="list-group">
          {view.pageRows.map((row, i) => (
            // Duplicados repetem o mesmo certificado — índice absoluto como chave.
            <li key={offset + i} className="list-group-item text-break">
              {renderItem(row)}
            </li>
          ))}
        </ul>
      </PagedList>
    </>
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
    <div className="d-flex flex-wrap gap-2 mb-3">
      {items.map((item) => (
        <span key={item.key} className="badge text-bg-secondary">
          {t(item.key)}: {String(item.value ?? 0)}
        </span>
      ))}
    </div>
  );
}

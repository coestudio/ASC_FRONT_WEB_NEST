import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Badge, Button, ButtonGroup, Form, Nav, Row, Spinner } from "react-bootstrap";
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

/** Abas que carregam pendência (SPEC-100 RF13). */
type PendingTab = "missing" | "conflicts" | "invalid" | "duplicated";

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

/** RF13 — ordem em que "Próxima pendência" percorre as abas. */
const PENDING_ORDER: PendingTab[] = ["conflicts", "missing", "invalid", "duplicated"];

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

type MissingDecision = "keep" | "delete";
type ConflictDecision = "accept" | "ignore";

/** Linhas duplicadas da planilha agrupadas pelo certificado repetido. */
type DuplicatedGroup = { certificado: string; rows: RomaneioImportRowDTO[] };

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

const invalidKey = (row: RomaneioImportInvalidDTO) => String(row.sheetRow ?? "");
const conflictKey = (row: RomaneioImportConflictDTO) => row.incoming?.itemIdentifier ?? "";

type AnalyzeFormValues = z.infer<typeof PostApiOperationOperationIdRomaneioImportAnalyzeBody>;

/**
 * Wizard de import: etapa 1 (`analyze`, upload real via `InputFileSingle` —
 * SPEC-SHARE-01/CA4) → etapa 2 (revisão dos grupos classificados pelo Core,
 * RF2) → `apply`. O payload final enviado ao Core (`RomaneioImportApply`)
 * passa pelo schema gerado (`.parse`) antes do POST, então a regra "zero Zod
 * à mão" continua valendo — só a montagem dos arrays a partir das decisões.
 *
 * SPEC-100: revisão em abas por categoria, busca e paginação local por aba
 * (planilhas de até ~2.500 linhas) e ações em massa.
 *
 * SPEC-100 RF13 — **nada é gravado até todas as pendências estarem
 * resolvidas**: Ausentes (manter/excluir), Conflitos (aceitar/ignorar),
 * Inválidos (descartar — ou ajustar, quando o Core liberar o `fix-row`) e
 * Duplicados (descartar). Novos já vêm decididos ("criar"), De outra
 * operação e Sem alteração são informativos. O "Aplicar" fica desabilitado
 * enquanto houver pendência e grava tudo num único `apply` (Invoice
 * automática e evento de Log continuam no Core). As decisões são estado
 * local por id, independente de qual página está renderizada.
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
  const [missingDecisions, setMissingDecisions] = useState<Record<string, MissingDecision>>({});
  const [conflictFields, setConflictFields] = useState<Record<string, Set<string>>>({});
  const [conflictDecisions, setConflictDecisions] = useState<Record<string, ConflictDecision>>({});
  const [discardedInvalid, setDiscardedInvalid] = useState<Set<string>>(new Set());
  const [discardedDuplicated, setDiscardedDuplicated] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ReviewTab>("new");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmApply, setConfirmApply] = useState(false);

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
  const unchangedRows = analysis?.unchangedCertificados ?? [];

  const duplicatedGroups = useMemo<DuplicatedGroup[]>(() => {
    const map = new Map<string, RomaneioImportRowDTO[]>();
    for (const row of analysis?.duplicated ?? []) {
      const cert = row.itemIdentifier ?? "";
      map.set(cert, [...(map.get(cert) ?? []), row]);
    }
    return Array.from(map, ([certificado, rows]) => ({ certificado, rows }));
  }, [analysis]);

  const counts: Record<ReviewTab, number> = {
    new: newRows.length,
    missing: missingRows.length,
    conflicts: conflictRows.length,
    foreign: foreignRows.length,
    invalid: invalidRows.length,
    duplicated: duplicatedGroups.length,
    unchanged: unchangedRows.length,
  };

  // ── Pendências (RF13) ────────────────────────────────────────────────
  const isMissingPending = (row: RomaneioDTO) => !missingDecisions[row.itemIdentifier];
  const isConflictPending = (row: RomaneioImportConflictDTO) => {
    const key = conflictKey(row);
    const decision = conflictDecisions[key];
    if (decision === "ignore") return false;
    return decision !== "accept" || (conflictFields[key]?.size ?? 0) === 0;
  };
  const isInvalidPending = (row: RomaneioImportInvalidDTO) =>
    !discardedInvalid.has(invalidKey(row));
  const isDuplicatedPending = (group: DuplicatedGroup) =>
    !discardedDuplicated.has(group.certificado);

  const pendingIndex: Record<PendingTab, number> = {
    missing: missingRows.findIndex(isMissingPending),
    conflicts: conflictRows.findIndex(isConflictPending),
    invalid: invalidRows.findIndex(isInvalidPending),
    duplicated: duplicatedGroups.findIndex(isDuplicatedPending),
  };
  const pending: Record<PendingTab, number> = {
    missing: missingRows.filter(isMissingPending).length,
    conflicts: conflictRows.filter(isConflictPending).length,
    invalid: invalidRows.filter(isInvalidPending).length,
    duplicated: duplicatedGroups.filter(isDuplicatedPending).length,
  };
  const pendingTotal = pending.missing + pending.conflicts + pending.invalid + pending.duplicated;

  const acceptedConflicts = conflictRows.filter(
    (c) => conflictDecisions[conflictKey(c)] === "accept" && !isConflictPending(c),
  );
  const deleteCount = Object.values(missingDecisions).filter((d) => d === "delete").length;
  const discardedCount = discardedInvalid.size + discardedDuplicated.size;

  const handleAnalyze = analyzeMethods.handleSubmit(async (values) => {
    try {
      const result = await analyzeMutation.mutateAsync({ operationId, data: values });
      setAnalysis(result);
      // Novos já decididos ("criar"); demais decisões começam pendentes.
      // Campos divergentes vêm pré-marcados, mas o conflito só conta como
      // resolvido depois de "Aceitar" ou "Ignorar" explícito.
      setSelectedNew(new Set((result.new ?? []).map((r) => r.itemIdentifier ?? "")));
      setMissingDecisions({});
      setConflictDecisions({});
      setDiscardedInvalid(new Set());
      setDiscardedDuplicated(new Set());
      setConflictFields(
        Object.fromEntries(
          (result.conflicts ?? []).map((c) => [conflictKey(c), new Set(c.diff ?? [])]),
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

  /** RF13 — leva à aba e à página do próximo item pendente. */
  const goToNextPending = () => {
    const tab = PENDING_ORDER.find((candidate) => pending[candidate] > 0);
    if (!tab) return;
    setActiveTab(tab);
    setSearch("");
    setPage(Math.floor(Math.max(0, pendingIndex[tab]) / REVIEW_PAGE_SIZE) + 1);
  };

  const toggleNew = (id: string) =>
    setSelectedNew((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setManyNew = (ids: string[], checked: boolean) =>
    setSelectedNew((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const decideMissing = (ids: string[], decision: MissingDecision | null) =>
    setMissingDecisions((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (decision) next[id] = decision;
        else delete next[id];
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

  /** Aceitar marca todos os campos do diff se nenhum estiver marcado (aceite em massa). */
  const decideConflicts = (
    rows: RomaneioImportConflictDTO[],
    decision: ConflictDecision | null,
  ) => {
    setConflictDecisions((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        if (decision) next[conflictKey(row)] = decision;
        else delete next[conflictKey(row)];
      }
      return next;
    });
    if (decision === "accept") {
      setConflictFields((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          const key = conflictKey(row);
          if ((next[key]?.size ?? 0) === 0) next[key] = new Set(row.diff ?? []);
        }
        return next;
      });
    }
  };

  const setManyIn = (setter: typeof setDiscardedInvalid) => (ids: string[], discarded: boolean) =>
    setter((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (discarded) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const applyImport = async () => {
    if (!analysis?.importId) return;
    const conflicts = acceptedConflicts.map((c) => ({
      certificado: conflictKey(c),
      fields: Array.from(conflictFields[conflictKey(c)] ?? []),
    }));
    const deleteMissing = Object.entries(missingDecisions)
      .filter(([, decision]) => decision === "delete")
      .map(([certificado]) => certificado);

    try {
      const payload = PostApiOperationOperationIdRomaneioImportApplyBody.parse({
        importId: analysis.importId,
        createNew: Array.from(selectedNew),
        conflicts,
        deleteMissing,
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

  const step: "upload" | "review" = analysis ? "review" : "upload";
  const tabProps = { search, page, onPageChange: setPage, onSearchChange: changeSearch };
  const pendingOf = (tab: ReviewTab) => (tab in pending ? pending[tab as PendingTab] : 0);

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

            {pendingTotal > 0 ? (
              <Alert
                variant="warning"
                className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2"
              >
                <span>
                  <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
                  {t("administrative-operations.romaneio.import.pending.banner", {
                    count: String(pendingTotal),
                  })}
                </span>
                <Button size="sm" variant="warning" onClick={goToNextPending}>
                  {t("administrative-operations.romaneio.import.pending.next")}
                  <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                </Button>
              </Alert>
            ) : (
              <Alert variant="success" className="py-2">
                <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
                {t("administrative-operations.romaneio.import.pending.done")}
              </Alert>
            )}

            <Nav
              variant="pills"
              className="mb-3 flex-nowrap overflow-auto"
              activeKey={activeTab}
              onSelect={(key) => key && changeTab(key as ReviewTab)}
            >
              {TAB_ORDER.map((tab) => (
                <Nav.Item key={tab}>
                  <Nav.Link eventKey={tab} disabled={counts[tab] === 0} className="text-nowrap">
                    {t(TAB_LABELS[tab])} ({counts[tab]})
                    {pendingOf(tab) > 0 ? (
                      <Badge
                        bg="warning"
                        text="dark"
                        pill
                        className="ms-1"
                        title={t("administrative-operations.romaneio.import.pending.tabTitle")}
                      >
                        {pendingOf(tab)}
                      </Badge>
                    ) : tab in pending && counts[tab] > 0 ? (
                      <i className="bi bi-check-circle-fill text-success ms-1" aria-hidden="true" />
                    ) : null}
                  </Nav.Link>
                </Nav.Item>
              ))}
            </Nav>

            <p className="text-body-secondary small mb-2">{t(TAB_HINTS[activeTab])}</p>

            {activeTab === "new" ? (
              <NewTab
                {...tabProps}
                rows={newRows}
                selected={selectedNew}
                onToggle={toggleNew}
                onSetMany={setManyNew}
              />
            ) : null}

            {activeTab === "missing" ? (
              <MissingTab
                {...tabProps}
                rows={missingRows}
                decisions={missingDecisions}
                onDecide={decideMissing}
              />
            ) : null}

            {activeTab === "conflicts" ? (
              <ConflictsTab
                {...tabProps}
                rows={conflictRows}
                selectedFields={conflictFields}
                decisions={conflictDecisions}
                isPending={isConflictPending}
                onToggleField={toggleConflictField}
                onDecide={decideConflicts}
              />
            ) : null}

            {activeTab === "foreign" ? (
              <ReadOnlyTab
                {...tabProps}
                rows={foreignRows}
                toText={foreignSearchText}
                renderItem={(row) => (
                  <>
                    {row.incoming?.itemIdentifier} — {row.incoming?.itemCode}
                  </>
                )}
              />
            ) : null}

            {activeTab === "invalid" ? (
              <InvalidTab
                {...tabProps}
                rows={invalidRows}
                discarded={discardedInvalid}
                onDiscard={setManyIn(setDiscardedInvalid)}
              />
            ) : null}

            {activeTab === "duplicated" ? (
              <DuplicatedTab
                {...tabProps}
                groups={duplicatedGroups}
                discarded={discardedDuplicated}
                onDiscard={setManyIn(setDiscardedDuplicated)}
              />
            ) : null}

            {activeTab === "unchanged" ? (
              <ReadOnlyTab
                {...tabProps}
                rows={unchangedRows}
                toText={unchangedSearchText}
                renderItem={(certificado) => <>{certificado}</>}
              />
            ) : null}
          </Modal.Body>
          <Modal.Footer className="justify-content-between gap-2">
            <span className="small text-body-secondary">
              {t("administrative-operations.romaneio.import.review.footerSummary", {
                created: String(selectedNew.size),
                updated: String(acceptedConflicts.length),
                deleted: String(deleteCount),
              })}
              {pendingTotal > 0
                ? ` · ${t("administrative-operations.romaneio.import.pending.footer", {
                    count: String(pendingTotal),
                  })}`
                : null}
            </span>
            <div className="d-flex flex-wrap gap-2 ms-auto">
              <Button variant="outline-primary" onClick={() => setAnalysis(null)}>
                {t("administrative-operations.romaneio.import.back")}
              </Button>
              <Button variant="outline-primary" onClick={onClose}>
                {t("administrative-operations.romaneio.import.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={() => setConfirmApply(true)}
                disabled={pendingTotal > 0 || applyMutation.isPending}
                title={
                  pendingTotal > 0
                    ? t("administrative-operations.romaneio.import.pending.applyBlocked")
                    : undefined
                }
              >
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

      {/* RF10/RF13 — resumo final antes de gravar; vermelho quando há exclusão. */}
      <ConfirmationModal
        show={confirmApply}
        variant={deleteCount > 0 ? "danger" : "primary"}
        title={t("administrative-operations.romaneio.import.confirmApply.title")}
        message={t("administrative-operations.romaneio.import.confirmApply.message", {
          created: String(selectedNew.size),
          updated: String(acceptedConflicts.length),
          deleted: String(deleteCount),
          discarded: String(discardedCount),
        })}
        confirmLabel={t("administrative-operations.romaneio.import.confirmApply.confirm")}
        cancelLabel={t("administrative-operations.romaneio.import.cancel")}
        onCancel={() => setConfirmApply(false)}
        onConfirm={async () => {
          await applyImport();
          setConfirmApply(false);
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

function duplicatedSearchText(group: DuplicatedGroup): string {
  return searchText(group.certificado, ...group.rows.map(rowSearchText));
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

/** Selo de estado da decisão de um item (pendente / decidido). */
function DecisionBadge({ label, variant }: { label: string; variant: string }) {
  return (
    <Badge bg={variant} text={variant === "warning" ? "dark" : undefined}>
      {label}
    </Badge>
  );
}

/** Aba Novos — checkbox por item + marcar/desmarcar todos (RF7). Não gera pendência. */
function NewTab({
  rows,
  selected,
  onToggle,
  onSetMany,
  search,
  page,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: RomaneioImportRowDTO[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSetMany: (ids: string[], checked: boolean) => void;
}) {
  const t = useT();
  const view = useFilteredPage(rows, rowSearchText, search, page);
  const filteredIds = view.filtered.map((row) => row.itemIdentifier ?? "");
  const selectedCount = rows.filter((row) => selected.has(row.itemIdentifier ?? "")).length;

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
            const id = row.itemIdentifier ?? "";
            return (
              <label key={id} className="list-group-item d-flex flex-wrap align-items-center gap-2">
                <Form.Check
                  type="checkbox"
                  checked={selected.has(id)}
                  onChange={() => onToggle(id)}
                />
                <span className="fw-semibold text-break">{row.itemIdentifier}</span>
                <span className="text-body-secondary small">
                  {row.itemCode} · {row.lote} · {row.peso != null ? String(row.peso) : "—"} kg
                </span>
              </label>
            );
          })}
        </div>
      </PagedList>
    </>
  );
}

/** Aba Ausentes — decisão explícita Manter/Excluir por fardo (RF13). */
function MissingTab({
  rows,
  decisions,
  onDecide,
  search,
  page,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: RomaneioDTO[];
  decisions: Record<string, MissingDecision>;
  onDecide: (ids: string[], decision: MissingDecision | null) => void;
}) {
  const t = useT();
  const view = useFilteredPage(rows, missingSearchText, search, page);
  const filteredIds = view.filtered.map((row) => row.itemIdentifier);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button size="sm" variant="outline-primary" onClick={() => onDecide(filteredIds, "keep")}>
          {t("administrative-operations.romaneio.import.decision.keepAll", {
            count: String(filteredIds.length),
          })}
        </Button>
        <Button size="sm" variant="outline-danger" onClick={() => onDecide(filteredIds, "delete")}>
          {t("administrative-operations.romaneio.import.decision.deleteAll", {
            count: String(filteredIds.length),
          })}
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
            const decision = decisions[row.itemIdentifier];
            return (
              <div
                key={row.itemIdentifier}
                className={`list-group-item d-flex flex-wrap align-items-center gap-2 ${decision ? "" : "list-group-item-warning"}`}
              >
                <span className="fw-semibold text-break">{row.itemIdentifier}</span>
                <span className="text-body-secondary small">
                  {row.itemCode} · {row.lote}
                </span>
                <ButtonGroup size="sm" className="ms-auto">
                  <Button
                    variant={decision === "keep" ? "primary" : "outline-primary"}
                    onClick={() => onDecide([row.itemIdentifier], "keep")}
                  >
                    {t("administrative-operations.romaneio.import.decision.keep")}
                  </Button>
                  <Button
                    variant={decision === "delete" ? "danger" : "outline-danger"}
                    onClick={() => onDecide([row.itemIdentifier], "delete")}
                  >
                    {t("administrative-operations.romaneio.import.decision.delete")}
                  </Button>
                </ButtonGroup>
              </div>
            );
          })}
        </div>
      </PagedList>
    </>
  );
}

/** Aba Conflitos — campos a aceitar + decisão Aceitar/Ignorar por fardo (RF7/RF13). */
function ConflictsTab({
  rows,
  selectedFields,
  decisions,
  isPending,
  onToggleField,
  onDecide,
  search,
  page,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: RomaneioImportConflictDTO[];
  selectedFields: Record<string, Set<string>>;
  decisions: Record<string, ConflictDecision>;
  isPending: (row: RomaneioImportConflictDTO) => boolean;
  onToggleField: (certificado: string, field: string) => void;
  onDecide: (rows: RomaneioImportConflictDTO[], decision: ConflictDecision | null) => void;
}) {
  const t = useT();
  const view = useFilteredPage(rows, conflictSearchText, search, page);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => onDecide(view.filtered, "accept")}
        >
          {t("administrative-operations.romaneio.import.review.acceptAllFields")}
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          onClick={() => onDecide(view.filtered, "ignore")}
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
            const certificado = conflictKey(conflict);
            const selected = selectedFields[certificado] ?? new Set<string>();
            const decision = decisions[certificado];
            const pending = isPending(conflict);
            return (
              <div
                key={certificado}
                className={`border rounded p-2 ${pending ? "border-warning" : ""}`}
              >
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span className="fw-semibold text-break">{certificado}</span>
                  {pending ? (
                    <DecisionBadge
                      variant="warning"
                      label={t("administrative-operations.romaneio.import.decision.pending")}
                    />
                  ) : (
                    <DecisionBadge
                      variant={decision === "ignore" ? "secondary" : "success"}
                      label={t(
                        decision === "ignore"
                          ? "administrative-operations.romaneio.import.decision.ignored"
                          : "administrative-operations.romaneio.import.decision.accepted",
                      )}
                    />
                  )}
                  <ButtonGroup size="sm" className="ms-auto">
                    <Button
                      variant={decision === "accept" ? "primary" : "outline-primary"}
                      disabled={selected.size === 0}
                      onClick={() => onDecide([conflict], "accept")}
                    >
                      {t("administrative-operations.romaneio.import.decision.accept")}
                    </Button>
                    <Button
                      variant={decision === "ignore" ? "secondary" : "outline-secondary"}
                      onClick={() => onDecide([conflict], "ignore")}
                    >
                      {t("administrative-operations.romaneio.import.decision.ignore")}
                    </Button>
                  </ButtonGroup>
                </div>
                <div className="d-flex flex-wrap gap-3">
                  {(conflict.diff ?? []).map((field) => (
                    <Form.Check
                      key={field}
                      id={`conflict-${certificado}-${field}`}
                      type="checkbox"
                      disabled={decision === "ignore"}
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

/**
 * Aba Inválidos — cada linha precisa ser descartada (ou ajustada, quando o
 * Core liberar o `fix-row`: a correção revalida e reclassifica a linha no
 * servidor, sem gravar nada — RF13). Enquanto o endpoint não existe, o
 * "Ajustar" fica desabilitado: criar o fardo direto pelo `POST /romaneio`
 * furava o import (sem Invoice automática, sem evento de Log).
 */
function InvalidTab({
  rows,
  discarded,
  onDiscard,
  search,
  page,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: RomaneioImportInvalidDTO[];
  discarded: Set<string>;
  onDiscard: (ids: string[], discarded: boolean) => void;
}) {
  const t = useT();
  const view = useFilteredPage(rows, invalidSearchText, search, page);
  const filteredIds = view.filtered.map(invalidKey);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button size="sm" variant="outline-danger" onClick={() => onDiscard(filteredIds, true)}>
          {t("administrative-operations.romaneio.import.decision.discardAll", {
            count: String(filteredIds.length),
          })}
        </Button>
      </TabToolbar>
      <PagedList
        total={rows.length}
        filteredCount={view.filtered.length}
        page={view.page}
        totalPages={view.totalPages}
        onPageChange={onPageChange}
      >
        <ul className="list-group">
          {view.pageRows.map((row) => {
            const key = invalidKey(row);
            const isDiscarded = discarded.has(key);
            return (
              <li
                key={key}
                className={`list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 ${isDiscarded ? "" : "list-group-item-warning"}`}
              >
                <span
                  className={`text-break ${isDiscarded ? "text-decoration-line-through text-body-secondary" : ""}`}
                >
                  <span className="fw-semibold">
                    {t("administrative-operations.romaneio.import.sheetRowLabel", {
                      row: String(row.sheetRow ?? ""),
                    })}
                  </span>
                  {" — "}
                  {(row.errors ?? []).join(", ")}
                </span>
                <span className="d-flex flex-shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    disabled
                    title={t("administrative-operations.romaneio.import.decision.fixUnavailable")}
                  >
                    <i className="bi bi-pencil me-1" aria-hidden="true" />
                    {t("administrative-operations.romaneio.import.fix.button")}
                  </Button>
                  {isDiscarded ? (
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => onDiscard([key], false)}
                    >
                      <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
                      {t("administrative-operations.romaneio.import.decision.undo")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => onDiscard([key], true)}
                    >
                      <i className="bi bi-x-lg me-1" aria-hidden="true" />
                      {t("administrative-operations.romaneio.import.decision.discard")}
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </PagedList>
    </>
  );
}

/**
 * Aba Duplicados — agrupada por certificado repetido. Hoje só dá pra
 * descartar o grupo (o Core já não importa duplicados); escolher qual linha
 * vale depende do Core reclassificar a linha escolhida.
 */
function DuplicatedTab({
  groups,
  discarded,
  onDiscard,
  search,
  page,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  groups: DuplicatedGroup[];
  discarded: Set<string>;
  onDiscard: (ids: string[], discarded: boolean) => void;
}) {
  const t = useT();
  const view = useFilteredPage(groups, duplicatedSearchText, search, page);
  const filteredIds = view.filtered.map((group) => group.certificado);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button size="sm" variant="outline-danger" onClick={() => onDiscard(filteredIds, true)}>
          {t("administrative-operations.romaneio.import.decision.discardAll", {
            count: String(filteredIds.length),
          })}
        </Button>
      </TabToolbar>
      <PagedList
        total={groups.length}
        filteredCount={view.filtered.length}
        page={view.page}
        totalPages={view.totalPages}
        onPageChange={onPageChange}
      >
        <ul className="list-group">
          {view.pageRows.map((group) => {
            const isDiscarded = discarded.has(group.certificado);
            return (
              <li
                key={group.certificado}
                className={`list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 ${isDiscarded ? "" : "list-group-item-warning"}`}
              >
                <span
                  className={`text-break ${isDiscarded ? "text-decoration-line-through text-body-secondary" : ""}`}
                >
                  <span className="fw-semibold">{group.certificado}</span>
                  {" — "}
                  {t("administrative-operations.romaneio.import.decision.duplicatedRows", {
                    rows: group.rows.map((row) => String(row.sheetRow ?? "")).join(", "),
                  })}
                </span>
                {isDiscarded ? (
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => onDiscard([group.certificado], false)}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1" aria-hidden="true" />
                    {t("administrative-operations.romaneio.import.decision.undo")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => onDiscard([group.certificado], true)}
                  >
                    <i className="bi bi-x-lg me-1" aria-hidden="true" />
                    {t("administrative-operations.romaneio.import.decision.discard")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </PagedList>
    </>
  );
}

/** Abas informativas (outra operação, sem alteração) — RF8. */
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

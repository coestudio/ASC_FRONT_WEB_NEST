import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Badge, Button, ButtonGroup, Form, Nav, Row, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  usePostApiOperationOperationIdRomaneioImportAnalyze,
  usePostApiOperationOperationIdRomaneioImportApply,
  usePostApiOperationOperationIdRomaneioImportImportIdDecide,
  usePostApiOperationOperationIdRomaneioImportImportIdDiscardRow,
  usePostApiOperationOperationIdRomaneioImportImportIdFixRow,
  usePostApiOperationOperationIdRomaneioImportImportIdResolveDuplicate,
} from "@/api/generated/endpoints/romaneio/romaneio";
import {
  PostApiOperationOperationIdRomaneioImportAnalyzeBody,
  PostApiOperationOperationIdRomaneioImportApplyBody,
  PostApiOperationOperationIdRomaneioImportImportIdDecideBody,
  PostApiOperationOperationIdRomaneioImportImportIdFixRowBody,
} from "@/api/generated/zod/romaneio/romaneio.zod";
import {
  RomaneioImportConflictDecision,
  RomaneioImportDuplicateDecision,
  RomaneioImportInvalidStatus,
  RomaneioImportMissingDecision,
  RomaneioImportNewDecision,
  type RomaneioImportAnalysisDTO,
  type RomaneioImportConflictDTO,
  type RomaneioImportDecide,
  type RomaneioImportDuplicateGroupDTO,
  type RomaneioImportForeignDTO,
  type RomaneioImportInvalidDTO,
  type RomaneioImportMissingItemDTO,
  type RomaneioImportNewItemDTO,
  type RomaneioImportRowDTO,
} from "@/api/generated/model";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ListPagination } from "@/components/ui/list-pagination";
import { Modal } from "@/components/ui/modal";
import type { TranslationKey } from "@/i18n/translate";
import { FilterText } from "@/layouts/Filters/Index";
import { InputFileSingle } from "@/layouts/Form/Fields/Index";
import { useT } from "@/lib/ui-prefs";
import { RomaneioFixRowModal } from "./RomaneioFixRowModal";
import type { RomaneioFormValues } from "./RomaneioForm";

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

/** Abas que carregam pendência (SPEC-100 RF13 / Core SPEC-55). */
type PendingTab = "new" | "missing" | "conflicts" | "invalid" | "duplicated";

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

/** RF3 — prioridade da aba inicial e ordem da "Próxima pendência". */
const PENDING_ORDER: PendingTab[] = ["conflicts", "missing", "new", "invalid", "duplicated"];

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

// ── Estado de cada item, sempre lido da análise devolvida pelo Core ──────
const isNewPending = (item: RomaneioImportNewItemDTO) =>
  (item.decision ?? RomaneioImportNewDecision.Pending) === RomaneioImportNewDecision.Pending;
const isMissingPending = (item: RomaneioImportMissingItemDTO) =>
  (item.decision ?? RomaneioImportMissingDecision.Pending) ===
  RomaneioImportMissingDecision.Pending;
const isConflictPending = (item: RomaneioImportConflictDTO) =>
  (item.decision ?? RomaneioImportConflictDecision.Pending) ===
  RomaneioImportConflictDecision.Pending;
const isInvalidPending = (item: RomaneioImportInvalidDTO) =>
  (item.status ?? RomaneioImportInvalidStatus.Pending) === RomaneioImportInvalidStatus.Pending;
const isDuplicatedPending = (item: RomaneioImportDuplicateGroupDTO) =>
  (item.decision ?? RomaneioImportDuplicateDecision.Pending) ===
  RomaneioImportDuplicateDecision.Pending;

const newKey = (item: RomaneioImportNewItemDTO) => item.row?.itemIdentifier ?? "";
const missingKey = (item: RomaneioImportMissingItemDTO) => item.romaneio?.itemIdentifier ?? "";
const conflictKey = (item: RomaneioImportConflictDTO) => item.incoming?.itemIdentifier ?? "";
const invalidKey = (item: RomaneioImportInvalidDTO) => String(item.sheetRow ?? "");
const duplicatedKey = (item: RomaneioImportDuplicateGroupDTO) => item.certificado ?? "";

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

/** Linha inválida em ajuste: a linha como estava ao abrir + erros mais recentes. */
type FixingState = { row: RomaneioImportInvalidDTO; errors: string[] };

/**
 * Wizard de import: etapa 1 (`analyze`, upload real via `InputFileSingle` —
 * SPEC-SHARE-01/CA4) → etapa 2 (revisão) → `apply`.
 *
 * SPEC-100: revisão em abas por categoria, busca e paginação local por aba
 * (planilhas de até ~2.500 linhas) e ações em massa.
 *
 * SPEC-100 RF13 / Core SPEC-55 — **nada é gravado até todas as pendências
 * estarem resolvidas**. O estado de decisão vive no snapshot da análise, no
 * servidor: cada ação da revisão chama um endpoint (`decide`, `fix-row`,
 * `discard-row`, `resolve-duplicate`) que só reescreve a análise e devolve
 * a versão nova, que substitui o estado local. O `apply` só recebe o
 * `importId` e o Core recusa (409) se ainda houver pendência — o botão
 * desabilitado aqui é só a mesma regra antecipada na tela. Todo payload
 * passa pelo schema gerado (`.parse`) antes do POST (regra 2).
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
  // Rascunho dos campos marcados por conflito (antes de "Aceitar").
  const [conflictDraft, setConflictDraft] = useState<Record<string, Set<string>>>({});
  const [activeTab, setActiveTab] = useState<ReviewTab>("new");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirmApply, setConfirmApply] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState<{
    kind: "invalid" | "duplicated";
    keys: string[];
  } | null>(null);
  const [fixing, setFixing] = useState<FixingState | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

  const analyzeMutation = usePostApiOperationOperationIdRomaneioImportAnalyze();
  const applyMutation = usePostApiOperationOperationIdRomaneioImportApply();
  const decideMutation = usePostApiOperationOperationIdRomaneioImportImportIdDecide();
  const fixRowMutation = usePostApiOperationOperationIdRomaneioImportImportIdFixRow();
  const discardRowMutation = usePostApiOperationOperationIdRomaneioImportImportIdDiscardRow();
  const resolveDuplicateMutation =
    usePostApiOperationOperationIdRomaneioImportImportIdResolveDuplicate();

  const busy =
    bulkRunning ||
    decideMutation.isPending ||
    fixRowMutation.isPending ||
    discardRowMutation.isPending ||
    resolveDuplicateMutation.isPending;

  const analyzeMethods = useForm<AnalyzeFormValues>({
    resolver: zodResolver(PostApiOperationOperationIdRomaneioImportAnalyzeBody),
    defaultValues: {},
  });
  const file = analyzeMethods.watch("File");

  const importId = analysis?.importId ?? "";
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

  // Contagem de pendências por aba (mesma regra do bloco `pending` do Core).
  const pending: Record<PendingTab, number> = {
    new: newRows.filter(isNewPending).length,
    missing: missingRows.filter(isMissingPending).length,
    conflicts: conflictRows.filter(isConflictPending).length,
    invalid: invalidRows.filter(isInvalidPending).length,
    duplicated: duplicatedRows.filter(isDuplicatedPending).length,
  };
  const pendingIndex: Record<PendingTab, number> = {
    new: newRows.findIndex(isNewPending),
    missing: missingRows.findIndex(isMissingPending),
    conflicts: conflictRows.findIndex(isConflictPending),
    invalid: invalidRows.findIndex(isInvalidPending),
    duplicated: duplicatedRows.findIndex(isDuplicatedPending),
  };
  const pendingTotal = Object.values(pending).reduce((sum, n) => sum + n, 0);

  const createCount = newRows.filter((i) => i.decision === RomaneioImportNewDecision.Create).length;
  const updateCount = conflictRows.filter(
    (i) => i.decision === RomaneioImportConflictDecision.Apply,
  ).length;
  const deleteCount = missingRows.filter(
    (i) => i.decision === RomaneioImportMissingDecision.Delete,
  ).length;
  const discardedCount =
    invalidRows.filter((i) => i.status === RomaneioImportInvalidStatus.Discarded).length +
    duplicatedRows.filter((i) => i.decision === RomaneioImportDuplicateDecision.DiscardedAll)
      .length;

  const conflictFieldsOf = (row: RomaneioImportConflictDTO) =>
    conflictDraft[conflictKey(row)] ??
    new Set(row.acceptedFields?.length ? row.acceptedFields : (row.diff ?? []));

  const handleAnalyze = analyzeMethods.handleSubmit(async (values) => {
    try {
      const result = await analyzeMutation.mutateAsync({ operationId, data: values });
      setAnalysis(result);
      setConflictDraft({});
      // RF3 — abre na primeira aba com pendência; sem pendência, na primeira com itens.
      const lists: Record<PendingTab, unknown[]> = {
        new: result.new ?? [],
        missing: result.missing ?? [],
        conflicts: result.conflicts ?? [],
        invalid: result.invalid ?? [],
        duplicated: result.duplicated ?? [],
      };
      const firstPending = PENDING_ORDER.find((tab) => lists[tab].length > 0);
      setActiveTab(firstPending ?? "new");
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

  /** Envia decisões em lote (`decide`) — Novos, Ausentes e Conflitos. */
  const decide = async (body: RomaneioImportDecide) => {
    if (!importId) return;
    try {
      const data = PostApiOperationOperationIdRomaneioImportImportIdDecideBody.parse(body);
      const result = await decideMutation.mutateAsync({ operationId, importId, data });
      setAnalysis(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(t("administrative-operations.romaneio.import.toast.applyError"));
      }
      // erro HTTP já notificado pelo interceptor global (mutator.ts)
    }
  };

  const decideNew = (items: RomaneioImportNewItemDTO[], create: boolean) =>
    decide({ newDecisions: items.map((i) => ({ certificado: newKey(i), create })) });

  const decideMissing = (items: RomaneioImportMissingItemDTO[], del: boolean) =>
    decide({ missingDecisions: items.map((i) => ({ certificado: missingKey(i), delete: del })) });

  const decideConflicts = (items: RomaneioImportConflictDTO[], accept: boolean) =>
    decide({
      conflictDecisions: items.map((i) =>
        accept
          ? { certificado: conflictKey(i), fields: Array.from(conflictFieldsOf(i)) }
          : { certificado: conflictKey(i), ignore: true },
      ),
    });

  const toggleConflictField = (row: RomaneioImportConflictDTO, field: string) =>
    setConflictDraft((prev) => {
      const current = new Set(conflictFieldsOf(row));
      if (current.has(field)) current.delete(field);
      else current.add(field);
      return { ...prev, [conflictKey(row)]: current };
    });

  /**
   * Descartes (`discard-row` / `resolve-duplicate`) são um por chamada e não
   * têm desfazer. Em lote, as chamadas são **sequenciais**: todas reescrevem
   * o mesmo snapshot no servidor, e em paralelo uma sobrescreveria a outra.
   * Se uma falhar no meio, a análise fica com o que já foi aplicado até ali.
   */
  const runDiscard = async (kind: "invalid" | "duplicated", keys: string[]) => {
    if (!importId || keys.length === 0) return;
    setBulkRunning(true);
    try {
      for (const key of keys) {
        const result =
          kind === "invalid"
            ? await discardRowMutation.mutateAsync({
                operationId,
                importId,
                data: { sheetRow: Number(key) },
              })
            : await resolveDuplicateMutation.mutateAsync({
                operationId,
                importId,
                data: { certificado: key, discardAll: true },
              });
        setAnalysis(result);
      }
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro
    } finally {
      setBulkRunning(false);
    }
  };

  const keepDuplicateRow = async (group: RomaneioImportDuplicateGroupDTO, sheetRow: string) => {
    if (!importId) return;
    try {
      const result = await resolveDuplicateMutation.mutateAsync({
        operationId,
        importId,
        data: { certificado: duplicatedKey(group), keepSheetRow: Number(sheetRow) },
      });
      setAnalysis(result);
      toast.success(
        t("administrative-operations.romaneio.import.decision.keptRow", { row: sheetRow }),
      );
    } catch {
      // interceptor global (mutator.ts) já mostra o toast de erro
    }
  };

  /** Onde a linha corrigida foi parar depois da reclassificação do Core. */
  const destinationOf = (
    result: RomaneioImportAnalysisDTO,
    certificado: string,
  ): ReviewTab | null => {
    if ((result.duplicated ?? []).some((g) => g.certificado === certificado)) return "duplicated";
    if ((result.new ?? []).some((i) => i.row?.itemIdentifier === certificado)) return "new";
    if ((result.conflicts ?? []).some((i) => i.incoming?.itemIdentifier === certificado))
      return "conflicts";
    if ((result.foreign ?? []).some((i) => i.incoming?.itemIdentifier === certificado))
      return "foreign";
    if ((result.unchangedCertificados ?? []).includes(certificado)) return "unchanged";
    return null;
  };

  const handleFixSubmit = async (values: RomaneioFormValues) => {
    if (!fixing || !importId) return;
    const sheetRow = invalidKey(fixing.row);
    try {
      const data = PostApiOperationOperationIdRomaneioImportImportIdFixRowBody.parse({
        ...values,
        sheetRow: Number(sheetRow),
      });
      const result = await fixRowMutation.mutateAsync({ operationId, importId, data });
      setAnalysis(result);

      const stillInvalid = (result.invalid ?? []).find(
        (i) => invalidKey(i) === sheetRow && isInvalidPending(i),
      );
      if (stillInvalid) {
        setFixing({ row: fixing.row, errors: stillInvalid.errors ?? [] });
        toast.warn(t("administrative-operations.romaneio.import.fix.stillInvalid"));
        return;
      }

      const destination = destinationOf(result, (values.itemIdentifier ?? "").trim());
      toast.success(
        t("administrative-operations.romaneio.import.fix.movedTo", {
          row: sheetRow,
          category: destination ? t(TAB_LABELS[destination]) : "—",
        }),
      );
      setFixing(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(t("administrative-operations.romaneio.import.toast.applyError"));
      }
      // erro HTTP já notificado pelo interceptor global; o modal fica aberto
    }
  };

  const applyImport = async () => {
    if (!importId) return;
    try {
      const payload = PostApiOperationOperationIdRomaneioImportApplyBody.parse({ importId });
      const result = await applyMutation.mutateAsync({ operationId, data: payload });
      const created = Number(result.created ?? 0);
      const updated = Number(result.updated ?? 0);
      const deleted = Number(result.deleted ?? 0);

      // BUGFIX (investigação do fluxo de import — ver relatório da branch
      // fix/sidebar-romaneio-import-acoes): o Core responde 200 mesmo quando
      // nada foi criado/atualizado/excluído (ex.: tudo "sem alteração" ou
      // descartado). Avisa em vez de comemorar um no-op.
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
      if (err instanceof z.ZodError) {
        toast.error(t("administrative-operations.romaneio.import.toast.applyError"));
      }
    }
  };

  const step: "upload" | "review" = analysis ? "review" : "upload";
  const tabProps = { search, page, busy, onPageChange: setPage, onSearchChange: changeSearch };
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
              <NewTab {...tabProps} rows={newRows} onDecide={decideNew} />
            ) : null}

            {activeTab === "missing" ? (
              <MissingTab {...tabProps} rows={missingRows} onDecide={decideMissing} />
            ) : null}

            {activeTab === "conflicts" ? (
              <ConflictsTab
                {...tabProps}
                rows={conflictRows}
                fieldsOf={conflictFieldsOf}
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
                onFix={(row) => setFixing({ row, errors: row.errors ?? [] })}
                onDiscard={(keys) => setConfirmDiscard({ kind: "invalid", keys })}
              />
            ) : null}

            {activeTab === "duplicated" ? (
              <DuplicatedTab
                {...tabProps}
                groups={duplicatedRows}
                onKeep={keepDuplicateRow}
                onDiscard={(keys) => setConfirmDiscard({ kind: "duplicated", keys })}
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
              {busy ? <Spinner size="sm" animation="border" className="me-2" /> : null}
              {t("administrative-operations.romaneio.import.review.footerSummary", {
                created: String(createCount),
                updated: String(updateCount),
                deleted: String(deleteCount),
              })}
              {pendingTotal > 0
                ? ` · ${t("administrative-operations.romaneio.import.pending.footer", {
                    count: String(pendingTotal),
                  })}`
                : null}
            </span>
            <div className="d-flex flex-wrap gap-2 ms-auto">
              <Button variant="outline-primary" onClick={() => setAnalysis(null)} disabled={busy}>
                {t("administrative-operations.romaneio.import.back")}
              </Button>
              <Button variant="outline-primary" onClick={onClose}>
                {t("administrative-operations.romaneio.import.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={() => setConfirmApply(true)}
                disabled={pendingTotal > 0 || busy || applyMutation.isPending}
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

      {fixing ? (
        <RomaneioFixRowModal
          row={fixing.row}
          errors={fixing.errors}
          onSubmit={handleFixSubmit}
          onClose={() => setFixing(null)}
        />
      ) : null}

      {/* Descarte não tem desfazer no Core — sempre confirma. */}
      <ConfirmationModal
        show={confirmDiscard !== null}
        variant="danger"
        title={t("administrative-operations.romaneio.import.confirmDiscard.title")}
        message={t("administrative-operations.romaneio.import.confirmDiscard.message", {
          count: String(confirmDiscard?.keys.length ?? 0),
        })}
        confirmLabel={t("administrative-operations.romaneio.import.confirmDiscard.confirm")}
        cancelLabel={t("administrative-operations.romaneio.import.cancel")}
        onCancel={() => setConfirmDiscard(null)}
        onConfirm={async () => {
          if (confirmDiscard) await runDiscard(confirmDiscard.kind, confirmDiscard.keys);
          setConfirmDiscard(null);
        }}
      />

      {/* RF10/RF13 — resumo final antes de gravar; vermelho quando há exclusão. */}
      <ConfirmationModal
        show={confirmApply}
        variant={deleteCount > 0 ? "danger" : "primary"}
        title={t("administrative-operations.romaneio.import.confirmApply.title")}
        message={t("administrative-operations.romaneio.import.confirmApply.message", {
          created: String(createCount),
          updated: String(updateCount),
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
function newSearchText(item: RomaneioImportNewItemDTO): string {
  return rowSearchText(item.row);
}

function missingSearchText(item: RomaneioImportMissingItemDTO): string {
  const r = item.romaneio;
  return searchText(r?.itemIdentifier, r?.itemCode, r?.lote, r?.notaFiscal);
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

function duplicatedSearchText(group: RomaneioImportDuplicateGroupDTO): string {
  return searchText(group.certificado, ...(group.rows ?? []).map(rowSearchText));
}

function unchangedSearchText(certificado: string): string {
  return certificado.toLowerCase();
}

type PagedTabProps = {
  search: string;
  page: number;
  busy: boolean;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
};

/** Barra da aba: busca à esquerda, ações em massa à direita. */
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

/** Classe de destaque de item pendente. */
const pendingClass = (isPending: boolean) => (isPending ? "list-group-item-warning" : "");

/** Aba Novos — decisão Criar/Não criar por fardo e em massa. */
function NewTab({
  rows,
  onDecide,
  search,
  page,
  busy,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: RomaneioImportNewItemDTO[];
  onDecide: (items: RomaneioImportNewItemDTO[], create: boolean) => void;
}) {
  const t = useT();
  const view = useFilteredPage(rows, newSearchText, search, page);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button
          size="sm"
          variant="outline-primary"
          disabled={busy}
          onClick={() => onDecide(view.filtered, true)}
        >
          {t("administrative-operations.romaneio.import.decision.createAll", {
            count: String(view.filtered.length),
          })}
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={busy}
          onClick={() => onDecide(view.filtered, false)}
        >
          {t("administrative-operations.romaneio.import.decision.skipAll", {
            count: String(view.filtered.length),
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
          {view.pageRows.map((item) => {
            const row = item.row;
            const decision = item.decision;
            return (
              <div
                key={newKey(item)}
                className={`list-group-item d-flex flex-wrap align-items-center gap-2 ${pendingClass(isNewPending(item))}`}
              >
                <span className="fw-semibold text-break">{row?.itemIdentifier}</span>
                <span className="text-body-secondary small">
                  {row?.itemCode} · {row?.lote} · {row?.peso != null ? String(row.peso) : "—"} kg
                </span>
                <ButtonGroup size="sm" className="ms-auto">
                  <Button
                    variant={
                      decision === RomaneioImportNewDecision.Create ? "primary" : "outline-primary"
                    }
                    disabled={busy}
                    onClick={() => onDecide([item], true)}
                  >
                    {t("administrative-operations.romaneio.import.decision.create")}
                  </Button>
                  <Button
                    variant={
                      decision === RomaneioImportNewDecision.Skip
                        ? "secondary"
                        : "outline-secondary"
                    }
                    disabled={busy}
                    onClick={() => onDecide([item], false)}
                  >
                    {t("administrative-operations.romaneio.import.decision.skip")}
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

/** Aba Ausentes — decisão explícita Manter/Excluir por fardo (RF13). */
function MissingTab({
  rows,
  onDecide,
  search,
  page,
  busy,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: RomaneioImportMissingItemDTO[];
  onDecide: (items: RomaneioImportMissingItemDTO[], del: boolean) => void;
}) {
  const t = useT();
  const view = useFilteredPage(rows, missingSearchText, search, page);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button
          size="sm"
          variant="outline-primary"
          disabled={busy}
          onClick={() => onDecide(view.filtered, false)}
        >
          {t("administrative-operations.romaneio.import.decision.keepAll", {
            count: String(view.filtered.length),
          })}
        </Button>
        <Button
          size="sm"
          variant="outline-danger"
          disabled={busy}
          onClick={() => onDecide(view.filtered, true)}
        >
          {t("administrative-operations.romaneio.import.decision.deleteAll", {
            count: String(view.filtered.length),
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
          {view.pageRows.map((item) => {
            const decision = item.decision;
            return (
              <div
                key={missingKey(item)}
                className={`list-group-item d-flex flex-wrap align-items-center gap-2 ${pendingClass(isMissingPending(item))}`}
              >
                <span className="fw-semibold text-break">{item.romaneio?.itemIdentifier}</span>
                <span className="text-body-secondary small">
                  {item.romaneio?.itemCode} · {item.romaneio?.lote}
                </span>
                <ButtonGroup size="sm" className="ms-auto">
                  <Button
                    variant={
                      decision === RomaneioImportMissingDecision.Keep
                        ? "primary"
                        : "outline-primary"
                    }
                    disabled={busy}
                    onClick={() => onDecide([item], false)}
                  >
                    {t("administrative-operations.romaneio.import.decision.keep")}
                  </Button>
                  <Button
                    variant={
                      decision === RomaneioImportMissingDecision.Delete
                        ? "danger"
                        : "outline-danger"
                    }
                    disabled={busy}
                    onClick={() => onDecide([item], true)}
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
  fieldsOf,
  onToggleField,
  onDecide,
  search,
  page,
  busy,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: RomaneioImportConflictDTO[];
  fieldsOf: (row: RomaneioImportConflictDTO) => Set<string>;
  onToggleField: (row: RomaneioImportConflictDTO, field: string) => void;
  onDecide: (rows: RomaneioImportConflictDTO[], accept: boolean) => void;
}) {
  const t = useT();
  const view = useFilteredPage(rows, conflictSearchText, search, page);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button
          size="sm"
          variant="outline-primary"
          disabled={busy}
          onClick={() => onDecide(view.filtered, true)}
        >
          {t("administrative-operations.romaneio.import.review.acceptAllFields")}
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={busy}
          onClick={() => onDecide(view.filtered, false)}
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
            const selected = fieldsOf(conflict);
            const decision = conflict.decision;
            const isPending = isConflictPending(conflict);
            const ignored = decision === RomaneioImportConflictDecision.Ignore;
            return (
              <div
                key={certificado}
                className={`border rounded p-2 ${isPending ? "border-warning" : ""}`}
              >
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span className="fw-semibold text-break">{certificado}</span>
                  <Badge
                    bg={isPending ? "warning" : ignored ? "secondary" : "success"}
                    text={isPending ? "dark" : undefined}
                  >
                    {t(
                      isPending
                        ? "administrative-operations.romaneio.import.decision.pending"
                        : ignored
                          ? "administrative-operations.romaneio.import.decision.ignored"
                          : "administrative-operations.romaneio.import.decision.accepted",
                    )}
                  </Badge>
                  <ButtonGroup size="sm" className="ms-auto">
                    <Button
                      variant={
                        decision === RomaneioImportConflictDecision.Apply
                          ? "primary"
                          : "outline-primary"
                      }
                      disabled={busy || selected.size === 0}
                      onClick={() => onDecide([conflict], true)}
                    >
                      {t("administrative-operations.romaneio.import.decision.accept")}
                    </Button>
                    <Button
                      variant={ignored ? "secondary" : "outline-secondary"}
                      disabled={busy}
                      onClick={() => onDecide([conflict], false)}
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
                      disabled={busy}
                      label={t(
                        DIFF_FIELD_LABELS[field] ??
                          "administrative-operations.romaneio.import.fields.itemCode",
                      )}
                      checked={selected.has(field)}
                      onChange={() => onToggleField(conflict, field)}
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
 * Aba Inválidos — cada linha precisa ser ajustada (`fix-row`: o Core
 * revalida e reclassifica, sem gravar nada) ou descartada (`discard-row`,
 * sem desfazer). Linha descartada fica riscada e não conta como pendência.
 */
function InvalidTab({
  rows,
  onFix,
  onDiscard,
  search,
  page,
  busy,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  rows: RomaneioImportInvalidDTO[];
  onFix: (row: RomaneioImportInvalidDTO) => void;
  onDiscard: (keys: string[]) => void;
}) {
  const t = useT();
  const view = useFilteredPage(rows, invalidSearchText, search, page);
  const pendingKeys = view.filtered.filter(isInvalidPending).map(invalidKey);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button
          size="sm"
          variant="outline-danger"
          disabled={busy || pendingKeys.length === 0}
          onClick={() => onDiscard(pendingKeys)}
        >
          {t("administrative-operations.romaneio.import.decision.discardAll", {
            count: String(pendingKeys.length),
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
            const isPending = isInvalidPending(row);
            return (
              <li
                key={key}
                className={`list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 ${pendingClass(isPending)}`}
              >
                <span
                  className={`text-break ${isPending ? "" : "text-decoration-line-through text-body-secondary"}`}
                >
                  <span className="fw-semibold">
                    {t("administrative-operations.romaneio.import.sheetRowLabel", {
                      row: String(row.sheetRow ?? ""),
                    })}
                  </span>
                  {" — "}
                  {(row.errors ?? []).join(", ")}
                </span>
                {isPending ? (
                  <span className="d-flex flex-shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      disabled={busy}
                      onClick={() => onFix(row)}
                    >
                      <i className="bi bi-pencil me-1" aria-hidden="true" />
                      {t("administrative-operations.romaneio.import.fix.button")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={busy}
                      onClick={() => onDiscard([key])}
                    >
                      <i className="bi bi-x-lg me-1" aria-hidden="true" />
                      {t("administrative-operations.romaneio.import.decision.discard")}
                    </Button>
                  </span>
                ) : (
                  <Badge bg="secondary">
                    {t("administrative-operations.romaneio.import.decision.discarded")}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </PagedList>
    </>
  );
}

/**
 * Aba Duplicados — agrupada por certificado repetido. Resolver = escolher
 * qual linha vale (o Core reclassifica essa linha e descarta as outras) ou
 * descartar todas. Nenhuma das duas tem desfazer.
 */
function DuplicatedTab({
  groups,
  onKeep,
  onDiscard,
  search,
  page,
  busy,
  onPageChange,
  onSearchChange,
}: PagedTabProps & {
  groups: RomaneioImportDuplicateGroupDTO[];
  onKeep: (group: RomaneioImportDuplicateGroupDTO, sheetRow: string) => void;
  onDiscard: (keys: string[]) => void;
}) {
  const t = useT();
  const view = useFilteredPage(groups, duplicatedSearchText, search, page);
  const pendingKeys = view.filtered.filter(isDuplicatedPending).map(duplicatedKey);

  return (
    <>
      <TabToolbar search={search} onSearchChange={onSearchChange}>
        <Button
          size="sm"
          variant="outline-danger"
          disabled={busy || pendingKeys.length === 0}
          onClick={() => onDiscard(pendingKeys)}
        >
          {t("administrative-operations.romaneio.import.decision.discardAll", {
            count: String(pendingKeys.length),
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
        <div className="d-flex flex-column gap-2">
          {view.pageRows.map((group) => {
            const isPending = isDuplicatedPending(group);
            const keep = group.keepSheetRow != null ? String(group.keepSheetRow) : null;
            return (
              <div
                key={duplicatedKey(group)}
                className={`border rounded p-2 ${isPending ? "border-warning" : ""}`}
              >
                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                  <span className="fw-semibold text-break">{group.certificado}</span>
                  <Badge
                    bg={isPending ? "warning" : keep ? "success" : "secondary"}
                    text={isPending ? "dark" : undefined}
                  >
                    {isPending
                      ? t("administrative-operations.romaneio.import.decision.pending")
                      : keep
                        ? t("administrative-operations.romaneio.import.decision.keptRow", {
                            row: keep,
                          })
                        : t("administrative-operations.romaneio.import.decision.discarded")}
                  </Badge>
                  {isPending ? (
                    <Button
                      size="sm"
                      variant="outline-danger"
                      className="ms-auto"
                      disabled={busy}
                      onClick={() => onDiscard([duplicatedKey(group)])}
                    >
                      <i className="bi bi-x-lg me-1" aria-hidden="true" />
                      {t("administrative-operations.romaneio.import.decision.discardAllRows")}
                    </Button>
                  ) : null}
                </div>
                <ul className="list-group list-group-flush">
                  {(group.rows ?? []).map((row) => {
                    const sheetRow = String(row.sheetRow ?? "");
                    return (
                      <li
                        key={sheetRow}
                        className="list-group-item d-flex flex-wrap align-items-center gap-2 px-0"
                      >
                        <span className="fw-semibold">
                          {t("administrative-operations.romaneio.import.sheetRowLabel", {
                            row: sheetRow,
                          })}
                        </span>
                        <span className="text-body-secondary small text-break">
                          {row.itemCode} · {row.lote} · {row.notaFiscal} ·{" "}
                          {row.peso != null ? String(row.peso) : "—"} kg
                        </span>
                        {isPending ? (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="ms-auto"
                            disabled={busy}
                            onClick={() => onKeep(group, sheetRow)}
                          >
                            {t("administrative-operations.romaneio.import.decision.keepThisRow")}
                          </Button>
                        ) : keep === sheetRow ? (
                          <i
                            className="bi bi-check-circle-fill text-success ms-auto"
                            aria-hidden="true"
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
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

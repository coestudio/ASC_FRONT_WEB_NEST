import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Nav, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";

import {
  getGetApiOperationIdQueryOptions,
  usePatchApiOperationIdStatus,
} from "@/api/generated/endpoints/operation/operation";
import { PatchApiOperationIdStatusBody } from "@/api/generated/zod/operation/operation.zod";
import type { OperationDetailDTO, OperationStatus } from "@/api/generated/model";
import {
  operationStatusOptions,
  resolveOperationStatusLabel,
} from "@/api/generated/static/operationStatusOptions";
import { resolveOperationTypeLabel } from "@/api/generated/static/operationTypeOptions";
import { resolveOperationServiceLabel } from "@/api/generated/static/operationServiceOptions";
import { Log } from "@/components/operations/tabs/Log";
import { Reports } from "@/components/operations/tabs/Reports";
import { Select } from "@/layouts/Form/Fields/Index";
import { PageLayout } from "@/layouts/PageLayout";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
import { useLocale, useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

export const Route = createFileRoute("/_dashboard/_internal/administrative/operations/$id/")({
  head: () => ({ meta: [{ title: "Operação — ASC" }] }),
  component: OperationShellPage,
});

/**
 * As 7 abas do detalhe (D2 da SPEC-07-02, §13): estado local do shell, sem
 * sub-rota — o conteúdo real de cada uma (SPEC-07-03 a SPEC-07-09) ainda não
 * existe, então cada aba mostra o mesmo placeholder genérico por enquanto.
 */
type Tab = "details" | "romaneio" | "containers" | "documents" | "reports" | "responsible" | "log";

const TABS: { key: Tab; labelKey: TranslationKey }[] = [
  { key: "details", labelKey: "administrative-operations.shell.tabs.details" },
  { key: "romaneio", labelKey: "administrative-operations.shell.tabs.romaneio" },
  { key: "containers", labelKey: "administrative-operations.shell.tabs.containers" },
  { key: "documents", labelKey: "administrative-operations.shell.tabs.documents" },
  { key: "reports", labelKey: "administrative-operations.shell.tabs.reports" },
  { key: "responsible", labelKey: "administrative-operations.shell.tabs.responsible" },
  { key: "log", labelKey: "administrative-operations.shell.tabs.log" },
];

/**
 * A rota só resolve o `id` (via `useParams`) — a busca de verdade (que
 * dispara o hook gerado) só é montada depois da hidratação (`mounted`),
 * mesmo padrão de `CrudListPage` (SPEC-10): garante que o `useQuery` nunca
 * existe na árvore durante o SSR, em vez de só depender de `enabled: false`.
 */
function OperationShellPage() {
  const { id } = Route.useParams();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <PageLayout density="wide">
      {mounted ? (
        <OperationShellBody id={id} />
      ) : (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}
    </PageLayout>
  );
}

function OperationShellBody({ id }: { id: string }) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("details");
  // RF3 da SPEC-07-02: resolve o registro pai uma única vez aqui — as abas
  // reais (SPEC-07-03 a 07-09) recebem o `id`/`operation` por prop, sem
  // refazer a própria busca do pai.
  const query = useSsrSafeQuery(getGetApiOperationIdQueryOptions(id));

  if (query.isLoading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  // RF2 da SPEC-07-02: nunca some silenciosamente (bug conhecido do legado,
  // `mockOperation &&` sem feedback) — todo estado sem dado mostra um alerta
  // explícito, nunca um `null`/`undefined` renderizado à toa.
  if (query.isError || !query.data) {
    return (
      <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
        <span>{t("administrative-operations.shell.loadError")}</span>
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => query.refetch()}
        >
          {t("administrative-operations.shell.retry")}
        </button>
      </div>
    );
  }

  const operation = query.data;

  return (
    <>
      <OperationHeader operation={operation} />

      <Nav
        variant="tabs"
        activeKey={tab}
        onSelect={(key) => setTab((key as Tab | null) ?? "details")}
        className="mb-3"
      >
        {TABS.map((item) => (
          <Nav.Item key={item.key}>
            <Nav.Link eventKey={item.key}>{t(item.labelKey)}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      <section>
        {/* Conteúdo de cada aba é escopo de SPEC-07-03 a SPEC-07-09 — este
            shell só monta o placeholder até a aba real existir. Relatórios
            (SPEC-07-07) e Log (SPEC-07-09) já são reais (mock, UI-only). */}
        {tab === "reports" ? (
          <Reports operationId={operation.id} />
        ) : tab === "log" ? (
          <Log operationId={operation.id} />
        ) : (
          <div className="text-center text-body-secondary py-5">
            <i className="bi bi-hourglass-split fs-3 d-block mb-2" aria-hidden />
            <p className="mb-0">{t("administrative-operations.shell.tabPlaceholder")}</p>
          </div>
        )}
      </section>
    </>
  );
}

type StatusFormValues = { status: OperationStatus };

/**
 * Cabeçalho com os dados básicos da operação (número, cliente, tipo,
 * serviço) e a troca de status — um único `Select` (SPEC-SHARE-01) que
 * dispara o PATCH assim que o usuário escolhe uma opção nova, sem botão de
 * salvar (mesmo comportamento do `Form.Select` do legado,
 * `Operations/Detail.tsx`). É "formulário" de um campo só, mesmo padrão de
 * `ListSearchInput` (`crud-list-page.tsx`): `useForm` local + `watch` +
 * efeito, aqui com `zodResolver` sobre o schema gerado
 * (`PatchApiOperationIdStatusBody`) porque o valor vai direto pro PATCH do
 * Core.
 */
function OperationHeader({ operation }: { operation: OperationDetailDTO }) {
  const t = useT();
  const locale = useLocale();
  const statusMutation = usePatchApiOperationIdStatus();

  const methods = useForm<StatusFormValues>({
    resolver: zodResolver(PatchApiOperationIdStatusBody),
    defaultValues: { status: operation.status },
  });
  const status = methods.watch("status");

  useEffect(() => {
    if (status !== operation.status) methods.setValue("status", operation.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operation.status]);

  useEffect(() => {
    if (status === operation.status) return;
    statusMutation.mutate(
      { id: operation.id, data: { status } },
      {
        onSuccess: () => toast.success(t("administrative-operations.shell.statusUpdated")),
        onError: () => {
          toast.error(t("administrative-operations.shell.statusError"));
          methods.setValue("status", operation.status);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <section className="soft-card mb-4">
      <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
        <div>
          <div className="text-body-secondary small">
            {t("administrative-operations.shell.eyebrow", { number: String(operation.number) })}
          </div>
          <h1 className="h4 fw-semibold mt-1 mb-2">{operation.client.fullName}</h1>
          <div className="d-flex flex-wrap gap-2">
            <span className="badge text-bg-secondary">
              {resolveOperationTypeLabel(operation.opType, locale)}
            </span>
            <span className="badge text-bg-secondary">
              {resolveOperationServiceLabel(operation.opService, locale)}
            </span>
            <span className="badge text-bg-primary">
              {resolveOperationStatusLabel(operation.status, locale)}
            </span>
          </div>
        </div>
        <div style={{ minWidth: 220 }}>
          <Select<StatusFormValues>
            methods={methods}
            fieldName="status"
            label={t("administrative-operations.shell.statusLabel")}
            enumOptions={operationStatusOptions}
            config={{ containerClass: "mb-0" }}
          />
        </div>
      </div>
    </section>
  );
}

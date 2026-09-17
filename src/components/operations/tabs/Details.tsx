import { useState } from "react";
import { Button, Col, Row } from "react-bootstrap";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import {
  getGetApiOperationIdQueryKey,
  usePutApiOperationId,
} from "@/api/generated/endpoints/operation/operation";
import { PutApiOperationIdBody } from "@/api/generated/zod/operation/operation.zod";
import type { OperationDetailDTO } from "@/api/generated/model";
import { CrudRecordModal } from "@/components/crud/crud-record-modal";
import {
  buildOperationEditFields,
  operationEditDefaultValues,
  type OperationEditValues,
} from "@/components/operations/operation-edit-fields";
import type { Locale } from "@/i18n/config";
import { useLocale, useT } from "@/lib/ui-prefs";

/**
 * Data `yyyy-mm-dd`/ISO completo → `dd/mm/aaaa` — mesmo corte de
 * `formatDate` de `operations-list.tsx` (sem util compartilhado hoje no
 * projeto; duplicado aqui como no restante da base).
 */
function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return "—";
  return new Date(value.slice(0, 10)).toLocaleDateString(locale, { timeZone: "UTC" });
}

/**
 * Linha rótulo/valor — rótulo pequeno/discreto acima, valor em destaque
 * abaixo (mesmo padrão já usado no mock de `operational/operations/$id`),
 * em vez do "**Rótulo:** valor" inline anterior: com várias colunas lado a
 * lado o par bold+dois-pontos ficava difícil de escanear rápido; rótulo e
 * valor em linhas separadas dá mais hierarquia visual sem gastar mais
 * espaço vertical que o gap (`g-3`) já reservava.
 */
function DetailField({ label, value, md = 4 }: { label: string; value: string; md?: number }) {
  return (
    <Col md={md}>
      <div className="small text-body-secondary">{label}</div>
      <div className="fw-semibold">{value || "—"}</div>
    </Col>
  );
}

/** Título de seção com ícone — mesma ideia das abas do shell (ícone + texto),
 * pra dar um ponto de referência visual rápido em cada bloco da aba. */
function SectionTitle({ icon, children }: { icon: string; children: string }) {
  return (
    <h2 className="h6 text-body-secondary text-uppercase mb-3 d-flex align-items-center gap-2">
      <i className={`bi ${icon}`} aria-hidden />
      {children}
    </h2>
  );
}

/**
 * Aba **Detalhes** (SPEC-07-03) — dados cadastrais da Operação, real
 * (`OperationDetailDTO`, já resolvido pelo shell). A troca de status
 * (RF2 da SPEC-07-03) já está no cabeçalho comum do shell (`OperationHeader`,
 * SPEC-07-02) — visível em qualquer aba, não duplicada aqui; esta aba mostra
 * o restante dos dados cadastrais que o cabeçalho não cobre.
 *
 * SPEC-33: botão "Editar" que abre o mesmo `CrudRecordModal<OperationEditValues>`
 * já usado na listagem (`operations-list.tsx`), reaproveitando
 * `editFields`/`OperationEditValues`/`usePutApiOperationId` a partir do
 * módulo compartilhado `operation-edit-fields.ts` — nenhum campo novo,
 * `booking`/`instruction` fora do escopo (não fazem parte de
 * `OperationUpdate`, ver spec).
 */
export function OperationDetailsTab({ operation }: { operation: OperationDetailDTO }) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const updateMutation = usePutApiOperationId();

  const handleEditSubmit = async (values: OperationEditValues) => {
    try {
      await updateMutation.mutateAsync({ id: operation.id, data: values });
      toast.success(t("administrative-operations.toast.updated"));
      queryClient.invalidateQueries({ queryKey: getGetApiOperationIdQueryKey(operation.id) });
      setEditOpen(false);
    } catch {
      toast.error(t("administrative-operations.toast.error"));
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex justify-content-end">
        <Button variant="outline-primary" size="sm" onClick={() => setEditOpen(true)}>
          <i className="bi bi-pencil me-1" aria-hidden />
          {t("administrative-operations.details.editButton")}
        </Button>
      </div>

      <section className="soft-card p-4">
        <SectionTitle icon="bi-person">
          {t("administrative-operations.details.clientSection")}
        </SectionTitle>
        <Row className="g-3">
          <DetailField
            label={t("administrative-operations.form.client")}
            value={operation.client.fullName}
            md={6}
          />
          <DetailField
            label={t("administrative-operations.details.document")}
            value={operation.client.document ?? ""}
            md={6}
          />
          <DetailField
            label={t("administrative-operations.details.phone")}
            value={operation.client.phone ?? ""}
            md={6}
          />
          <DetailField
            label={t("administrative-operations.details.email")}
            value={operation.client.email ?? ""}
            md={6}
          />
        </Row>
      </section>

      <section className="soft-card p-4">
        <SectionTitle icon="bi-box-seam">
          {t("administrative-operations.details.productSection")}
        </SectionTitle>
        <Row className="g-3">
          <DetailField
            label={t("administrative-operations.form.product")}
            value={operation.product.name}
            md={6}
          />
          <DetailField
            label={t("administrative-operations.form.vessel")}
            value={operation.vessel?.name ?? t("administrative-operations.details.vesselEmpty")}
            md={6}
          />
          <DetailField
            label={t("administrative-operations.detail.booking")}
            value={operation.booking ?? ""}
            md={6}
          />
          <DetailField
            label={t("administrative-operations.detail.instruction")}
            value={operation.instruction ?? ""}
            md={6}
          />
        </Row>
      </section>

      <section className="soft-card p-4">
        <SectionTitle icon="bi-calendar3">
          {t("administrative-operations.details.datesSection")}
        </SectionTitle>
        <Row className="g-3">
          <DetailField
            label={t("administrative-operations.form.nameDate")}
            value={formatDate(operation.nameDate, locale)}
          />
          <DetailField
            label={t("administrative-operations.form.opDate")}
            value={formatDate(operation.opDate, locale)}
          />
          <DetailField
            label={t("administrative-operations.form.startDate")}
            value={formatDate(operation.startDate, locale)}
          />
          <DetailField
            label={t("administrative-operations.details.createdAt")}
            value={formatDate(operation.createdAt, locale)}
          />
          <DetailField
            label={t("administrative-operations.details.updatedAt")}
            value={formatDate(operation.updatedAt, locale)}
          />
        </Row>
      </section>

      <section className="soft-card p-4">
        <SectionTitle icon="bi-chat-left-text">
          {t("administrative-operations.form.observation")}
        </SectionTitle>
        <p className="mb-0">{operation.observation || "—"}</p>
      </section>

      {editOpen ? (
        <CrudRecordModal<OperationEditValues>
          show
          mode="edit"
          titleKeys={{
            create: "administrative-operations.newTitle",
            edit: "administrative-operations.editTitle",
            view: "administrative-operations.viewTitle",
          }}
          schema={PutApiOperationIdBody}
          fields={buildOperationEditFields({ t, record: operation })}
          defaultValues={operationEditDefaultValues(operation)}
          onSubmit={handleEditSubmit}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </div>
  );
}

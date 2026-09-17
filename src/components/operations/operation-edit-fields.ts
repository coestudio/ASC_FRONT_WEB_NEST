import { z } from "zod";

import { getApiClient } from "@/api/generated/endpoints/client/client";
import { getApiProduct } from "@/api/generated/endpoints/product/product";
import { getApiVessel } from "@/api/generated/endpoints/vessel/vessel";
import { PutApiOperationIdBody } from "@/api/generated/zod/operation/operation.zod";
import type { OperationDetailDTO } from "@/api/generated/model";
import type { LayoutField } from "@/layouts/Form/Fields/Index";
import type { TranslationKey } from "@/i18n/translate";

/**
 * Shape de edição de Operação (`PUT /api/operation/{id}`) — schema gerado
 * pelo Orval (regra 2 do AGENTS.md, zero Zod escrito à mão). Extraído de
 * `operations-list.tsx` (SPEC-33) pra ser reaproveitado também pela aba
 * Detalhes do shell (`Details.tsx`) sem duplicar a definição de campos.
 * `booking`/`instruction` não fazem parte de `OperationUpdate` — fora do
 * escopo desta edição (fora do escopo da SPEC-33, precisaria de mudança no
 * Core).
 */
export type OperationEditValues = z.infer<typeof PutApiOperationIdBody>;

/** Valores padrão do formulário de edição a partir do registro carregado (`OperationDetailDTO`). */
export function operationEditDefaultValues(record?: OperationDetailDTO): OperationEditValues {
  return {
    clientId: record?.clientId ?? "",
    productId: record?.productId ?? "",
    vesselId: record?.vesselId ?? "",
    nameDate: record?.nameDate ?? "",
    opDate: record?.opDate ?? "",
    startDate: record?.startDate ?? "",
    observation: record?.observation ?? "",
  };
}

function fetchClientOptions(search: string) {
  return getApiClient({ Search: search, Limit: 20 }).then((res) =>
    res.items.map((c) => ({ value: c.id, label: c.fullName })),
  );
}

function fetchProductOptions(search: string) {
  return getApiProduct({ Search: search, Limit: 20 }).then((res) =>
    res.items.map((p) => ({ value: p.id, label: p.name })),
  );
}

function fetchVesselOptions(search: string) {
  return getApiVessel({ Search: search, Limit: 20 }).then((res) =>
    res.items.map((v) => ({ value: v.id, label: v.name })),
  );
}

/**
 * Campos do `CrudRecordModal<OperationEditValues>` (`layouts/Form/Fields`,
 * regra 10 do AGENTS.md) — mesmo conjunto usado hoje na listagem
 * (`operations-list.tsx`) e, a partir da SPEC-33, também na aba Detalhes do
 * shell de Operação (`Details.tsx`). `selectedLabel` vem do registro atual
 * pra já mostrar o nome (não só o id) do cliente/produto/navio selecionado.
 */
export function buildOperationEditFields({
  t,
  record,
}: {
  t: (key: TranslationKey) => string;
  record?: OperationDetailDTO;
}): LayoutField[] {
  return [
    {
      type: "SelectAsync",
      fieldName: "clientId",
      label: t("administrative-operations.form.client"),
      col: { md: 6 },
      config: { fetchOptions: fetchClientOptions, selectedLabel: record?.client.fullName },
    },
    {
      type: "SelectAsync",
      fieldName: "productId",
      label: t("administrative-operations.form.product"),
      col: { md: 6 },
      config: { fetchOptions: fetchProductOptions, selectedLabel: record?.product.name },
    },
    {
      type: "SelectAsync",
      fieldName: "vesselId",
      label: t("administrative-operations.form.vessel"),
      col: { md: 6 },
      config: {
        fetchOptions: fetchVesselOptions,
        selectedLabel: record?.vessel?.name ?? undefined,
      },
    },
    {
      type: "InputDate",
      fieldName: "nameDate",
      label: t("administrative-operations.form.nameDate"),
      col: { md: 6 },
    },
    {
      type: "InputDate",
      fieldName: "opDate",
      label: t("administrative-operations.form.opDate"),
      col: { md: 6 },
    },
    {
      type: "InputDate",
      fieldName: "startDate",
      label: t("administrative-operations.form.startDate"),
      col: { md: 6 },
    },
    {
      type: "InputTextArea",
      fieldName: "observation",
      label: t("administrative-operations.form.observation"),
      col: { md: 12 },
    },
  ];
}

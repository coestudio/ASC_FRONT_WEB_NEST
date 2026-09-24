import type { z } from "zod";

import type { PostApiOperationOperationIdRomaneioBody } from "@/api/generated/zod/romaneio/romaneio.zod";
import type { TranslateParams, TranslationKey } from "@/i18n/translate";
import type { LayoutField } from "@/layouts/Form/Fields/Index";

/**
 * Create/Update do Core têm o mesmo shape — reusa o schema do POST nos dois
 * modos do `CrudRecordModal` (regra 2 do AGENTS.md: zero Zod escrito à mão),
 * mesmo padrão de `VesselPage`/`ContainerPage`. Compartilhado entre a aba
 * Romaneio e o ajuste de linha inválida do import (SPEC-100).
 */
export type RomaneioFormValues = z.infer<typeof PostApiOperationOperationIdRomaneioBody>;

/** Campos comuns a `RomaneioDTO` (fardo salvo) e `RomaneioImportRowDTO`
 * (linha da planilha) — os dois alimentam o mesmo formulário. */
type RomaneioLike = {
  itemIdentifier?: string;
  itemCode?: string;
  tipo?: string | null;
  contrato?: string | null;
  peso?: number | string;
  pesoTara?: number | string;
  pesoBruto?: number | string;
  instruction?: string;
  notaFiscal?: string;
  lote?: string;
  pilha?: string | null;
};

export function toFormValues(record?: RomaneioLike): RomaneioFormValues {
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

/** Campos do formulário de fardo (criar/editar/ajustar linha do import). */
export function buildRomaneioFields(
  t: (key: TranslationKey, params?: TranslateParams) => string,
): LayoutField[] {
  return [
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
}

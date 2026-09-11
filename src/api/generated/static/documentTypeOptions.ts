// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de GET /api/document/types
// Rota estática (dados só mudam em restart da API). NÃO editar à mão.
import type { EnumOptionDTO } from "../model";
import type { Locale } from "@/i18n/config";

export const documentTypeOptions: EnumOptionDTO[] = [
  {
    "value": 0,
    "key": "Other",
    "name": {
      "pt-BR": "Outro",
      "en": "Other",
      "es": "Otro",
      "zh": "其他"
    }
  },
  {
    "value": 1,
    "key": "Booking",
    "name": {
      "pt-BR": "Booking",
      "en": "Booking",
      "es": "Booking",
      "zh": "订舱单"
    }
  },
  {
    "value": 2,
    "key": "Instruction",
    "name": {
      "pt-BR": "Instrução de Embarque",
      "en": "Shipping Instruction",
      "es": "Instrucción de Embarque",
      "zh": "装运指示"
    }
  },
  {
    "value": 3,
    "key": "PackingList",
    "name": {
      "pt-BR": "Romaneio",
      "en": "Packing List",
      "es": "Lista de Embalaje",
      "zh": "装箱单"
    }
  },
  {
    "value": 4,
    "key": "Invoice",
    "name": {
      "pt-BR": "Invoice",
      "en": "Invoice",
      "es": "Factura",
      "zh": "发票"
    }
  },
  {
    "value": 5,
    "key": "Certificate",
    "name": {
      "pt-BR": "Certificado",
      "en": "Certificate",
      "es": "Certificado",
      "zh": "证书"
    }
  },
  {
    "value": 6,
    "key": "Report",
    "name": {
      "pt-BR": "Relatório",
      "en": "Report",
      "es": "Informe",
      "zh": "报告"
    }
  }
];

export const documentTypeOptionsByKey: Record<string, EnumOptionDTO> = Object.fromEntries(
  documentTypeOptions.map((o) => [o.key, o]),
);

export function resolveDocumentTypeLabel(key: string, locale: Locale): string {
  return documentTypeOptionsByKey[key]?.name[locale] ?? key;
}

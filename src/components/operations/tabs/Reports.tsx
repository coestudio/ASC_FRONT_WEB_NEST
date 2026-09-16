import { useState } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";

import {
  getGetApiOperationOperationIdReportsWeightQueryKey,
  getGetApiOperationOperationIdReportsPackingListQueryKey,
  getGetApiOperationOperationIdReportsPhotographicQueryKey,
} from "@/api/generated/endpoints/operation-reports/operation-reports";
import { axiosInstance } from "@/api/mutator";
import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

type ReportKind = "weight" | "packingList" | "photographic";

const REPORTS: {
  kind: ReportKind;
  icon: string;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  getUrl: (operationId: string) => string;
  fallbackFileName: (operationId: string) => string;
}[] = [
  {
    kind: "weight",
    icon: "bi-file-earmark-excel",
    nameKey: "administrative-operations.reports.weight.name",
    descriptionKey: "administrative-operations.reports.weight.description",
    getUrl: (operationId) => getGetApiOperationOperationIdReportsWeightQueryKey(operationId)[0],
    fallbackFileName: (operationId) => `weight-report-${operationId}.xlsx`,
  },
  {
    kind: "packingList",
    icon: "bi-file-earmark-excel",
    nameKey: "administrative-operations.reports.packingList.name",
    descriptionKey: "administrative-operations.reports.packingList.description",
    getUrl: (operationId) =>
      getGetApiOperationOperationIdReportsPackingListQueryKey(operationId)[0],
    fallbackFileName: (operationId) => `packing-list-${operationId}.xlsx`,
  },
  {
    kind: "photographic",
    icon: "bi-file-earmark-word",
    nameKey: "administrative-operations.reports.photographic.name",
    descriptionKey: "administrative-operations.reports.photographic.description",
    getUrl: (operationId) =>
      getGetApiOperationOperationIdReportsPhotographicQueryKey(operationId)[0],
    fallbackFileName: (operationId) => `photographic-report-${operationId}.docx`,
  },
];

/**
 * Aba "Relatórios" do shell de detalhe da operação (SPEC-40, fim do mock da
 * SPEC-07-07). Os 3 endpoints do Core (`specs/36/37/38`, `IMPLEMENTED`) são
 * síncronos e sem histórico — cada clique gera o arquivo na hora, sem
 * listagem/paginação. Mesmo padrão de download por blob de
 * `Romaneio.tsx` (`handleExport`): a chamada usa `axiosInstance` direto (o
 * hook gerado pelo Orval, via `mutator.ts` genérico, não dá acesso a headers
 * nem `responseType: "blob"`), lendo o nome do arquivo do
 * `Content-Disposition` da resposta.
 */
export function Reports({ operationId }: { operationId: string }) {
  const t = useT();
  const [generating, setGenerating] = useState<ReportKind | null>(null);

  const handleGenerate = async (report: (typeof REPORTS)[number]) => {
    setGenerating(report.kind);
    const name = t(report.nameKey);
    try {
      const url = report.getUrl(operationId);
      const response = await axiosInstance.get<Blob>(url, { responseType: "blob" });

      const disposition = (response.headers as Record<string, string>)["content-disposition"];
      const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
      const filename = match ? decodeURIComponent(match[1]) : report.fallbackFileName(operationId);

      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      toast.success(t("administrative-operations.reports.toast.success", { name }));
    } catch {
      toast.error(t("administrative-operations.reports.toast.error", { name }));
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div>
      <p className="text-body-secondary mb-3">
        {t("administrative-operations.reports.description")}
      </p>
      <div className="d-flex flex-column gap-3">
        {REPORTS.map((report) => (
          <Card key={report.kind}>
            <Card.Body className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-3">
                <i className={`bi ${report.icon} fs-2 text-body-secondary`} aria-hidden />
                <div>
                  <Card.Title className="mb-1 h6">{t(report.nameKey)}</Card.Title>
                  <Card.Text className="text-body-secondary mb-0 small">
                    {t(report.descriptionKey)}
                  </Card.Text>
                </div>
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => handleGenerate(report)}
                disabled={generating !== null}
              >
                {generating === report.kind ? (
                  <Spinner size="sm" animation="border" className="me-1" />
                ) : (
                  <i className="bi bi-download me-1" aria-hidden />
                )}
                {t("administrative-operations.reports.generate")}
              </Button>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}

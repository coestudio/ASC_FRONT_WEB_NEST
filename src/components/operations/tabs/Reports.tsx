import { Badge, Table } from "react-bootstrap";

import { MockDataBanner } from "@/components/ui/mock-data-banner";
import { ListPagination } from "@/components/ui/list-pagination";
import { usePagination } from "@/hooks/usePagination";
import { useLocale, useT } from "@/lib/ui-prefs";

const PAGE_SIZE = 10;

// MOCK — SPEC-07-07 (§8): aba UI-only, sem endpoint no Core (legado também
// era mock). Array local, nunca uma query — não passa por fetch/hook Orval.
type MockOperationReport = {
  id: string;
  type: string;
  generatedAt: string;
  format: "PDF" | "XLSX";
  status: "ready" | "pending";
};

const MOCK_REPORTS: MockOperationReport[] = [
  {
    id: "1",
    type: "Boletim de pesagem",
    generatedAt: "2026-08-12",
    format: "PDF",
    status: "ready",
  },
  {
    id: "2",
    type: "Romaneio consolidado",
    generatedAt: "2026-08-20",
    format: "XLSX",
    status: "ready",
  },
  {
    id: "3",
    type: "Relatório de containers",
    generatedAt: "2026-09-01",
    format: "PDF",
    status: "pending",
  },
];

/**
 * Aba "Relatórios" do shell de detalhe da operação (SPEC-07-07). Recebe o
 * `operationId` só pra manter a mesma assinatura de prop das demais abas
 * (SPEC-07-02 §RF3) — o dado exibido aqui é mockado, não filtrado por ele.
 */
export function Reports({ operationId: _operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const { page, setPage, totalPages, pageItems } = usePagination(MOCK_REPORTS, PAGE_SIZE);

  return (
    <div>
      <MockDataBanner className="mb-3" />
      <p className="text-body-secondary mb-3">
        {t("administrative-operations.reports.description")}
      </p>
      <Table responsive hover className="align-middle mb-0">
        <thead>
          <tr>
            <th>{t("administrative-operations.reports.colType")}</th>
            <th>{t("administrative-operations.reports.colGeneratedAt")}</th>
            <th>{t("administrative-operations.reports.colFormat")}</th>
            <th>{t("administrative-operations.reports.colStatus")}</th>
            <th>{t("administrative-operations.reports.colActions")}</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_REPORTS.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-body-secondary py-4">
                {t("administrative-operations.reports.emptyState")}
              </td>
            </tr>
          ) : (
            pageItems.map((report) => (
              <tr key={report.id}>
                <td>{report.type}</td>
                <td>{new Date(report.generatedAt).toLocaleDateString(locale)}</td>
                <td>{report.format}</td>
                <td>
                  <Badge pill bg={report.status === "ready" ? "success" : "secondary"}>
                    {report.status === "ready"
                      ? t("administrative-operations.reports.statusReady")
                      : t("administrative-operations.reports.statusPending")}
                  </Badge>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    disabled={report.status !== "ready"}
                    title={t("administrative-operations.reports.download")}
                  >
                    <i className="bi bi-download me-1" aria-hidden />
                    {t("administrative-operations.reports.download")}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

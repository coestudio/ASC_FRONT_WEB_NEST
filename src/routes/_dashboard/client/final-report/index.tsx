import { createFileRoute } from "@tanstack/react-router";
import { Badge, Table } from "react-bootstrap";

import { MockDataBanner } from "@/components/ui/mock-data-banner";
import { PageLayout } from "@/layouts/PageLayout";
import { useLocale, useT } from "@/lib/ui-prefs";

export const Route = createFileRoute("/_dashboard/client/final-report/")({
  head: () => ({ meta: [{ title: "Relatório Final — ASC" }] }),
  component: FinalReportPage,
});

// MOCK — sem endpoint no Core (D2, specs/09-client-area/spec.md §8/§13).
// Emissão real de relatório final é fora de escopo desta SPEC (§4) — mesma
// limitação de backend da SPEC-05. Array local, nunca uma query.
type MockFinalReport = {
  id: string;
  operation: string;
  product: string;
  issuedAt: string;
  status: "Emitido" | "Pendente";
};

const MOCK_REPORTS: MockFinalReport[] = [
  {
    id: "1",
    operation: "OP-2026-0142",
    product: "Algodão em pluma",
    issuedAt: "2026-08-12",
    status: "Emitido",
  },
  {
    id: "2",
    operation: "OP-2026-0158",
    product: "Algodão em pluma",
    issuedAt: "2026-08-30",
    status: "Pendente",
  },
  {
    id: "3",
    operation: "OP-2026-0161",
    product: "Caroço de algodão",
    issuedAt: "2026-09-02",
    status: "Emitido",
  },
];

function FinalReportPage() {
  const t = useT();
  const locale = useLocale();

  return (
    <PageLayout
      density="wide"
      title={t("client.finalReport.title")}
      description={t("client.finalReport.description")}
    >
      <MockDataBanner className="mb-3" />
      <Table responsive hover className="align-middle mb-0">
        <thead>
          <tr>
            <th>{t("client.finalReport.colOperation")}</th>
            <th>{t("client.finalReport.colProduct")}</th>
            <th>{t("client.finalReport.colIssuedAt")}</th>
            <th>{t("client.finalReport.colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_REPORTS.map((report) => (
            <tr key={report.id}>
              <td>{report.operation}</td>
              <td>{report.product}</td>
              <td>{new Date(report.issuedAt).toLocaleDateString(locale)}</td>
              <td>
                <Badge pill bg={report.status === "Emitido" ? "success" : "secondary"}>
                  {report.status === "Emitido"
                    ? t("client.finalReport.statusIssued")
                    : t("client.finalReport.statusPending")}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </PageLayout>
  );
}

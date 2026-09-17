import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Badge, Button, Spinner, Table } from "react-bootstrap";
import type { AxiosError } from "axios";

import { axiosInstance } from "@/api/mutator";
import { useGetApiDebugErrors } from "@/api/generated/endpoints/debug-errors/debug-errors";
import { PageLayout } from "@/layouts/PageLayout";
import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

type ProblemDetails = {
  title?: string;
  detail?: string;
  status?: number;
  instance?: string;
  [key: string]: unknown;
};

type ScenarioResult =
  | { kind: "success"; status: number }
  | { kind: "error"; status: number; problem: ProblemDetails | undefined };

const KNOWN_KEYS = ["title", "detail", "status", "instance", "type"];

/**
 * Página de Debug (SPEC-48) — lista os cenários de erro do Core
 * (`GET /debug/errors`, SPEC-41) e deixa disparar cada um pra ver o
 * `ProblemDetails` real na tela. Guard de acesso (isAdmin) já vem do
 * `beforeLoad` de `/_dashboard/admin` (rota pai) — não duplica aqui.
 * Rota fora da sidebar (`src/layouts/AppShell/nav/admin.ts` não lista
 * este caminho) — acesso só por URL direta, conforme SPEC-48 §6.
 */
export const Route = createFileRoute("/_dashboard/admin/debug/")({
  head: () => ({ meta: [{ title: "Debug — ASC" }] }),
  component: DebugErrorCatalogPage,
});

function DebugErrorCatalogPage() {
  const t = useT();
  const { data: scenarios, isLoading } = useGetApiDebugErrors();
  const [results, setResults] = useState<Record<string, ScenarioResult>>({});
  const [triggering, setTriggering] = useState<Record<string, boolean>>({});

  const trigger = async (route: string) => {
    setTriggering((prev) => ({ ...prev, [route]: true }));
    try {
      const response = await axiosInstance.get(`/api/${route}`);
      // Nenhum cenário deveria devolver sucesso — se acontecer, é bug no
      // Core (SPEC-41 §3), não um resultado esperado desta página.
      setResults((prev) => ({ ...prev, [route]: { kind: "success", status: response.status } }));
    } catch (err) {
      const axiosErr = err as AxiosError<ProblemDetails>;
      setResults((prev) => ({
        ...prev,
        [route]: {
          kind: "error",
          status: axiosErr.response?.status ?? 0,
          problem: axiosErr.response?.data,
        },
      }));
    } finally {
      setTriggering((prev) => ({ ...prev, [route]: false }));
    }
  };

  return (
    <PageLayout title={t("debug.title")} description={t("debug.description")}>
      {isLoading ? (
        <Spinner animation="border" size="sm" />
      ) : (
        <Table responsive hover className="align-middle mb-0">
          <thead>
            <tr>
              <th>{t("debug.colRoute")}</th>
              <th>{t("debug.colExpectedStatus")}</th>
              <th>{t("debug.colDescription")}</th>
              <th>{t("debug.colAction")}</th>
              <th>{t("debug.colResult")}</th>
            </tr>
          </thead>
          <tbody>
            {(scenarios ?? []).map((scenario) => {
              const expectedStatus = Number(scenario.expectedStatus);
              const result = results[scenario.route];
              const isTriggering = triggering[scenario.route] ?? false;
              const matched = result != null && result.status === expectedStatus;

              return (
                <tr key={scenario.route}>
                  <td>
                    <code>/{scenario.route}</code>
                  </td>
                  <td>{expectedStatus}</td>
                  <td className="text-body-secondary small">{scenario.description}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      disabled={isTriggering}
                      onClick={() => trigger(scenario.route)}
                    >
                      {isTriggering ? (
                        <Spinner size="sm" animation="border" className="me-2" />
                      ) : null}
                      {isTriggering ? t("debug.triggering") : t("debug.trigger")}
                    </Button>
                  </td>
                  <td>
                    {result == null ? (
                      <span className="text-body-secondary small">
                        {t("debug.notTriggeredYet")}
                      </span>
                    ) : (
                      <div className="d-flex flex-column gap-1">
                        <div className="d-flex align-items-center gap-2">
                          <Badge bg={matched ? "success" : "danger"}>
                            {matched ? t("debug.statusMatch") : t("debug.statusMismatch")}
                          </Badge>
                          <span className="small">
                            {t("debug.receivedStatus")}: {result.status}
                          </span>
                        </div>
                        {result.kind === "success" ? (
                          <span className="small text-warning">{t("debug.unexpectedSuccess")}</span>
                        ) : (
                          <dl className="small mb-0">
                            {Object.entries(result.problem ?? {}).map(([key, value]) => (
                              <div key={key} className="d-flex gap-1">
                                <dt className="text-body-secondary">
                                  {KNOWN_KEYS.includes(key)
                                    ? t(`debug.problemDetails.${key}` as TranslationKey)
                                    : key}
                                  :
                                </dt>
                                <dd className="mb-0 text-break">
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </PageLayout>
  );
}

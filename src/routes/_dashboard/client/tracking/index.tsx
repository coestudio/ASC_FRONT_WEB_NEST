import { createFileRoute } from "@tanstack/react-router";

import { MockDataBanner } from "@/components/ui/mock-data-banner";
import { PageLayout } from "@/layouts/PageLayout";
import { useT } from "@/lib/ui-prefs";

export const Route = createFileRoute("/_dashboard/client/tracking/")({
  head: () => ({ meta: [{ title: "Acompanhamento — ASC" }] }),
  component: TrackingPage,
});

// MOCK — sem endpoint no Core (D2, specs/09-client-area/spec.md §8/§13).
// Etapas sintetizadas localmente, nunca projetadas de `operation`/`romaneio`
// reais (R2 da SPEC-09 — decisão explícita, não é lacuna a corrigir depois).
type MockTrackingStep = {
  id: string;
  labelKey: "received" | "inspection" | "processing" | "shipped";
  done: boolean;
};

const MOCK_STEPS: MockTrackingStep[] = [
  { id: "1", labelKey: "received", done: true },
  { id: "2", labelKey: "inspection", done: true },
  { id: "3", labelKey: "processing", done: false },
  { id: "4", labelKey: "shipped", done: false },
];

function TrackingPage() {
  const t = useT();

  return (
    <PageLayout
      density="wide"
      title={t("client.tracking.title")}
      description={t("client.tracking.description")}
    >
      <MockDataBanner className="mb-3" />
      <ol className="list-unstyled d-flex flex-column gap-3 mb-0">
        {MOCK_STEPS.map((step) => (
          <li key={step.id} className="d-flex align-items-center gap-3">
            <i
              className={`bi ${step.done ? "bi-check-circle-fill text-success" : "bi-circle text-body-secondary"} fs-4`}
              aria-hidden
            />
            <span className={step.done ? "text-body" : "text-body-secondary"}>
              {t(`client.tracking.steps.${step.labelKey}`)}
            </span>
          </li>
        ))}
      </ol>
    </PageLayout>
  );
}

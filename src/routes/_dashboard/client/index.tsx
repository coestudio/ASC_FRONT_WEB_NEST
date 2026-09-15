import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "react-bootstrap";

import { PageLayout } from "@/layouts/PageLayout";
import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

export const Route = createFileRoute("/_dashboard/client/")({
  head: () => ({ meta: [{ title: "Área do cliente — ASC" }] }),
  component: ClientHomePage,
});

type HomeCard = {
  to: string;
  icon: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
};

// Grid de 3 links (mesmo desenho do legado `Client/Home.tsx`) — segmentos em
// inglês (§3 da SPEC-09).
const CARDS: HomeCard[] = [
  {
    to: "/client/collaborators",
    icon: "bi-people",
    titleKey: "client.home.cards.collaborators.title",
    descriptionKey: "client.home.cards.collaborators.description",
  },
  {
    to: "/client/final-report",
    icon: "bi-file-earmark-text",
    titleKey: "client.home.cards.finalReport.title",
    descriptionKey: "client.home.cards.finalReport.description",
  },
  {
    to: "/client/tracking",
    icon: "bi-graph-up-arrow",
    titleKey: "client.home.cards.tracking.title",
    descriptionKey: "client.home.cards.tracking.description",
  },
];

function ClientHomePage() {
  const t = useT();

  return (
    <PageLayout
      density="wide"
      title={t("client.home.title")}
      description={t("client.home.description")}
    >
      <div className="row g-3">
        {CARDS.map((card) => (
          <div className="col-12 col-sm-6 col-lg-4" key={card.to}>
            <Link to={card.to} className="text-decoration-none">
              <Card className="h-100">
                <Card.Body>
                  <i className={`bi ${card.icon} fs-3 text-primary`} aria-hidden />
                  <Card.Title className="h6 mt-3">{t(card.titleKey)}</Card.Title>
                  <Card.Text className="text-body-secondary small mb-0">
                    {t(card.descriptionKey)}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Link>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}

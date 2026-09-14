import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "react-bootstrap";

import { PageLayout } from "@/layouts/PageLayout";
import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

export const Route = createFileRoute("/_dashboard/_internal/operational/")({
  head: () => ({ meta: [{ title: "Operacional — ASC" }] }),
  component: OperationalHomePage,
});

type HomeCard = {
  to: string;
  icon: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
};

// Grid de links (mesmo desenho do legado `Operacional/Home.tsx`) — segmentos
// em inglês (§7 da SPEC-08), único link pra lista read-only.
const CARDS: HomeCard[] = [
  {
    to: "/operational/operations",
    icon: "bi-clipboard-data",
    titleKey: "operational.home.cards.operations.title",
    descriptionKey: "operational.home.cards.operations.description",
  },
];

function OperationalHomePage() {
  const t = useT();

  return (
    <PageLayout
      density="wide"
      title={t("operational.home.title")}
      description={t("operational.home.description")}
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "react-bootstrap";

import { PageLayout } from "@/layouts/PageLayout";
import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

export const Route = createFileRoute("/_dashboard/_internal/administrative/")({
  head: () => ({ meta: [{ title: "Administrativo — ASC" }] }),
  component: AdministrativeHomePage,
});

type HomeCard = {
  to: string;
  icon: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
};

// Grid de links (mesmo desenho de `operational/index.tsx`, SPEC-08) — um
// card por rota real da área, na mesma ordem dos itens no nav (SPEC-17).
const CARDS: HomeCard[] = [
  {
    to: "/administrative/clients",
    icon: "bi-people",
    titleKey: "administrative-home.home.cards.clients.title",
    descriptionKey: "administrative-home.home.cards.clients.description",
  },
  {
    to: "/administrative/operations",
    icon: "bi-clipboard-data",
    titleKey: "administrative-home.home.cards.operations.title",
    descriptionKey: "administrative-home.home.cards.operations.description",
  },
  {
    to: "/administrative/registry/vessel",
    icon: "bi-water",
    titleKey: "administrative-home.home.cards.vessel.title",
    descriptionKey: "administrative-home.home.cards.vessel.description",
  },
  {
    to: "/administrative/registry/container",
    icon: "bi-box-seam",
    titleKey: "administrative-home.home.cards.container.title",
    descriptionKey: "administrative-home.home.cards.container.description",
  },
  {
    to: "/administrative/registry/terminal",
    icon: "bi-building",
    titleKey: "administrative-home.home.cards.terminal.title",
    descriptionKey: "administrative-home.home.cards.terminal.description",
  },
  {
    to: "/administrative/registry/harbor",
    icon: "bi-geo-alt",
    titleKey: "administrative-home.home.cards.harbor.title",
    descriptionKey: "administrative-home.home.cards.harbor.description",
  },
  {
    to: "/administrative/registry/product",
    icon: "bi-box2",
    titleKey: "administrative-home.home.cards.product.title",
    descriptionKey: "administrative-home.home.cards.product.description",
  },
];

function AdministrativeHomePage() {
  const t = useT();

  return (
    <PageLayout
      density="wide"
      title={t("administrative-home.home.title")}
      description={t("administrative-home.home.description")}
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

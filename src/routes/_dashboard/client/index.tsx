import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, Placeholder } from "react-bootstrap";

import { ClientAvatarField } from "@/components/clients/client-avatar-field";
import { useMounted } from "@/hooks/useMounted";
import { PageLayout } from "@/layouts/PageLayout";
import { getGetApiClientMeQueryOptions } from "@/api/generated/endpoints/client/client";
import { useSsrSafeQuery } from "@/lib/queries/use-ssr-safe-query";
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

/**
 * Logo + nome do cliente do colaborador logado (SPEC-101 RF6). Só monta no
 * browser (gate de `mounted`, SPEC-10 §14) — `useSsrSafeQuery` fora do
 * `CrudListPage` precisa dele. Troca/remoção imediatas; se o Core responder
 * 403 (colaborador sem permissão), o avatar vira só leitura.
 */
function ClientHeader() {
  const query = useSsrSafeQuery(getGetApiClientMeQueryOptions());
  const [forbidden, setForbidden] = useState(false);

  if (query.isPending) {
    return (
      <Placeholder as="div" animation="glow" className="mb-4">
        <Placeholder xs={4} />
      </Placeholder>
    );
  }
  if (!query.data) return null;

  return (
    <Card className="mb-4">
      <Card.Body className="pb-0">
        <ClientAvatarField
          clientId={query.data.id}
          name={query.data.fullName}
          avatarFile={query.data.avatarFile ?? null}
          readOnly={forbidden}
          onForbidden={() => setForbidden(true)}
        />
      </Card.Body>
    </Card>
  );
}

function ClientHomePage() {
  const t = useT();
  const mounted = useMounted();

  return (
    <PageLayout
      density="wide"
      title={t("client.home.title")}
      description={t("client.home.description")}
    >
      {mounted ? <ClientHeader /> : null}
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

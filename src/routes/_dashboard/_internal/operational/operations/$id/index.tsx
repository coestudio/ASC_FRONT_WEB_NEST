import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge, Button, Modal, Nav, Table } from "react-bootstrap";

import { MockDataBanner } from "@/components/ui/mock-data-banner";
import { PageLayout } from "@/layouts/PageLayout";
import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

export const Route = createFileRoute("/_dashboard/_internal/operational/operations/$id/")({
  head: () => ({ meta: [{ title: "Operação — ASC" }] }),
  component: OperationalOperationDetailPage,
});

// MOCK — detalhe próprio e separado do detalhe real da SPEC-07 (D1/§13 da
// SPEC-08, decisão explícita do usuário de não consolidar). O `id` da URL
// não precisa bater com o id real do Core (RF3) — é uma tela ilustrativa,
// como no legado `Operacional/OperacaoDetail/Page.tsx`.
type MockContainerStatus = "empty" | "loading" | "sealed" | "shipped";

type MockContainer = {
  id: string;
  identifier: string;
  type: string;
  seal: string;
  status: MockContainerStatus;
  stuffedVolumes: number;
  capacityVolumes: number;
  currentWeight: number;
  netWeight: number;
  tare: number;
};

type MockOperation = {
  id: string;
  code: string;
  client: string;
  product: string;
  typeKey: "import" | "export";
  modeKey: "fcl" | "lcl";
  statusKey: "inProgress" | "finished" | "pending";
  containers: MockContainer[];
};

const MOCK_OPERATIONS: MockOperation[] = [
  {
    id: "op-1001",
    code: "OP-2026-1001",
    client: "Agro Santos Exportadora",
    product: "Algodão em pluma",
    typeKey: "export",
    modeKey: "fcl",
    statusKey: "inProgress",
    containers: [
      {
        id: "cnt-1",
        identifier: "MSCU1234567",
        type: "40' HC",
        seal: "SL-88291",
        status: "loading",
        stuffedVolumes: 420,
        capacityVolumes: 640,
        currentWeight: 12800,
        netWeight: 19200,
        tare: 3800,
      },
      {
        id: "cnt-2",
        identifier: "TCLU7654321",
        type: "20' DRY",
        seal: "SL-88292",
        status: "sealed",
        stuffedVolumes: 320,
        capacityVolumes: 320,
        currentWeight: 9600,
        netWeight: 9600,
        tare: 2200,
      },
    ],
  },
  {
    id: "op-1002",
    code: "OP-2026-1002",
    client: "Cotton Brasil Ltda",
    product: "Algodão em pluma",
    typeKey: "export",
    modeKey: "lcl",
    statusKey: "pending",
    containers: [],
  },
  {
    id: "op-1003",
    code: "OP-2026-1003",
    client: "Terra Nova Grãos",
    product: "Soja em grão",
    typeKey: "import",
    modeKey: "fcl",
    statusKey: "finished",
    containers: [
      {
        id: "cnt-3",
        identifier: "OOLU4455667",
        type: "40' DRY",
        seal: "SL-70102",
        status: "shipped",
        stuffedVolumes: 580,
        capacityVolumes: 580,
        currentWeight: 27600,
        netWeight: 27600,
        tare: 3900,
      },
    ],
  },
];

const CONTAINER_STATUS_KEY: Record<MockContainerStatus, TranslationKey> = {
  empty: "operational.detail.containerStatus.empty",
  loading: "operational.detail.containerStatus.loading",
  sealed: "operational.detail.containerStatus.sealed",
  shipped: "operational.detail.containerStatus.shipped",
};

type Section = "details" | "containers" | "operational" | "split";

const SECTIONS: { key: Section; icon: string }[] = [
  { key: "details", icon: "bi-info-circle" },
  { key: "containers", icon: "bi-box-seam" },
  { key: "operational", icon: "bi-clipboard-check" },
  { key: "split", icon: "bi-diagram-3" },
];

function OperationalOperationDetailPage() {
  const { id } = Route.useParams();
  const t = useT();
  const operation = MOCK_OPERATIONS.find((o) => o.id === id);
  const [section, setSection] = useState<Section>("details");
  const [openContainer, setOpenContainer] = useState<MockContainer | null>(null);

  if (!operation) {
    return (
      <PageLayout density="wide">
        <MockDataBanner className="mb-3" />
        <div className="text-center py-5 text-body-secondary">
          <i className="bi bi-clipboard-x fs-3 d-block mb-2" aria-hidden />
          <p className="mb-3">{t("operational.detail.notFound")}</p>
          <Link to="/operational/operations" className="btn btn-outline-secondary btn-sm">
            {t("operational.detail.backToList")}
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout density="wide">
      <MockDataBanner className="mb-3" />

      <section className="mb-4">
        <div className="text-body-secondary small">
          {t("operational.detail.eyebrow", { code: operation.code })}
        </div>
        <h1 className="h4 fw-semibold mt-1 mb-2">{operation.client}</h1>
        <div className="d-flex flex-wrap gap-2">
          <Badge bg="primary">{t(`operational.detail.status.${operation.statusKey}`)}</Badge>
          <Badge bg="secondary">{t(`operational.detail.type.${operation.typeKey}`)}</Badge>
          <Badge bg="secondary">{t(`operational.detail.mode.${operation.modeKey}`)}</Badge>
        </div>
      </section>

      <Nav
        variant="tabs"
        activeKey={section}
        onSelect={(key) => setSection((key as Section | null) ?? "details")}
        className="mb-3"
      >
        {SECTIONS.map((s) => (
          <Nav.Item key={s.key}>
            <Nav.Link eventKey={s.key}>
              <i className={`bi ${s.icon} me-1`} aria-hidden />
              {t(`operational.detail.sections.${s.key}.label`)}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      <section>
        {section === "details" ? (
          <div className="row g-3">
            <div className="col-6 col-md-4">
              <div className="small text-body-secondary">
                {t("operational.detail.fields.client")}
              </div>
              <div className="fw-semibold">{operation.client}</div>
            </div>
            <div className="col-6 col-md-4">
              <div className="small text-body-secondary">
                {t("operational.detail.fields.product")}
              </div>
              <div className="fw-semibold">{operation.product}</div>
            </div>
            <div className="col-6 col-md-4">
              <div className="small text-body-secondary">
                {t("operational.detail.fields.status")}
              </div>
              <div className="fw-semibold">
                {t(`operational.detail.status.${operation.statusKey}`)}
              </div>
            </div>
            <div className="col-6 col-md-4">
              <div className="small text-body-secondary">{t("operational.detail.fields.type")}</div>
              <div className="fw-semibold">{t(`operational.detail.type.${operation.typeKey}`)}</div>
            </div>
            <div className="col-6 col-md-4">
              <div className="small text-body-secondary">{t("operational.detail.fields.mode")}</div>
              <div className="fw-semibold">{t(`operational.detail.mode.${operation.modeKey}`)}</div>
            </div>
          </div>
        ) : section === "containers" ? (
          operation.containers.length === 0 ? (
            <div className="alert alert-secondary mb-0">
              {t("operational.detail.containers.empty")}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t("operational.detail.containers.colIdentifier")}</th>
                    <th>{t("operational.detail.containers.colType")}</th>
                    <th>{t("operational.detail.containers.colSeal")}</th>
                    <th>{t("operational.detail.containers.colStatus")}</th>
                    <th>{t("operational.detail.containers.colVolumes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {operation.containers.map((container) => (
                    <tr
                      key={container.id}
                      role="button"
                      onClick={() => setOpenContainer(container)}
                    >
                      <td className="font-monospace">{container.identifier}</td>
                      <td>{container.type}</td>
                      <td className="font-monospace">{container.seal}</td>
                      <td>
                        <Badge bg="secondary">{t(CONTAINER_STATUS_KEY[container.status])}</Badge>
                      </td>
                      <td>
                        {container.stuffedVolumes} / {container.capacityVolumes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )
        ) : section === "operational" ? (
          <div className="text-center text-body-secondary py-5">
            <i className="bi bi-clipboard-check fs-3 d-block mb-2" aria-hidden />
            <p className="mb-0">{t("operational.detail.operationalPlaceholder")}</p>
          </div>
        ) : (
          <div className="text-center text-body-secondary py-5">
            <i className="bi bi-diagram-3 fs-3 d-block mb-2" aria-hidden />
            <p className="mb-0">{t("operational.detail.splitPlaceholder")}</p>
          </div>
        )}
      </section>

      {openContainer ? (
        <ContainerDetailModal container={openContainer} onClose={() => setOpenContainer(null)} />
      ) : null}
    </PageLayout>
  );
}

/**
 * Modal somente-leitura de container — sem ações de inserir/lacrar/editar do
 * legado (`ContainerDetail.tsx`): esta área é toda leitura, por escopo
 * explícito da SPEC-08 (§4, "qualquer escrita nesta área").
 */
function ContainerDetailModal({
  container,
  onClose,
}: {
  container: MockContainer;
  onClose: () => void;
}) {
  const t = useT();

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5 mb-0">
          {t("operational.detail.containers.detailTitle")} — {container.identifier}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row g-3">
          <div className="col-6">
            <div className="small text-body-secondary">
              {t("operational.detail.containers.detailWeight")}
            </div>
            <div className="fw-semibold">{container.currentWeight} kg</div>
          </div>
          <div className="col-6">
            <div className="small text-body-secondary">
              {t("operational.detail.containers.detailNetWeight")}
            </div>
            <div className="fw-semibold">{container.netWeight} kg</div>
          </div>
          <div className="col-6">
            <div className="small text-body-secondary">
              {t("operational.detail.containers.detailTare")}
            </div>
            <div className="fw-semibold">{container.tare} kg</div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>
          {t("operational.detail.containers.close")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

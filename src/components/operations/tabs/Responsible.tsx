import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Card, Col, Row } from "react-bootstrap";

import { MockDataBanner } from "@/components/ui/mock-data-banner";
import { InputText, Select } from "@/layouts/Form/Fields/Index";
import { useT } from "@/lib/ui-prefs";
import type { TranslationKey } from "@/i18n/translate";

/**
 * Papéis mock — só rótulo pra exibição do card, sem relação com
 * `InternalRole` (enum real do Core). UI-only (D1 da SPEC-07-08): a API
 * real (`ResponsibleApi`) já existe e está gerada, mas não é consumida
 * aqui nesta leva.
 */
type MockRole = "coordinator" | "analyst" | "assistant" | "supervisor";

type MockResponsible = {
  id: string;
  name: string;
  role: MockRole;
  email: string;
  phone: string;
};

// MOCK — sem chamada real (D1, specs/07-08-operation-responsible/spec.md).
// Dado sintetizado localmente, nunca projetado de `ResponsibleDTO` real.
const MOCK_RESPONSIBLES: MockResponsible[] = [
  {
    id: "1",
    name: "Ana Souza",
    role: "coordinator",
    email: "ana.souza@asc.com",
    phone: "(11) 90000-0001",
  },
  {
    id: "2",
    name: "Bruno Lima",
    role: "analyst",
    email: "bruno.lima@asc.com",
    phone: "(11) 90000-0002",
  },
  {
    id: "3",
    name: "Carla Nunes",
    role: "assistant",
    email: "carla.nunes@asc.com",
    phone: "(11) 90000-0003",
  },
  {
    id: "4",
    name: "Diego Alves",
    role: "supervisor",
    email: "diego.alves@asc.com",
    phone: "(11) 90000-0004",
  },
];

const MOCK_ROLES: MockRole[] = ["coordinator", "analyst", "assistant", "supervisor"];

type LinkedFilter = "all" | "linked" | "unlinked";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/**
 * Aba **Responsáveis** (SPEC-07-08) — UI-only (D1): vínculo funcionário ×
 * operação só em estado local, nunca persistido. Espelha o comportamento do
 * legado (`OperationResponsaveis.tsx`), com dado mock nomeado e comentado
 * como tal.
 */
export function OperationResponsibleTab() {
  const t = useT();
  // Vínculo inicial mock: os dois primeiros já "vinculados" — só pra ter
  // estado inicial variado na demonstração, sem qualquer origem real.
  const [linkedIds, setLinkedIds] = useState<string[]>(["1", "2"]);
  const [linkedFilter, setLinkedFilter] = useState<LinkedFilter>("all");

  const searchMethods = useForm<{ search: string }>({ defaultValues: { search: "" } });
  const search = searchMethods.watch("search");

  const roleMethods = useForm<{ role: string }>({ defaultValues: { role: "all" } });
  const role = roleMethods.watch("role");

  const toggleLinked = (id: string) =>
    setLinkedIds((prev) =>
      prev.includes(id) ? prev.filter((linkedId) => linkedId !== id) : [...prev, id],
    );

  const list = useMemo(() => {
    const query = search.trim().toLowerCase();
    return MOCK_RESPONSIBLES.filter((item) => {
      const isLinked = linkedIds.includes(item.id);
      if (linkedFilter === "linked" && !isLinked) return false;
      if (linkedFilter === "unlinked" && isLinked) return false;
      if (role !== "all" && item.role !== role) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        t(`administrative-operations.responsible.roles.${item.role}` as TranslationKey)
          .toLowerCase()
          .includes(query)
      );
    });
  }, [search, linkedFilter, role, linkedIds, t]);

  const linkedFilterOptions: { key: LinkedFilter; labelKey: TranslationKey }[] = [
    { key: "all", labelKey: "administrative-operations.responsible.filter.all" },
    { key: "linked", labelKey: "administrative-operations.responsible.filter.linked" },
    { key: "unlinked", labelKey: "administrative-operations.responsible.filter.unlinked" },
  ];

  return (
    <div>
      <MockDataBanner className="mb-3" />

      <Row className="g-2 mb-3">
        <Col md={5}>
          <InputText
            methods={searchMethods}
            fieldName="search"
            placeholder={t("administrative-operations.responsible.searchPlaceholder")}
            config={{ containerClass: "mb-0" }}
          />
        </Col>
        <Col md={3}>
          <Select
            methods={roleMethods}
            fieldName="role"
            config={{
              containerClass: "mb-0",
              options: [
                { value: "all", label: t("administrative-operations.responsible.filter.allRoles") },
                ...MOCK_ROLES.map((mockRole) => ({
                  value: mockRole,
                  label: t(
                    `administrative-operations.responsible.roles.${mockRole}` as TranslationKey,
                  ),
                })),
              ],
            }}
          />
        </Col>
        <Col md={4} className="d-flex align-items-start gap-2">
          <div
            className="btn-group"
            role="group"
            aria-label={t("administrative-operations.responsible.filter.all")}
          >
            {linkedFilterOptions.map((item) => (
              <Button
                key={item.key}
                type="button"
                size="sm"
                variant={linkedFilter === item.key ? "primary" : "outline-secondary"}
                onClick={() => setLinkedFilter(item.key)}
                aria-pressed={linkedFilter === item.key}
              >
                {t(item.labelKey)}
              </Button>
            ))}
          </div>
        </Col>
      </Row>

      <div className="d-flex flex-column gap-2">
        {list.map((item) => {
          const isLinked = linkedIds.includes(item.id);
          return (
            <Card key={item.id} body className="d-flex flex-row flex-wrap align-items-center gap-3">
              <div
                className="rounded-circle bg-primary-subtle text-primary-emphasis d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
                style={{ width: 44, height: 44 }}
              >
                {initials(item.name)}
              </div>
              <div className="flex-grow-1 min-w-0">
                <div className="fw-semibold text-truncate">{item.name}</div>
                <div className="small text-body-secondary text-truncate">
                  {t(`administrative-operations.responsible.roles.${item.role}` as TranslationKey)}{" "}
                  · {item.email} · {item.phone}
                </div>
              </div>
              <Button
                size="sm"
                variant={isLinked ? "outline-danger" : "success"}
                onClick={() => toggleLinked(item.id)}
              >
                <i className={`bi ${isLinked ? "bi-x-lg" : "bi-link-45deg"} me-1`} aria-hidden />
                {isLinked
                  ? t("administrative-operations.responsible.unlink")
                  : t("administrative-operations.responsible.link")}
              </Button>
            </Card>
          );
        })}

        {list.length === 0 ? (
          <div className="text-center text-body-secondary py-4">
            <i className="bi bi-people display-6 d-block mb-2" aria-hidden />
            {t("administrative-operations.responsible.emptyState")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

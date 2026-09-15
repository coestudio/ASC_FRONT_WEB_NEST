import { useLocale, useT } from "@/lib/ui-prefs";
import { MockDataBanner } from "@/components/ui/mock-data-banner";
import { ListPagination } from "@/components/ui/list-pagination";
import { usePagination } from "@/hooks/usePagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/page-size";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

// MOCK — SPEC-07-09 (§8): aba UI-only, sem endpoint no Core (legado também
// era mock). Array local, nunca uma query — não passa por fetch/hook Orval.
// Nota da SPEC (§2): `cargoUnitEventDTO` já existe no Core e poderia virar a
// fonte real desta aba — decisão adiada, fora de escopo aqui.
type MockOperationLogEntry = {
  id: string;
  occurredAt: string;
  user: string;
  action: string;
  detail: string;
};

const MOCK_LOG: MockOperationLogEntry[] = [
  {
    id: "1",
    occurredAt: "2026-08-10T09:15:00",
    user: "Ana Souza",
    action: "Criação",
    detail: "Operação criada.",
  },
  {
    id: "2",
    occurredAt: "2026-08-12T14:32:00",
    user: "Carlos Lima",
    action: "Atualização de status",
    detail: 'Status alterado para "Em andamento".',
  },
  {
    id: "3",
    occurredAt: "2026-08-20T11:05:00",
    user: "Mariana Alves",
    action: "Romaneio",
    detail: "Importação de romaneio via planilha.",
  },
];

/**
 * Aba "Log" (histórico de eventos da operação) do shell de detalhe
 * (SPEC-07-09) — distinta do Log de auditoria genérico
 * (`/administrative/log`, namespace `administrative-log`, SPEC-06 cancelada).
 * Recebe `operationId` só pra manter a mesma assinatura de prop das demais
 * abas (SPEC-07-02 §RF3) — o dado exibido aqui é mockado, não filtrado por
 * ele.
 */
export function Log({ operationId: _operationId }: { operationId: string }) {
  const t = useT();
  const locale = useLocale();
  const { page, setPage, totalPages, pageItems } = usePagination(MOCK_LOG, PAGE_SIZE);

  return (
    <div>
      <MockDataBanner className="mb-3" />
      <p className="text-body-secondary mb-3">{t("administrative-operations.log.description")}</p>
      {MOCK_LOG.length === 0 ? (
        <p className="text-center text-body-secondary py-4 mb-0">
          {t("administrative-operations.log.emptyState")}
        </p>
      ) : (
        <ul className="list-unstyled d-flex flex-column gap-3 mb-0">
          {pageItems.map((entry) => (
            <li key={entry.id} className="soft-card p-3">
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <span className="fw-semibold">{entry.action}</span>
                <span className="text-body-secondary small">
                  {new Date(entry.occurredAt).toLocaleString(locale)}
                </span>
              </div>
              <p className="mb-1">{entry.detail}</p>
              <span className="text-body-secondary small">
                {t("administrative-operations.log.byUser", { user: entry.user })}
              </span>
            </li>
          ))}
        </ul>
      )}
      <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

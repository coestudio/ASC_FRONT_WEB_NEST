import { Dropdown, Spinner } from "react-bootstrap";
import { useT } from "@/lib/ui-prefs";
import styles from "./crud-row-actions.module.css";

export type CrudRowActionsProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Troca o ícone de "ver" por spinner e desabilita o item (busca de detalhe sob demanda). */
  viewLoading?: boolean;
  /** Troca o ícone de "editar" por spinner e desabilita o item. */
  editLoading?: boolean;
  /** Desabilita o toggle inteiro (ex.: enquanto outra ação da linha está em curso). */
  disabled?: boolean;
};

/**
 * Menu de ações de linha/card (`ver`/`editar`/`excluir`) — SPEC-18,
 * reescrito de trio de botões pra dropdown compacto na SPEC-55 (decisão do
 * usuário: menos espaço horizontal ocupado por linha da tabela). Cada item
 * só aparece se o callback correspondente for passado (mesmo padrão
 * condicional de antes, ex.: `collaborators` sem `onEdit` porque o Core não
 * expõe update de Collaborator). Assinatura pública (`CrudRowActionsProps`)
 * inalterada — nenhum dos 9 consumidores precisa mudar como chama o
 * componente.
 */
export function CrudRowActions({
  onView,
  onEdit,
  onDelete,
  viewLoading,
  editLoading,
  disabled,
}: CrudRowActionsProps) {
  const t = useT();
  const busy = disabled || viewLoading || editLoading;

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        as="button"
        type="button"
        className={`btn btn-sm btn-outline-secondary ${styles.toggle}`}
        disabled={busy}
        aria-label={t("crud.list.rowActionsToggle")}
      >
        {viewLoading || editLoading ? (
          <Spinner size="sm" animation="border" />
        ) : (
          <i className="bi bi-three-dots-vertical" aria-hidden />
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {onView ? (
          <Dropdown.Item onClick={onView} disabled={disabled || viewLoading}>
            <i className="bi bi-eye me-2" aria-hidden />
            {t("crud.list.rowActionsView")}
          </Dropdown.Item>
        ) : null}
        {onEdit ? (
          <Dropdown.Item onClick={onEdit} disabled={disabled || editLoading}>
            <i className="bi bi-pencil me-2" aria-hidden />
            {t("crud.list.rowActionsEdit")}
          </Dropdown.Item>
        ) : null}
        {onDelete ? (
          <Dropdown.Item onClick={onDelete} disabled={disabled} className="text-danger">
            <i className="bi bi-trash me-2" aria-hidden />
            {t("crud.list.rowActionsDelete")}
          </Dropdown.Item>
        ) : null}
      </Dropdown.Menu>
    </Dropdown>
  );
}

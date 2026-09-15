import { Spinner } from "react-bootstrap";

export type CrudRowActionsProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Troca o ícone de "ver" por spinner e desabilita o botão (busca de detalhe sob demanda). */
  viewLoading?: boolean;
  /** Troca o ícone de "editar" por spinner e desabilita o botão. */
  editLoading?: boolean;
  /** Desabilita os 3 botões (ex.: enquanto outra ação da linha está em curso). */
  disabled?: boolean;
};

/**
 * Trio padrão de ações de linha/card (`ver`/`editar`/`excluir`) — SPEC-18.
 * Cada botão só aparece se o callback correspondente for passado (mesmo
 * padrão condicional que as telas já usavam antes, ex.: `collaborators` sem
 * `onEdit` porque o Core não expõe update de Collaborator). Estilo fixo
 * (`btn-outline-primary/success/danger` + `bi-eye/pencil/trash`), o mesmo já
 * usado nas 9 telas migradas — não serve pro padrão de pílula/5-ações de
 * `admin/access` (fora de escopo, ver SPEC-18 §4).
 */
export function CrudRowActions({
  onView,
  onEdit,
  onDelete,
  viewLoading,
  editLoading,
  disabled,
}: CrudRowActionsProps) {
  return (
    <div className="d-flex gap-2">
      {onView ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          disabled={disabled || viewLoading}
          onClick={onView}
        >
          {viewLoading ? (
            <Spinner size="sm" animation="border" />
          ) : (
            <i className="bi bi-eye" aria-hidden />
          )}
        </button>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-success"
          disabled={disabled || editLoading}
          onClick={onEdit}
        >
          {editLoading ? (
            <Spinner size="sm" animation="border" />
          ) : (
            <i className="bi bi-pencil" aria-hidden />
          )}
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-danger"
          disabled={disabled}
          onClick={onDelete}
        >
          <i className="bi bi-trash" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Botões de ação padrão de linha/card do CRUD genérico (editar/excluir, e
 * opcionalmente ver detalhes) — evita repetir o mesmo markup Bootstrap nas
 * 5 telas de cadastro da SPEC-04 (Terminal/Porto/Container/Navio/Produto) e
 * qualquer CRUD simples futuro que não precise do design em pílula
 * específico da tela de Acesso (SPEC-03/SPEC-11, que tem ações extras —
 * ativar/desativar/redefinir senha — e mantém seu próprio `RowActions`
 * local).
 */
export type CrudRowActionsProps = {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function CrudRowActions({ onView, onEdit, onDelete }: CrudRowActionsProps) {
  return (
    <div className="d-flex gap-2">
      {onView ? (
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onView}>
          <i className="bi bi-eye" aria-hidden />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={onEdit}>
          <i className="bi bi-pencil" aria-hidden />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onDelete}>
          <i className="bi bi-trash" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

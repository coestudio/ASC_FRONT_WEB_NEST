import { Dropdown } from "react-bootstrap";
import { ControlledMenu } from "./crud-row-actions";

/**
 * Um item do menu de ações em massa (SPEC-97) — genérico o bastante pra
 * cobrir "Editar NF/Lote"/"Excluir selecionados" (Romaneio) e "Estufar em
 * lote" (Operational), sem acoplar o componente a nenhuma tela específica.
 */
export type CrudBulkAction = {
  key: string;
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** `"danger"` pinta o item em vermelho (ex.: exclusão) — mesmo tratamento
   * visual que `CrudRowActions` já dá pro item "Excluir". */
  variant?: "danger";
};

export type CrudBulkActionsProps = {
  actions: CrudBulkAction[];
  show: boolean;
  position: { x: number; y: number };
  onToggle: (show: boolean) => void;
};

/**
 * Menu de ações em massa (SPEC-97) — reaproveita o `ControlledMenu`
 * flutuante/portalado que `CrudRowActions` já usa no modo controlado
 * (SPEC-79/96): ancorado na posição do clique (`onContextMenu` do
 * `CrudListPage`, quando `selection` está presente e há ≥1 item
 * selecionado), fecha em clique fora ou `Escape`. Diferente de
 * `CrudRowActions`, aqui os itens são genéricos (`actions`, não um trio fixo
 * ver/editar/excluir) — cada tela Multi-select monta sua própria lista,
 * reaproveitando os mesmos handlers que já existem na barra fixa
 * (`belowSearch`).
 */
export function CrudBulkActions({ actions, show, position, onToggle }: CrudBulkActionsProps) {
  if (!show) return null;

  return (
    <ControlledMenu x={position.x} y={position.y} onClose={() => onToggle(false)}>
      {actions.map((action) => (
        <Dropdown.Item
          key={action.key}
          onClick={() => {
            // Mesmo padrão de `CrudRowActions`: fecha o menu explicitamente
            // antes de rodar a ação — fora de um `<Dropdown>` de verdade
            // (menu avulso via portal), o fechamento automático do
            // react-bootstrap não acontece sozinho.
            onToggle(false);
            action.onClick();
          }}
          disabled={action.disabled}
          className={action.variant === "danger" ? "text-danger" : undefined}
        >
          <i className={`bi ${action.icon} me-2`} aria-hidden />
          {action.label}
        </Dropdown.Item>
      ))}
    </ControlledMenu>
  );
}

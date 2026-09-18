import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dropdown, Spinner } from "react-bootstrap";
import { useT } from "@/lib/ui-prefs";
import styles from "./crud-row-actions.module.css";

/**
 * Ação extra genérica (SPEC-65) — cobre casos que não são só "ver"/"editar"/
 * "excluir" (ex.: download de arquivo com atributo nativo `href`/`download`
 * do `<a>`, sem precisar de `onClick` + blob). Renderizada entre "Ver" e
 * "Editar" no menu. Quando `href` está presente, o `Dropdown.Item`
 * (react-bootstrap, componente `Anchor` por padrão) recebe `href`/
 * `download`/`target`/`rel` diretamente — mesmo comportamento nativo do
 * `<a>` que existia solto antes desta SPEC.
 */
export type CrudRowExtraAction = {
  key: string;
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
  download?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
};

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
  /** Ações adicionais (ex.: download) renderizadas entre "Ver" e "Editar" (SPEC-65). */
  extraActions?: CrudRowExtraAction[];
  /**
   * Modo controlado (SPEC-79) — quem chama decide quando o menu abre (ex.:
   * clique na linha/card da listagem, `CrudListPage.rowActions`), em vez do
   * toggle interno `⋮`. Passar `show`/`onToggle`/`position` juntos ativa esse
   * modo: nenhum toggle é renderizado — o menu aparece direto na posição do
   * clique (`position`, coordenadas de tela — `e.clientX`/`e.clientY`), via
   * `createPortal` pro `document.body` (evita qualquer clipping de
   * `overflow` de ancestral, sem precisar de truque de Popper `fixed`) e
   * fecha ao clicar fora. Sem essas props, comportamento antigo (toggle `⋮`
   * sempre visível, menu ancorado nele) inalterado.
   */
  show?: boolean;
  onToggle?: (show: boolean) => void;
  position?: { x: number; y: number };
};

/** Espaço mínimo (px) entre o menu e a borda da viewport — evita o menu colar na borda. */
const MENU_VIEWPORT_MARGIN_PX = 8;

/**
 * Menu flutuante do modo controlado (SPEC-79) — nasce ancorado no ponto do
 * clique (`x`/`y`) e só depois de medido (`useLayoutEffect`) é reposicionado
 * pra não vazar da viewport (o clique pode acontecer perto de qualquer
 * borda). Fecha em clique fora (`mousedown` no documento, ignorando cliques
 * dentro do próprio menu) e em `Escape`.
 *
 * Exportado (SPEC-97) pra ser reaproveitado por `crud-bulk-actions.tsx` — o
 * menu de ações em massa usa o mesmo mecanismo flutuante/portalado, só com
 * itens diferentes (ações em lote, não de um item só).
 */
export function ControlledMenu({
  x,
  y,
  onClose,
  children,
}: {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: y, left: x });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - MENU_VIEWPORT_MARGIN_PX;
    const maxTop = window.innerHeight - rect.height - MENU_VIEWPORT_MARGIN_PX;
    setPos({
      left: Math.max(MENU_VIEWPORT_MARGIN_PX, Math.min(x, maxLeft)),
      top: Math.max(MENU_VIEWPORT_MARGIN_PX, Math.min(y, maxTop)),
    });
  }, [x, y]);

  useLayoutEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className={`dropdown-menu show ${styles.controlledMenu}`}
      style={{ position: "fixed", top: pos.top, left: pos.left }}
      // Nenhum clique dentro do menu deve fechar a linha/card por baixo
      // (mesma ideia do `stopPropagation` que o `CrudListPage` já fazia na
      // célula/overlay antigos — agora desnecessário lá, feito aqui).
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * Menu de ações de linha/card (`ver`/`editar`/`excluir`) — SPEC-18,
 * reescrito de trio de botões pra dropdown compacto na SPEC-55 (decisão do
 * usuário: menos espaço horizontal ocupado por linha da tabela) e, no modo
 * controlado, reescrito de novo na SPEC-79 pra menu flutuante ancorado no
 * clique (não mais num toggle fixo `⋮` numa coluna/célula reservada — o
 * pedido era remover esse espaço por completo, não só escondê-lo). Cada
 * item só aparece se o callback correspondente for passado (mesmo padrão
 * condicional de sempre, ex.: `collaborators` sem `onEdit` porque o Core não
 * expõe update de Collaborator). Assinatura pública (`CrudRowActionsProps`)
 * só ganhou props novas, nada mudou pra quem já chamava sem elas.
 */
export function CrudRowActions({
  onView,
  onEdit,
  onDelete,
  viewLoading,
  editLoading,
  disabled,
  extraActions,
  show,
  onToggle,
  position,
}: CrudRowActionsProps) {
  const t = useT();
  const busy = disabled || viewLoading || editLoading;
  const controlled = onToggle != null;

  // No modo controlado, `Dropdown.Item` não tem o `Dropdown`/contexto de
  // sempre por perto (o menu é um `<div>` avulso via portal, sem
  // `<Dropdown>` ao redor) — o fechamento automático que o react-bootstrap
  // faz ao clicar um item some junto. Cada clique aqui fecha o menu
  // explicitamente (`onToggle(false)`) antes de rodar a ação de verdade; no
  // modo não-controlado (`onToggle` ausente), essa chamada não existe e o
  // `Dropdown` de sempre continua fechando sozinho como sempre fechou.
  const withClose = (fn?: () => void) =>
    fn
      ? () => {
          if (controlled) onToggle?.(false);
          fn();
        }
      : undefined;

  const items = (
    <>
      {onView ? (
        <Dropdown.Item onClick={withClose(onView)} disabled={disabled || viewLoading}>
          <i className="bi bi-eye me-2" aria-hidden />
          {t("crud.list.rowActionsView")}
        </Dropdown.Item>
      ) : null}
      {extraActions?.map((action) => (
        <Dropdown.Item
          key={action.key}
          onClick={withClose(action.onClick)}
          href={action.href}
          download={action.download}
          target={action.target}
          rel={action.rel}
          disabled={disabled || action.disabled}
        >
          <i className={`bi ${action.icon} me-2`} aria-hidden />
          {action.label}
        </Dropdown.Item>
      ))}
      {onEdit ? (
        <Dropdown.Item onClick={withClose(onEdit)} disabled={disabled || editLoading}>
          <i className="bi bi-pencil me-2" aria-hidden />
          {t("crud.list.rowActionsEdit")}
        </Dropdown.Item>
      ) : null}
      {onDelete ? (
        <Dropdown.Item onClick={withClose(onDelete)} disabled={disabled} className="text-danger">
          <i className="bi bi-trash me-2" aria-hidden />
          {t("crud.list.rowActionsDelete")}
        </Dropdown.Item>
      ) : null}
    </>
  );

  if (controlled) {
    if (!show || !position) return null;
    return (
      <ControlledMenu x={position.x} y={position.y} onClose={() => onToggle?.(false)}>
        {items}
      </ControlledMenu>
    );
  }

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        as="button"
        type="button"
        className={`btn btn-sm btn-soft ${styles.toggle}`}
        disabled={busy}
        aria-label={t("crud.list.rowActionsToggle")}
      >
        {viewLoading || editLoading ? (
          <Spinner size="sm" animation="border" />
        ) : (
          <i className="bi bi-three-dots-vertical" aria-hidden />
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu popperConfig={{ strategy: "fixed" }} renderOnMount>
        {items}
      </Dropdown.Menu>
    </Dropdown>
  );
}

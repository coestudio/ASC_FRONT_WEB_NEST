import { Dropdown, Spinner } from "react-bootstrap";
import { useT } from "@/lib/ui-prefs";
import styles from "./crud-row-actions.module.css";

/**
 * Ação extra genérica (SPEC-63) — cobre casos que não são só "ver"/"editar"/
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
  /** Ações adicionais (ex.: download) renderizadas entre "Ver" e "Editar" (SPEC-63). */
  extraActions?: CrudRowExtraAction[];
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
 *
 * `popperConfig={{ strategy: "fixed" }}` (bug pós-SPEC-55): tanto
 * `CrudListPage`/`operations-list.tsx` (`.tableCard`, `overflow: hidden`)
 * quanto o wrapper `.table-responsive` do `<Table responsive>` do
 * React-Bootstrap (`overflow-x: auto`, que contamina `overflow-y` pra
 * `auto` por regra do CSS) recortam visualmente o menu em linhas perto do
 * fim da tabela — o Popper.js calcula a posição certa, mas o navegador
 * ainda clipa a pintura porque o menu (`position: absolute` por padrão)
 * continua contido na caixa de overflow do ancestral. Trocar a estratégia
 * do Popper pra `fixed` tira o menu do fluxo de clipping de overflow dos
 * ancestrais (nenhum deles tem `transform`/`filter` que recriaria um
 * containing block pro `fixed`, ver AppShell), sem precisar de portal nem
 * mudar o `overflow` dos wrappers (que existe de propósito, pro scroll
 * horizontal da tabela em telas estreitas).
 *
 * `renderOnMount` (bug pós-correção acima): com `strategy: "fixed"` e
 * `Dropdown.Menu` desmontado enquanto fechado (padrão do react-bootstrap),
 * o Popper só é *criado* no instante em que o menu é aberto pela primeira
 * vez — nesse instante o elemento ainda não tem layout estável (o browser
 * ainda não pintou o menu no DOM), então o primeiro cálculo de posição sai
 * errado (menu aparece ancorado em `0,0`/topo da página). Fechar e abrir de
 * novo funciona porque aí o Popper já existe e só recalcula a posição, que
 * dessa vez está correta. `renderOnMount` mantém o `Dropdown.Menu` (oculto
 * via CSS) sempre montado no DOM, então o Popper é instanciado e mede o
 * layout real antes do primeiro clique — o mesmo padrão já usado em
 * `UserMenu.tsx` pro mesmo bug.
 */
export function CrudRowActions({
  onView,
  onEdit,
  onDelete,
  viewLoading,
  editLoading,
  disabled,
  extraActions,
}: CrudRowActionsProps) {
  const t = useT();
  const busy = disabled || viewLoading || editLoading;

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
        {onView ? (
          <Dropdown.Item onClick={onView} disabled={disabled || viewLoading}>
            <i className="bi bi-eye me-2" aria-hidden />
            {t("crud.list.rowActionsView")}
          </Dropdown.Item>
        ) : null}
        {extraActions?.map((action) => (
          <Dropdown.Item
            key={action.key}
            onClick={action.onClick}
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

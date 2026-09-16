# SPEC-55 — Cabeçalho de listagem com slot de ações + dropdown de ações de linha

- **ID:** SPEC-55
- **Nome:** list-header-and-row-actions
- **Status:** IMPLEMENTED
- **Autor:** portal-dev-agent (rascunho, 2026-09-16 — continuação de
  investigação anterior, decisões do usuário já tomadas, ver §5)
- **Área:** `src/components/crud/crud-list-page.tsx`,
  `src/components/crud/crud-row-actions.tsx`,
  `src/components/operations/tabs/Romaneio.tsx`,
  `src/components/operations/operations-list.tsx`, e os 7 consumidores de
  `CrudColumn`/`CrudListPage` com coluna de ações (ver §6).
- **Contexto do pedido:** dois achados da investigação de polimento visual
  do usuário: (1) o toolbar "Exportar/Importar" da aba Romaneio fica solto
  acima do `CrudListPage`, fora do padrão de cabeçalho das outras
  listagens; (2) o trio de botões `ver`/`editar`/`excluir`
  (`CrudRowActions`) ocupa espaço horizontal fixo em toda linha da tabela,
  quando um menu de ações (dropdown) é mais compacto e é o padrão que o
  usuário quer.

---

## 1. Objetivo

1. Dar ao `CrudListPage` um slot de ações de cabeçalho (`headerActions`),
   ao lado do título, para que telas com botões de topo (ex.: Romaneio)
   parem de desenhar esse toolbar solto fora do componente genérico.
2. Trocar `CrudRowActions` de um trio de botões fixos por um dropdown
   (`Dropdown` do `react-bootstrap`) com toggle de ícone único
   (`bi-three-dots-vertical`), mantendo os mesmos callbacks/estados que já
   existem hoje (`onView`/`onEdit`/`onDelete`, `viewLoading`/`editLoading`/
   `disabled`).
3. Alinhar a coluna de ações à direita (`align: "end"`) nos 9
   consumidores que hoje usam `CrudRowActions`, deixando o menu compacto
   encostado na borda direita da tabela.

## 2. Contexto (achados da investigação)

### 2.1 `CrudListPage` não tem slot de ações no cabeçalho

`crud-list-page.tsx` renderiza só `<h1>{t(titleKey)}</h1>` +
`descriptionKey` opcional no bloco de topo (linhas 253-258). Não existe
hoje nenhum `ReactNode` reservado ao lado do título. `Romaneio.tsx`
contorna isso desenhando seu próprio `<div className="d-flex
justify-content-end gap-2 mb-2">` com os botões "Exportar"/"Importar"
**antes** de `<CrudListPage>` (linhas 292-307 e 309+), fora de qualquer
slot do componente genérico — funciona, mas não é reutilizável por
nenhuma outra tela que precise de um botão de ação de topo além de
"Novo" (`onCreate`, já suportado).

### 2.2 `CrudRowActions` hoje é um trio de botões fixos

`crud-row-actions.tsx` (SPEC-18, ajustado na SPEC-47 item 3) renderiza até
3 `<button>` (`bi-eye`/`bi-pencil`/`bi-trash`, `btn-outline-primary/
success/danger`), cada um só aparece se o callback correspondente for
passado. É consumido por 9 telas (confirmado via grep):

1. `src/components/operations/tabs/Romaneio.tsx`
2. `src/components/operations/operations-list.tsx` (**não** usa
   `CrudListPage`/`CrudColumn` — tabela própria, montada à mão, ver §6.2)
3. `src/routes/_dashboard/_internal/administrative/clients/index.tsx`
4. `src/routes/_dashboard/_internal/administrative/registry/harbor/index.tsx`
5. `src/routes/_dashboard/_internal/administrative/registry/terminal/index.tsx`
6. `src/routes/_dashboard/_internal/administrative/registry/product/index.tsx`
7. `src/routes/_dashboard/_internal/administrative/registry/container/index.tsx`
8. `src/routes/_dashboard/_internal/administrative/registry/vessel/index.tsx`
9. `src/routes/_dashboard/client/collaborators/index.tsx`

Das 9, as 7 rotas (itens 3-9) e `Romaneio.tsx` (item 1) usam
`CrudColumn`/`CrudListPage`, com uma coluna `{ key: "actions", headerKey:
"...colActions", render: (item) => <CrudRowActions ... /> }` — nenhuma
delas define `align` hoje (default `"start"`, `crud-list-page.tsx:62`).
`operations-list.tsx` (item 2) monta sua própria `<Table>` (linha 584),
sem `CrudColumn`, com `<th>`/`<td>` escritos à mão — a coluna de ações
precisa de ajuste manual de alinhamento nesse arquivo, não via
`CrudColumn.align`.

### 2.3 Decisões já tomadas pelo usuário (não são mais `[NEEDS_DECISION]`)

- Ícone do toggle do dropdown: **`bi-three-dots-vertical`** (kebab
  vertical) — não o pedido literal original (que seria o horizontal
  `bi-three-dots`).

## 3. Escopo

1. `CrudListPageProps` ganha `headerActions?: ReactNode`, renderizado no
   bloco de topo do `CrudListPage`, ao lado/à direita de `<h1>{title}</h1>`
   (mesma linha, `d-flex justify-content-between align-items-start` ou
   equivalente — layout exato definido na implementação, mantendo
   responsividade em telas estreitas).
2. `Romaneio.tsx` migra os botões "Exportar" e "Importar" (hoje num `<div>`
   solto acima de `<CrudListPage>`) para dentro de `headerActions`,
   removendo o `<div className="d-flex justify-content-end gap-2 mb-2">`
   externo.
3. `CrudRowActions` reescrito como `Dropdown` (`react-bootstrap`):
   - Toggle: botão só-ícone (`bi-three-dots-vertical`), mesmo tamanho
     compacto que o trio atual busca (SPEC-47 item 3 — altura de linha),
     variante neutra (ex.: `btn-outline-secondary` ou equivalente —
     detalhe de implementação, sem inventar nova paleta).
   - Itens: `Dropdown.Item` para "ver"/"editar"/"excluir", cada um só
     aparece se o callback correspondente (`onView`/`onEdit`/`onDelete`)
     for passado — mesma regra condicional de hoje.
   - Estados de loading (`viewLoading`/`editLoading`) e `disabled`
     continuam suportados nas mesmas props — like fica pra a
     implementação decidir como representar "carregando" dentro de um
     `Dropdown.Item` (ex.: `Spinner` inline no item, ou desabilitar o
     toggle inteiro enquanto uma ação da linha está em curso).
   - Assinatura pública (`CrudRowActionsProps`) não muda — nenhum
     consumidor precisa mudar a forma como chama `<CrudRowActions ... />`.
4. Nos 8 consumidores que usam `CrudColumn` (`Romaneio.tsx` + as 7 rotas
   listadas em §2.2), a coluna de ações passa a declarar `align: "end"`.
5. Em `operations-list.tsx` (não usa `CrudColumn`), a `<th>`/`<td>` da
   coluna de ações (a definir exatamente qual, checando o `<thead>`/
   `<tbody>` do arquivo na implementação) ganha alinhamento à direita
   equivalente (`text-end` ou classe correspondente), mantendo o resto da
   tabela sem alteração.

## 4. Fora do escopo

- Qualquer outra tela que hoje **não** usa `CrudRowActions` (ex.: telas
  com um padrão de ações diferente, como o de pílula/5-ações de
  `admin/access`, explicitamente fora de escopo desde a SPEC-18 §4 —
  continua fora aqui).
- Mudar o conjunto de ações disponíveis (ver/editar/excluir) — só a forma
  de apresentação (trio de botões → dropdown).
- Reordenar ou remover o botão "Novo" (`onCreate`) do `CrudListPage` — só
  soma um slot novo (`headerActions`), não mexe no que já existe.
- Auditoria visual geral / destaque de informações (itens 3 e 7 da
  investigação original) — adiados, sem SPEC própria por ora (decisão do
  usuário).

## 5. Decisões já tomadas (não são `[NEEDS_DECISION]`)

- **Ícone do toggle do dropdown:** `bi-three-dots-vertical` (decisão do
  usuário, substitui o pedido literal original de ícone horizontal).
- **Raio de borda de qualquer superfície nova tocada por esta SPEC:**
  se a implementação precisar de um card/superfície com borda (ex.: o
  dropdown menu em si, se React-Bootstrap não já cobrir isso via tema),
  usa `var(--bs-border-radius-sm)` — nunca um valor fixo tipo `1.15rem`
  do legado `warren/Portal`. Na prática, o `Dropdown.Menu` do
  react-bootstrap já herda o raio padrão do Bootstrap via `--bs-dropdown-
  border-radius`; só vira relevante se a implementação notar necessidade
  de um override.

## 6. Requisitos funcionais

- **RF1** — `CrudListPageProps.headerActions?: ReactNode`, renderizado no
  bloco de topo do `CrudListPage`, ao lado do título.
- **RF2** — `Romaneio.tsx` passa os botões "Exportar" e "Importar" como
  `headerActions`, removendo o `<div>` externo duplicado.
- **RF3** — `CrudRowActions` vira `Dropdown` com toggle
  `bi-three-dots-vertical`; ver/editar/excluir como `Dropdown.Item`
  condicionais, mesma assinatura pública (`CrudRowActionsProps`
  inalterada).
- **RF4** — Estados `viewLoading`/`editLoading`/`disabled` continuam
  funcionando visualmente dentro do novo dropdown (spinner e/ou
  desabilitação, decisão de detalhe da implementação).
- **RF5** — Nos 8 consumidores baseados em `CrudColumn` (`Romaneio.tsx` +
  as 7 rotas de §2.2), a coluna de ações declara `align: "end"`.
- **RF6** — Em `operations-list.tsx`, a coluna de ações (tabela própria,
  sem `CrudColumn`) fica alinhada à direita por classe utilitária
  Bootstrap equivalente.

## 7. Não funcionais

- Sem regressão de acessibilidade: o toggle do `Dropdown` precisa de
  `aria-label` (o ícone sozinho não tem texto visível) — mesmo padrão que
  os botões antigos já não tinham texto (só `aria-hidden` no `<i>`), mas
  um dropdown headless precisa de rótulo acessível no próprio toggle.
- Sem mudança de comportamento dos callbacks (`onClick` de cada ação
  continua disparando a mesma função que já existe em cada consumidor).

## 8. Camada de dados

Não há camada de dados nova — mudança é 100% de apresentação
(`components/crud/**`, uma prop nova em `CrudListPage`, um componente
reescrito em `CrudRowActions`). Nenhum endpoint novo, nenhuma query nova.

## 9. UI

- `CrudListPage`: bloco de topo passa a comportar `<h1>` +
  `descriptionKey` de um lado e `headerActions` do outro (layout
  responsivo — quebra pra baixo em telas estreitas se necessário, mesmo
  padrão já usado no toolbar de busca/filtros/`ViewToggle`/`onCreate`
  logo abaixo).
- `CrudRowActions`: `Dropdown` do `react-bootstrap`
  (`Dropdown`/`Dropdown.Toggle`/`Dropdown.Menu`/`Dropdown.Item`), variante
  do toggle e espaçamento a definir na implementação seguindo o restante
  do design system do projeto (Bootstrap 5.3, regra 8 do `AGENTS.md` —
  nunca Tailwind).
- Ícone do toggle: `bi-three-dots-vertical` (Bootstrap Icons, já em uso no
  projeto via `bi bi-*`).

## 10. i18n

- Se o toggle precisar de `aria-label` textual, nova chave no namespace
  `crud` (ex.: `crud.list.rowActionsToggle`) nos 4 locales — nome exato a
  confirmar na implementação (`pt-BR` primeiro, espelhado nos outros 3).
- Nenhuma outra chave nova prevista — os itens do dropdown reusam labels
  já existentes ou só ícone (mesmo padrão visual atual, que também não
  tem texto nos botões, só `title`/ícone).

## 11. Arquivos esperados

- `src/components/crud/crud-list-page.tsx`
- `src/components/crud/crud-row-actions.tsx`
- `src/components/crud/crud-row-actions.module.css` (ajuste ou remoção,
  conforme o novo componente precisar ou não de CSS Module próprio)
- `src/components/operations/tabs/Romaneio.tsx`
- `src/components/operations/operations-list.tsx`
- `src/routes/_dashboard/_internal/administrative/clients/index.tsx`
- `src/routes/_dashboard/_internal/administrative/registry/harbor/index.tsx`
- `src/routes/_dashboard/_internal/administrative/registry/terminal/index.tsx`
- `src/routes/_dashboard/_internal/administrative/registry/product/index.tsx`
- `src/routes/_dashboard/_internal/administrative/registry/container/index.tsx`
- `src/routes/_dashboard/_internal/administrative/registry/vessel/index.tsx`
- `src/routes/_dashboard/client/collaborators/index.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/crud.json` (se `aria-label` novo
  entrar em escopo)

## 12. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `CrudListPage` aceita `headerActions` e renderiza o conteúdo passado ao lado do título, em toda tela que já usa o componente (sem regressão visual nas que não passam a prop) |
| CA2 | Aba Romaneio (`/administrative/operations/$id`) mostra "Exportar"/"Importar" dentro do cabeçalho do `CrudListPage`, sem o `<div>` solto de antes |
| CA3 | `CrudRowActions` renderiza um único toggle (`bi-three-dots-vertical`) que abre um dropdown com ver/editar/excluir condicionais, nas 9 telas listadas em §2.2 |
| CA4 | Estados de loading/disabled continuam visíveis e funcionais dentro do dropdown |
| CA5 | Coluna de ações alinhada à direita nas 9 telas (8 via `CrudColumn.align="end"`, 1 via classe manual em `operations-list.tsx`) |
| CA6 | `bun run check` + `bun run lint` sem regressão |
| CA7 | Verificação visual manual em pelo menos 2 das 9 telas (uma com `CrudListPage`/`CrudColumn`, ex. `administrative/clients`; `operations-list.tsx`, que tem tabela própria), documentada nas Implementation Notes |

## 13. Riscos

- **R1** — `operations-list.tsx` não usa `CrudColumn`; o ajuste de
  alinhamento ali é manual e pode divergir sutilmente do resultado visual
  das outras 8 telas — revisar visualmente antes de fechar.
- **R2** — Trocar de botões visíveis pra um dropdown reduz a descoberta
  imediata das ações (usuário precisa clicar no toggle pra ver as opções)
  — trade-off aceito pelo usuário na decisão (§2.3), não é
  `[NEEDS_DECISION]`.
- **R3** — `Dropdown.Menu` do react-bootstrap, em tabela com `overflow`/
  `responsive` (`<Table responsive>`), pode ter problema de recorte
  (`overflow: hidden` do container cortando o menu aberto na última linha
  da tabela) — checar na implementação, mesmo padrão de risco já conhecido
  em bibliotecas de tabela com dropdown de linha.

## 14. Dependências

Nenhuma — independente de SPEC-56 e SPEC-57.

## Implementation Notes

- **Arquivos alterados:**
  - `src/components/crud/crud-list-page.tsx` — `CrudListPageProps.headerActions?: ReactNode`;
    bloco de topo trocado de `<div className="mb-3">` pra
    `d-flex justify-content-between align-items-start gap-2 flex-wrap mb-3`,
    renderizando `headerActions` (se presente) num `div` à direita do
    título/descrição.
  - `src/components/crud/crud-row-actions.tsx` — reescrito de trio de
    `<button>` pra `Dropdown` (`react-bootstrap`): toggle único
    (`bi-three-dots-vertical`, `btn-outline-secondary`, `aria-label` via
    `crud.list.rowActionsToggle`), `Dropdown.Item` condicional por
    callback (`onView`/`onEdit`/`onDelete`), cada item com ícone + label
    textual (`crud.list.rowActionsView/Edit/Delete`) e `text-danger` no
    item de excluir. Assinatura pública (`CrudRowActionsProps`)
    inalterada.
  - `src/components/crud/crud-row-actions.module.css` — `.button`/
    `.actions` (trio antigo) substituídos por `.toggle` (mesmo tamanho
    compacto 1.75rem × 1.75rem) + `.toggle::after { display: none }` (some
    com a seta padrão do Bootstrap no toggle, mesmo padrão já usado em
    `language-switcher.module.css`/`AppShell/index.module.css`).
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/crud.json` — chaves novas
    `list.rowActionsToggle`/`rowActionsView`/`rowActionsEdit`/
    `rowActionsDelete` (decisão de detalhe: itens do dropdown levam texto
    visível, não só ícone — mais claro que um menu com 3 ícones sem
    rótulo, dentro do que a spec §10 permitia "reusa labels já existentes
    ou só ícone").
  - `src/components/operations/tabs/Romaneio.tsx` — botões
    "Exportar"/"Importar" migrados pro `headerActions` do `CrudListPage`
    (removido o `<div className="d-flex justify-content-end gap-2 mb-2">`
    externo); coluna `actions` ganhou `align: "end"`.
  - `src/components/operations/operations-list.tsx` — `<th>`/`<td>` da
    coluna de ações (tabela própria, sem `CrudColumn`) ganharam
    `className="text-end"`.
  - 7 rotas (`administrative/clients`, `administrative/registry/{harbor,
    terminal,product,container,vessel}`, `client/collaborators`) — coluna
    `actions` ganhou `align: "end"`.
- **Decisões tomadas durante a implementação:**
  - Itens do `Dropdown` levam texto (ver/editar/excluir), não só ícone —
    ver acima; documentado porque a spec deixava as duas opções em aberto.
  - `Dropdown.Toggle` não recebeu `id` manual — o `react-bootstrap`/
    `@restart/ui` já gera um id único internamente (`useDropdownToggle`),
    confirmado lendo `node_modules/react-bootstrap/cjs/DropdownToggle.js`;
    sem risco de `id` duplicado nas 9 telas com múltiplas linhas.
  - Toggle desabilitado (`disabled`) quando `disabled || viewLoading ||
    editLoading` — nenhuma ação da linha pode ser disparada enquanto outra
    está em curso, preservando o comportamento antigo do trio de botões.
- **Comandos executados:**
  - `bun run check` (tsc --noEmit) — **VERIFIED**, sem erros.
  - `bun run lint` — **VERIFIED**, mesmo baseline pré-existente (66
    problems: 3 errors, 63 warnings, todos alheios aos arquivos tocados
    por esta SPEC — confirmado via grep filtrando os arquivos alterados,
    zero ocorrência).
- **Critérios de aceitação:**

  | # | Critério | Status |
  | --- | --- | --- |
  | CA1 | `CrudListPage` aceita `headerActions`, sem regressão nas telas que não passam a prop | PASS (por leitura de código — slot condicional, `null` quando ausente) |
  | CA2 | Aba Romaneio mostra Exportar/Importar dentro do cabeçalho, sem `<div>` solto | PASS |
  | CA3 | `CrudRowActions` como dropdown com toggle único nas 9 telas | PASS (mesmo componente, 9 consumidores inalterados na chamada) |
  | CA4 | Loading/disabled funcionais no dropdown | PASS (por leitura de código) |
  | CA5 | Coluna de ações à direita nas 9 telas (8 `align:"end"` + 1 `text-end` manual) | PASS |
  | CA6 | `bun run check` + `bun run lint` sem regressão | PASS |
  | CA7 | Verificação visual manual em pelo menos 2 das 9 telas | NOT VERIFIED — dev server indisponível nesta sessão (mesma limitação de memória de sessão anterior) |

- **Limitações conhecidas:**
  - CA7 (verificação visual manual) não foi possível nesta sessão — dev
    server não ficou de pé. Validação feita por leitura de código/JSX e
    por precedente de padrão já usado em outros dropdowns do projeto
    (`UserMenu.tsx`, `language-switcher.tsx`, `brand-switcher.tsx`).
    Recomenda-se validar visualmente antes do merge, em especial R3 da
    spec (`Dropdown.Menu` recortado por `overflow`/`responsive` da
    `<Table responsive>` na última linha) — não confirmado nem refutado
    nesta rodada.
  - R1 (`operations-list.tsx` sem `CrudColumn`, ajuste manual) — aplicado
    via `text-end`, mesmo efeito visual esperado das outras 8 telas, mas
    não comparado lado a lado visualmente.

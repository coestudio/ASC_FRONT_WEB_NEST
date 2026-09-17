# SPEC-79 — Remover coluna de ações: clique seleciona/revela, duplo-clique abre; excluir também no modal

- **ID:** SPEC-79
- **Nome:** click-to-reveal-row-actions
- **Status:** IMPLEMENTED (2026-09-17)
- **Autor:** claude (pedido do usuário, 2026-09-17)
- **Área:** `src/components/crud/crud-list-page.tsx`,
  `src/components/crud/crud-row-actions.tsx`,
  `src/components/crud/crud-record-modal.tsx`, e os 8 consumidores
  listados em §3 (7 rotas + `operations-list.tsx`).
- **Supersede:** `specs/55-list-header-and-row-actions` §15 (largura
  `min-content` + toggle `btn-primary` da coluna de ações) — sem objeto
  se a coluna deixa de existir. §1-§14 da SPEC-55 continuam
  `IMPLEMENTED`, inalterados (cabeçalho `headerActions`, dropdown do
  `CrudRowActions` em si).
- **Não se aplica a:** aba "Operação" e suas sub-abas (Containers,
  Romaneio, Documents, Invoice, Occurrences, Responsible, Operational/
  Estufagem-Desestufagem) — pedido explícito do usuário. Essas telas já
  têm padrões próprios de interação por linha (seleção múltipla opt-in
  da SPEC-73/76/78, ações específicas de container/lacre, etc.) que não
  devem ser tocados aqui. Escopo desta SPEC é só as listagens CRUD
  genéricas (`operations-list.tsx` — lista de Operações — + as 7 rotas
  administrativas de §3).

---

## 1. Objetivo

Dois pedidos do usuário:

1. Remover a coluna de ações fixa da tabela (e o espaço reservado no
   card). Em vez disso: **clicar** num item da lista revela as ações
   daquele item; **clicar duas vezes** abre a página/modal de
   visualização do item (mesmo destino que o "ver" de hoje).
2. Todo modal de visualização/edição (`CrudRecordModal`) ganha um botão
   de **excluir**, para não depender só do menu de ações da lista pra
   remover um registro.

## 2. Contexto — estado atual

- `CrudRowActions` (SPEC-18/47/55/65) é um dropdown (`⋮`) sempre visível,
  numa coluna própria (`{ key: "actions", ... }`) em toda tabela — SPEC-55
  §15 (agora superseded) só ia ajustar a largura dessa coluna e a cor do
  toggle, mantendo a coluna.
- Na visão de **card**, a maioria dos 8 consumidores nem chama
  `CrudRowActions` dentro do `renderCard` (conferido em
  `clients/index.tsx:313-339` — card só mostra dado, sem nenhuma ação:
  hoje é preciso trocar pra visão de tabela pra ver/editar/excluir a
  partir do card). Este achado motiva tratar tabela e card juntas nesta
  SPEC, não só a tabela.
- `CrudRecordModal` (`crud-record-modal.tsx`) é o modal genérico de
  `view`/`edit`/`create` usado pelos 8 consumidores administrativos +
  `operations-list.tsx` + abas de Operação (`Details.tsx`,
  `Containers.tsx`, `Romaneio.tsx`). Hoje só tem os botões
  `Fechar`/`Cancelar` e `Salvar` (`Modal.Footer`, linhas 127-141) — não
  tem botão de excluir. Cada consumidor já implementa exclusão à parte,
  via `CrudRowActions.onDelete` → `ConfirmationModal` própria com estado
  local (`pendingDelete`/`setPendingDelete`, ex.
  `clients/index.tsx:133,284,300-301,372-380`).

## 3. Escopo — Parte 1: clique seleciona/revela, duplo-clique abre

Consumidores em escopo (mesma lista de "9 telas" da SPEC-55 §2.2, **menos**
as abas de Operação por exclusão explícita acima):

1. `src/components/operations/operations-list.tsx` (lista de Operações —
   tabela própria, sem `CrudColumn`)
2. `src/routes/_dashboard/_internal/administrative/clients/index.tsx`
3. `.../registry/harbor/index.tsx`
4. `.../registry/terminal/index.tsx`
5. `.../registry/product/index.tsx`
6. `.../registry/container/index.tsx`
7. `.../registry/vessel/index.tsx`
8. `src/routes/_dashboard/client/collaborators/index.tsx`

(`Romaneio.tsx`, aba de uma Operação, fica fora — é sub-aba de Operação.)

### 3.1 Requisitos funcionais

- **RF1** — A coluna `actions`/`{ key: "actions", ... }` deixa de existir
  em `CrudColumn[]` dos 8 consumidores (e a `<th>`/`<td>` equivalente em
  `operations-list.tsx`) — nenhuma célula reservada pra ações fica
  visível por padrão.
- **RF2** — Clicar (1x) numa linha da tabela ou num card: (a) destaca o
  item ("selecionado", cor de fundo) e (b) abre imediatamente, junto do
  clique, o menu de ações daquele item (`CrudRowActions`/
  `Dropdown.Menu` reaproveitado, `position: absolute`/`fixed` ancorado
  no ponto clicado ou na linha — um "mini menu" contextual, não um
  toggle que precisa de um segundo clique pra abrir). Clicar fora fecha
  o menu e desfaz a seleção. Decisão do usuário, Opção A (§7).
- **RF3** — Clicar 2x (duplo-clique) numa linha/card abre a visualização
  do item direto, sem passar pelo menu — mesmo destino que `onView` hoje
  (modal `CrudRecordModal` em modo `view` pros 7 consumidores
  administrativos + `collaborators`; navegação de página em
  `operations-list.tsx`, que já usa
  `navigate({ to: "/administrative/operations/$id" })`). Atalho
  opcional pra quem já sabe que quer visualizar — o menu do RF2 já
  contém "Ver" como alternativa sempre disponível (ver nota de touch
  abaixo).
- **RF4** — Editar/excluir continuam acessíveis a partir da revelação de
  ações do RF2 (mesmos callbacks `onEdit`/`onDelete` de hoje, só muda
  onde/quando aparecem).
- **RF5** — Card ganha o mesmo comportamento de clique/duplo-clique que a
  tabela (corrige o achado de §2: hoje card não tem nenhuma ação).

### 3.2 Fora do escopo (Parte 1)

- Abas/sub-abas de Operação (exclusão explícita, ver cabeçalho da SPEC).
- Mudar o conjunto de ações disponíveis (ver/editar/excluir) — só a forma
  de revelar/acessar.
- Acessibilidade de teclado/touch pro duplo-clique — ver risco R1 (§8).

## 4. Escopo — Parte 2: botão de excluir no `CrudRecordModal`

### 4.1 Requisitos funcionais

- **RF6** — `CrudRecordModalProps` ganha `onDelete?: () => void`
  (opcional — consumidor sem exclusão disponível, ex. `Collaborator` sem
  update hoje, simplesmente não passa a prop e o botão não aparece).
- **RF7** — Quando `onDelete` está presente e `mode !== "create"`
  (visualizar ou editar — registro já existe), `Modal.Footer` ganha um
  botão "Excluir" (`btn-outline-danger` ou equivalente, ícone
  `bi-trash`), posicionado à esquerda dos botões existentes (separado
  visualmente de `Fechar`/`Cancelar`/`Salvar` — ex. `me-auto` pra empurrar
  os outros dois pra direita, mesmo padrão comum de modal com ação
  destrutiva separada das de navegação/confirmação).
- **RF8** — Clicar em "Excluir" dispara `onDelete` — cada consumidor
  decide o que fazer (mesma responsabilidade de hoje: abrir a
  `ConfirmationModal` já existente, reutilizando o estado
  `pendingDelete`/`setPendingDelete` já implementado). Não muda o fluxo
  de confirmação em si, só adiciona um segundo gatilho pro mesmo
  `setPendingDelete(record)`.
- **RF9** — Os 8 consumidores de `CrudRecordModal` que já têm
  `onDelete`/exclusão disponível (todos exceto `collaborators`, que hoje
  não tem `onDelete` no `CrudRowActions` — conferir na implementação)
  passam a prop nova.

### 4.2 Fora do escopo (Parte 2)

- Mudar o fluxo de confirmação de exclusão (`ConfirmationModal`) em si —
  só adiciona um novo ponto de entrada pro mesmo fluxo.
- Abas de Operação — `CrudRecordModal` é usado lá também
  (`Details.tsx`/`Containers.tsx`/`Romaneio.tsx`), mas a exclusão de
  Cargo/Container/etc. tem fluxos próprios (não é o padrão genérico
  `pendingDelete` dos 8 consumidores administrativos); incluir essas
  telas é decisão nova, não presumida aqui — a menos que o usuário
  confirme que quer estender também.

## 5. i18n

Chaves novas (`crud.recordModal.*`, 4 locales, pt-BR canônico):

- `delete` — "Excluir"

(Reaproveita `crud.list.rowActionsDelete`/mensagens de confirmação já
existentes onde fizer sentido — a definir na implementação se cabe
reusar ou criar uma chave dedicada do modal.)

## 6. Arquivos esperados

- `src/components/crud/crud-list-page.tsx` (remover render da coluna de
  ações do fluxo padrão — ou deixar de exigir `actions` em `columns[]`
  dos consumidores, a definir na implementação).
- `src/components/crud/crud-row-actions.tsx` (adaptar pra ser
  invocado a partir da seleção de linha/card, não mais fixo numa
  célula).
- `src/components/crud/crud-record-modal.tsx` (RF6-RF8).
- Os 8 consumidores de §3 (remover coluna `actions`, adicionar
  clique/duplo-clique, passar `onDelete` pro modal).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/*.json` (chave nova §5).

## 7. Decisão de interação — Opção A (fechada, 2026-09-17)

Escolha do usuário: **"clique destaca linha/card e já mostra o menu de
opções usando posição absolute (um mini menu)"**. Ou seja, um único
clique já:

1. Destaca visualmente o item (cor de fundo de "selecionado").
2. Abre, no mesmo gesto, o menu de ações (reaproveitando
   `CrudRowActions`/`Dropdown.Menu` — "Ver"/"Editar"/"Excluir", mesmos
   callbacks condicionais de hoje), posicionado via `position: absolute`
   (ou `fixed`, mesmo truque de popper já usado hoje — ver comentário em
   `crud-row-actions.tsx` sobre `strategy: "fixed"` — reaproveitar, não
   reinventar) ancorado no item clicado, não numa coluna fixa.
3. Clicar fora do menu fecha o menu e desfaz a seleção.

Duplo-clique continua abrindo a visualização direto (RF3), como um
atalho — não é a única forma de "ver" um item, já que o menu do passo 2
também tem a opção "Ver".

**Mobile/touch — resolvido por decorrência da Opção A, sem necessidade
de um gesto equivalente a duplo-clique:** como o próprio toque (1x) já
revela o menu completo com "Ver"/"Editar"/"Excluir", tocar e depois
tocar em "Ver" cobre o caso de abrir o item em touch — não depende de
double-tap (que conflitaria com zoom/scroll do navegador). Duplo-clique
(RF3) fica como atalho exclusivo de mouse/desktop, sem prejuízo em
touch.

## 8. Riscos

- **R1** — Resolvido por design (§7): duplo-clique é só atalho de
  desktop; em touch, o toque único já revela o menu com "Ver", cobrindo
  o caso sem depender de double-tap.
- **R2** — Remover a coluna de ações muda a contagem de colunas visíveis
  nas 8 telas — conferir se sobra alguma referência a `align: "end"`/
  posição fixa que dependia dela (ex. SPEC-55 §15, já superseded).
- **R3** — `CrudRecordModal` é usado também pelas abas de Operação (fora
  do escopo da Parte 1, mas não da Parte 2/RF6) — cuidado pra não
  quebrar o layout do rodapé nessas telas ao adicionar o botão
  condicional; testar visualmente em pelo menos uma tela de Operação
  além das 8 administrativas.

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Nas 8 telas de §3, nenhuma coluna/célula fixa de ações aparece por padrão (tabela e card). |
| CA2 | Clicar 1x num item revela as ações daquele item, segundo a opção escolhida em §7. |
| CA3 | Clicar 2x (ou equivalente touch) num item abre a visualização (modal ou navegação, conforme a tela). |
| CA4 | Editar/excluir continuam funcionando a partir da revelação de ações, sem regressão de callback. |
| CA5 | Card, nas 8 telas, ganha ação (hoje só a tabela tinha — achado de §2). |
| CA6 | `CrudRecordModal` mostra botão "Excluir" quando `onDelete` é passado e `mode !== "create"`; ausente quando não é passado. |
| CA7 | Clicar "Excluir" no modal aciona o mesmo fluxo de confirmação já existente na tela (sem duplicar lógica de exclusão). |
| CA8 | Abas de Operação (Containers/Romaneio/Details/Operational) sem nenhuma mudança de comportamento de clique — só ganham o botão de excluir do modal se o consumidor decidir passar `onDelete` (RF9 nota, fora do escopo por padrão). |
| CA9 | `bun run check` + `bun run lint` sem regressão. |

## 10. Implementation Notes (2026-09-17)

- **Mecanismo central** (`crud-list-page.tsx`): novas props opcionais
  `rowActions?: (item, ctl: { show, onToggle }) => ReactNode` e
  `onRowOpen?: (item) => void`. `CrudListPageBody` ganhou um estado
  `activeId` (só um item ativo por vez) — clique em `<tr>`/card faz
  `setActiveId(id)`; duplo-clique chama `onRowOpen` e limpa `activeId`.
  Sem `rowActions`, nenhuma célula/coluna extra é renderizada (aditivo,
  outros consumidores do `CrudListPage` inalterados).
- **Tabela:** a antiga `<td>` de ações virou uma célula final `width: 0,
  padding: 0` (só existe quando `rowActions` é passado), com
  `onClick`/`onDoubleClick` com `stopPropagation` (clicar no menu não
  reabre/reflete na linha). `<thead>` ganhou uma `<th>` espelho (mesma
  largura zero) pra manter a contagem de colunas igual — sem isso o
  `<thead>` ficava com uma coluna a menos que o `<tbody>`.
- **Card:** `renderCard(item)` envolto num `div` `position: relative`
  com o clique/duplo-clique; o menu fica num `div` `position: absolute;
  top: 0.5rem; right: 0.5rem` por cima do card (mesma ideia da célula
  zero-width da tabela, adaptada pro grid).
- **`CrudRowActions`** ganhou modo controlado (`show`/`onToggle`): usa
  `<Dropdown show={show} onToggle={...}>` e troca o toggle `⋮` visível
  por uma âncora invisível de `1px` (`bsPrefix` customizado tira a seta
  `::after` do Bootstrap) — só existe pro Popper.js medir uma posição de
  referência; quem abre é o clique na linha/card, não a âncora em si. A
  estratégia `strategy: "fixed"` do Popper (já existente, resolvia o
  clipping do `.table-responsive`/`.tableCard`) continua funcionando sem
  mudança — é o que faz o menu se comportar como "position: absolute"
  ancorado no item clicado, mesmo dentro de containers com `overflow`.
- **`CrudRecordModal`** ganhou `onDelete?: () => void` (RF6-8) — botão
  "Excluir" (`btn-outline-danger`, `me-auto`) só quando `onDelete` está
  presente e `mode !== "create"`. Cada consumidor passa
  `onDelete={modal.record ? () => setPendingDelete(modal.record) : undefined}`,
  reaproveitando o `pendingDelete`/`ConfirmationModal` que já existia —
  nenhuma lógica de exclusão duplicada.
- **8 telas migradas:** `clients`, `harbor`, `terminal`, `product`,
  `container`, `vessel`, `collaborators` (rotas administrativas) +
  `operations-list.tsx` (lista de Operações, tabela própria — não usa
  `CrudListPage`, então o mesmo mecanismo de `activeId`/célula
  zero-width/âncora foi replicado manualmente em `OperationRow`/
  `OperationCard`). Em todas, a antiga `CrudColumn`/`<td>` de "actions"
  foi removida e a coluna virou `rowActions`.
  - **Achado corrigido:** `collaborators` tem sim `onDelete` disponível
    (o comentário original da SPEC-55 dizia que não tinha — só não tem
    `onEdit`, porque o Core não expõe update de `Collaborator`, R3 da
    SPEC-09). O modal de `collaborators` ganhou o botão de excluir
    normalmente.
  - **`operations-list.tsx`:** o card antes navegava direto no clique
    único (`<Card role="button" onClick={onView}>`) — agora segue o
    mesmo padrão das outras 7 telas (clique revela o menu, duplo-clique
    abre). `Operation` não tem `DELETE` no Core (nota já existente no
    arquivo), então não há botão de excluir no modal aqui — RF6-8 não
    se aplicam a esta tela por falta de capacidade, não por omissão.
- **Fora do escopo, como previsto:** nenhuma aba/sub-aba de Operação
  (Containers/Romaneio/Documents/Invoice/Occurrences/Details/
  Operational) foi tocada — todas continuam com o toggle `⋮` visível de
  sempre (modo não-controlado de `CrudRowActions`, sem `show`/
  `onToggle`).
- **i18n:** chave `crud.recordModal.delete` ("Excluir"/"Delete"/
  "Eliminar"/"删除") adicionada nos 4 locales de `crud.json`. As chaves
  `colActions`/`rowActionsToggle` das 8 telas migradas ficaram órfãs
  (não removidas — baixo risco, sem custo de manutenção real, e evita
  mexer em 4 arquivos JSON × 8 telas só por tidiness fora do escopo
  desta SPEC).
- `tsc --noEmit` limpo; `bun run lint` sem erro novo (baseline de 63
  avisos, confirmada antes e depois). Não verificado visualmente em
  navegador nesta sessão — comportamento de clique/duplo-clique/posição
  do mini menu fica como validação pendente na primeira revisão visual.

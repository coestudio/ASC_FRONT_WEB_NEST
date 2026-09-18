# SPEC-97 — Listagens Multi-select: botão direito abre menu de ações em massa + barra fixa padronizada

- **ID:** SPEC-97
- **Nome:** multi-select-rightclick-bulk-menu
- **Status:** IMPLEMENTED (2026-09-18) — aprovado pelo usuário ("APROVAR
  SPEC-97"). `[NEEDS_DECISION]` de §6 (botão direito sem seleção; touch)
  seguem abertas, não bloqueiam a implementação conforme §3.2.
- **Autor:** claude (pedido do usuário, 2026-09-18)
- **Área:** `src/components/crud/crud-list-page.tsx`,
  `src/components/operations/tabs/Romaneio.tsx`,
  `src/components/operations/tabs/Operational.tsx`.
- **Depende de:** `specs/53-romaneio-bulk-select-actions` (seleção
  múltipla genérica em `CrudListPage`, `IMPLEMENTED`) e, pro padrão
  visual do menu, `specs/96-single-select-click-view-rightclick-menu`
  (mecanismo de menu controlado ancorado em `clientX`/`clientY` via
  `onContextMenu`, mesmo `CrudRowActions`/portal — mas com conteúdo
  diferente: ações em massa, não ações de um item).
- **Não se aplica a:** telas **Single-select** (SPEC-96) nem às sub-abas
  de Operação sem seleção múltipla (Containers, Documents, Occurrences
  etc.).

---

## 0. Nomenclatura

Reaproveita a nomenclatura fixada em `specs/96` §0. Esta SPEC é sobre o
tipo **Multi-select**: listagens com checkbox por linha e ações em lote.
Hoje: `Romaneio.tsx` e `Operational.tsx` (`specs/53`,
`specs/74-stuffing-tab-filters-and-sort`). Nenhuma outra tela usa a prop
`selection` de `crud-list-page.tsx` hoje.

## 1. Objetivo

Dois pedidos do usuário, na mesma conversa:

1. Adicionar o **botão direito do mouse** como forma de abrir o menu de
   ações em massa (as mesmas ações que hoje aparecem na barra fixa) —
   **sem remover** a barra existente. As duas formas de acesso coexistem.
2. **Padronizar a posição e a visibilidade da barra fixa** em todas as
   telas Multi-select, usando o padrão já implementado em
   `Operational.tsx` (`belowSearch`, SPEC-76) como referência: barra
   **abaixo do campo de busca e acima da listagem**, **sempre visível**
   (não condicional a ter algo selecionado — botões desabilitados até
   `selectedIds.size > 0`, não a barra inteira escondida). Vira regra
   geral do tipo Multi-select, não só do Romaneio — **inclusive
   `Operational.tsx` precisa ser ajustada** pra seguir o padrão
   formalmente (pedido explícito do usuário), não fica só como
   referência que o Romaneio copia: a barra passa a ser um mecanismo
   compartilhado (prop dedicada em `CrudListPage`, não JSX solto
   duplicado em cada tela), e as duas telas migram pra ele — ver RF6-RF7.

**O que NÃO muda** (documentado aqui só pra fixar a régua, sem alteração
de código):

- **Clique (1x)** numa linha/card: continua alternando a seleção do item
  (`selection.onToggle`), igual hoje em `Romaneio.tsx`
  (`onRowSingleClick`) e `Operational.tsx` (`toggleSelected`).
- **Duplo clique**: continua abrindo a edição do item individual **só
  nas tabelas que têm essa ação disponível**. Hoje:
  - `Romaneio.tsx` — tem (`onRowDoubleClick` abre `CrudRecordModal` em
    modo edit, exceto linha estufada).
  - `Operational.tsx` — **não tem**: não passa `onRowDoubleClick`, não
    existe visualização/edição por fardo individual nessa tela, só
    seleção para a ação em lote de estufagem (comentário já existente no
    código, linha ~244-247). Duplo clique aqui continua sem efeito —
    **nenhuma mudança**, só confirma que a ausência é intencional e
    varia por tela (ponto levantado pelo usuário ao pedir esta SPEC).

## 2. Contexto — estado atual

- `Romaneio.tsx` (linhas 386-403): barra fixa acima da tabela, visível só
  quando `selectedIds.size > 0`, com contador + botão "Editar NF/Lote"
  (`setBulkEditOpen(true)`) + botão "Excluir selecionados"
  (`setBulkDeleteOpen(true)`).
- `Operational.tsx` (linhas 225-241, prop `belowSearch`): barra abaixo da
  busca, **sempre visível** (não condicional a ter seleção — pedido
  explícito do usuário na SPEC-76), com contador + botão "Estufar em
  lote" (`setBatchOpen(true)`), desabilitado até `selectedIds.size > 0`.
- `crud-list-page.tsx` já tem o mecanismo de menu controlado ancorado em
  posição de clique (`activeId`/`clickPos`, render único fora da
  tabela/grid via `rowActions`) usado hoje só para ações de **um** item
  (`CrudRowActions`). Este mecanismo é reaproveitado aqui, com um
  conteúdo diferente (ações em massa em vez de ações de item).

## 3. Escopo

### 3.1 Requisitos funcionais

- **RF1** — `CrudListPage` ganha uma prop nova opcional
  `bulkActions?: (ctl: { show: boolean; position: { x: number; y: number }; onToggle: (show: boolean) => void }) => ReactNode`,
  análoga a `rowActions` (SPEC-79) mas para o contexto de seleção em
  massa, não de um item. Só relevante quando `selection` também está
  presente.
- **RF2** — `onContextMenu` na linha/card (quando `selection` está
  presente): `e.preventDefault()` + abre o menu retornado por
  `bulkActions`, ancorado em `{x: e.clientX, y: e.clientY}` — mesmo
  mecanismo de `activeId`/`clickPos`/render único da SPEC-96/79, só que
  a "chave" ativa aqui não é mais um item específico, é um estado
  booleano de "menu de massa aberto" (não depende de qual linha foi
  clicada — a ação vale sobre `selectedIds` inteiro, não sobre o item
  clicado).
- **RF3** — **Pressuposto de design (sem confirmação explícita do
  usuário — assumido por analogia ao comportamento atual da barra):**
  o menu só abre quando `selectedIds.size > 0`. Botão direito numa
  listagem sem nada selecionado não faz nada (não abre menu vazio, não
  seleciona o item clicado automaticamente). Se o usuário quiser outro
  comportamento (ex. botão direito seleciona o item clicado e já abre o
  menu), é ajuste a confirmar antes de implementar — sinalizado como
  `[NEEDS_DECISION]` em §6.
- **RF4** — `Romaneio.tsx` passa `bulkActions` com os mesmos dois itens
  da barra atual (Editar NF/Lote, Excluir selecionados), reaproveitando
  `setBulkEditOpen`/`setBulkDeleteOpen` — nenhuma lógica de negócio
  nova, só um segundo ponto de entrada pros mesmos handlers.
- **RF5** — `Operational.tsx` passa `bulkActions` com o único item
  existente (Estufar em lote), reaproveitando `setBatchOpen` —
  desabilitado/omitido se `selectedIds.size === 0` (consistente com RF3;
  na prática nunca vai renderizar desabilitado porque RF3 já impede o
  menu de abrir sem seleção).
- **RF6** — `CrudListPage` **já tem** o mecanismo certo pra isso:
  `belowSearch?: ReactNode` (linha 136/622 de `crud-list-page.tsx`) já
  renderiza abaixo da busca e acima da listagem, sempre que a prop é
  passada — não precisa de prop nova. A "padronização" pedida pelo
  usuário é **de uso**, não de mecanismo novo: as telas Multi-select
  passam a usar essa prop já existente pra barra fixa, em vez de JSX
  solto fora do `CrudListPage` (caso do Romaneio hoje).
- **RF7** — `Romaneio.tsx` migra sua barra: hoje é um `<div>` solto
  **acima** de `<CrudListPage>` (linhas 386-403), renderizado só quando
  `selectedIds.size > 0` (`{selectedIds.size > 0 ? (...) : null}`).
  Passa a ser o valor de `belowSearch` (mesma prop que `Operational.tsx`
  já usa), **sempre renderizado** — os botões "Editar NF/Lote" e
  "Excluir selecionados" ficam `disabled` quando `selectedIds.size === 0`
  em vez da barra inteira sumir (mesmo padrão que `Operational.tsx` já
  aplica no botão "Estufar em lote", linhas 232-240).
- **RF8** — `Operational.tsx` **não precisa mudar** a barra em si — já
  usa `belowSearch`, já é sempre visível, já desabilita o botão sem
  seleção (padrão de referência, SPEC-76). O ajuste que o usuário pediu
  nessa tela é o já coberto por RF5 (adicionar o menu de botão direito
  com "Estufar em lote") — não há mudança adicional na barra fixa dela.

### 3.2 Fora do escopo

- Mudar o comportamento de clique simples (seleciona) ou duplo clique
  (edita item, só onde já existe) — documentado em §1 só pra fixar a
  régua, nenhuma alteração de código prevista aí.
- Telas Single-select (SPEC-96) e sub-abas de Operação sem seleção
  múltipla.
- Acesso ao menu de ações em massa em touch/mobile — mesma
  `[NEEDS_DECISION]` da SPEC-96 §6, não resolvida aqui.

## 4. i18n

Nenhuma chave nova prevista — reaproveita os textos já existentes dos
botões da barra atual (`administrative-operations.romaneio.bulkActions.*`,
`administrative-operations.containers.stuffing.*`).

## 5. Arquivos esperados

- `src/components/crud/crud-list-page.tsx` (prop `bulkActions`, handler
  `onContextMenu` condicional a `selection`, RF1-RF3). `belowSearch` já
  existe, sem alteração de assinatura (RF6).
- `src/components/operations/tabs/Romaneio.tsx` (RF4 — menu de botão
  direito; RF7 — migrar barra pra `belowSearch`, sempre visível, botões
  `disabled` sem seleção).
- `src/components/operations/tabs/Operational.tsx` (RF5 — menu de botão
  direito; barra fixa em si sem mudança, RF8).

## 6. `[NEEDS_DECISION]`

1. **RF3** — confirmar se botão direito sem seleção deve ficar
   completamente inerte (assumido) ou ter algum comportamento (ex.
   selecionar o item clicado + abrir o menu já com ele).
2. Mesma pendência de touch/mobile herdada da SPEC-96 §6 — se for
   resolvida lá com um padrão geral (ex. long-press), este menu de massa
   herda a mesma solução; se for resolvida com kebab fixo só em touch,
   precisa de uma versão "kebab de ações em massa" equivalente aqui.

## 7. Riscos

- **R1** — Dois pontos de entrada pra mesma ação (barra + menu de botão
  direito) podem divergir visualmente/textualmente se um for atualizado
  sem o outro no futuro — mitigar reaproveitando os mesmos handlers e,
  quando fizer sentido, as mesmas strings i18n (já coberto por RF4/RF5).
- **R2** — `Operational.tsx` tem só uma ação em massa (estufar) — menu
  de botão direito com um único item pode parecer redundante frente à
  barra sempre visível; aceito porque o pedido do usuário foi
  consistência de padrão entre as telas Multi-select, não economia de
  cliques nesse caso específico.

## 8. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Em Romaneio, com ≥1 item selecionado, botão direito numa linha/card abre menu com "Editar NF/Lote" e "Excluir selecionados", ancorado na posição do clique. |
| CA2 | Em Operational, com ≥1 item selecionado, botão direito abre menu com "Estufar em lote", ancorado na posição do clique. |
| CA3 | Em ambas, botão direito sem nenhum item selecionado não abre menu (RF3). |
| CA4 | Em Romaneio, a barra de ação em massa aparece na posição `belowSearch` (abaixo da busca, acima da listagem), sempre visível, com os botões desabilitados quando não há seleção — igual ao padrão do Operational. |
| CA4b | Em Operational, a barra continua exatamente como está hoje (já seguia o padrão de referência) — sem regressão visual ou de comportamento. |
| CA5 | Clique simples continua selecionando, duplo clique continua abrindo edição só onde já abria (Romaneio) e continua sem efeito onde já não tinha efeito (Operational) — sem regressão. |
| CA6 | `bun run check` + `bun run lint` sem regressão. |

## 9. Implementation Notes

**Arquivos alterados/criados:**

- `src/components/crud/crud-list-page.tsx` — prop nova `bulkActions?: (ctl: { show; position; onToggle }) => ReactNode` (RF1), análoga a `rowActions`. Estado novo `bulkMenuPos` (`{x,y} | null`) em `CrudListPageBody` — a posição não-nula já serve como "show" (sem `activeId` equivalente, porque a ação não depende de qual item foi clicado, RF2). `onContextMenu` da linha (`<tr>`) e do card ganhou um segundo ramo (`else if selection && bulkActions`) que só dispara quando `rowActions` está ausente — nas duas telas Multi-select de hoje (Romaneio/Operational) isso nunca colide, porque nenhuma delas usa `rowActions`. O handler checa `selection.selectedIds.size === 0` e não faz nada nesse caso (RF3). Render do menu (`bulkActions(...)`) adicionado ao lado do render existente de `rowActions(...)`, no fim do corpo.
- `src/components/crud/crud-row-actions.tsx` — `ControlledMenu` (menu flutuante portalado, ancorado em `x`/`y`, fecha em clique fora/`Escape`) passou de função interna pra `export function` — reaproveitado pelo componente novo abaixo, em vez de duplicar a lógica de posicionamento/portal/fechamento.
- `src/components/crud/crud-bulk-actions.tsx` (novo) — `CrudBulkActions`, componente genérico que recebe uma lista de `actions` (`key`/`icon`/`label`/`onClick`/`disabled`/`variant?: "danger"`) e renderiza via `ControlledMenu` reaproveitado. Diferente de `CrudRowActions` (trio fixo ver/editar/excluir), aqui a lista é livre — cada tela monta os itens que já usa na barra fixa.
- `src/components/operations/tabs/Romaneio.tsx` — RF7: removida a `<div>` solta acima de `<CrudListPage>` (visível só com seleção); conteúdo movido pra prop `belowSearch` do `CrudListPage` (mesma posição que `Operational.tsx` já usava), sempre renderizada, com os dois botões (`Editar NF/Lote`, `Excluir selecionados`) ganhando `disabled={selectedIds.size === 0}` em vez de a barra inteira sumir. RF4: prop `bulkActions` nova com os mesmos dois itens, via `CrudBulkActions`, reaproveitando `setBulkEditOpen`/`setBulkDeleteOpen` — nenhum handler novo.
- `src/components/operations/tabs/Operational.tsx` (`StuffingTab`) — RF5: prop `bulkActions` nova com o único item existente ("Estufar em lote"), via `CrudBulkActions`, reaproveitando `setBatchOpen`. `belowSearch` (barra fixa) não mudou — RF8 confirmado, já era a referência.

**Comandos executados:**

- `bun run check` (tsc --noEmit) — `FAILED` (pré-existente, fora de escopo): 2 erros em `src/components/operations/tabs/Documents.tsx` e `Occurrences.tsx` (`Search` não existe no tipo dos params gerados). Confirmado via `git stash` + `bun run check` na árvore sem as mudanças desta SPEC: os mesmos 2 erros já existiam antes, em arquivos que esta SPEC não toca. Nenhum erro novo introduzido pelas mudanças da SPEC-97 — `VERIFIED` pro escopo desta feature.
- `bun run lint` — `VERIFIED`: 0 erros, 63 warnings (todos pré-existentes, em arquivos fora do escopo desta SPEC — `src/layouts/Form/Fields/**`, `src/lib/ui-prefs.tsx`). Nenhum warning nos arquivos tocados (`crud-list-page.tsx`, `crud-row-actions.tsx`, `crud-bulk-actions.tsx`, `Romaneio.tsx`, `Operational.tsx`).

**Critérios de aceitação:**

| # | Resultado |
| --- | --- |
| CA1 | PASS — `Romaneio.tsx` passa `bulkActions` com "Editar NF/Lote" e "Excluir selecionados", ancorado em `clientX`/`clientY` via `CrudBulkActions`/`ControlledMenu`. |
| CA2 | PASS — `Operational.tsx` (`StuffingTab`) passa `bulkActions` com "Estufar em lote". |
| CA3 | PASS — `onContextMenu` (linha e card) checa `selection.selectedIds.size === 0` e retorna sem abrir o menu (RF3). |
| CA4 | PASS — `Romaneio.tsx` migrou a barra pra `belowSearch`, sempre renderizada, botões `disabled` sem seleção. |
| CA4b | PASS — `Operational.tsx` não teve a barra (`belowSearch`) alterada, só ganhou a prop `bulkActions` nova. |
| CA5 | PASS (sem alteração de código) — `onRowSingleClick`/`onRowDoubleClick` de `Romaneio.tsx`/`Operational.tsx` não foram tocados; o novo ramo de `onContextMenu` só existe quando `rowActions` está ausente, então não interfere no clique/duplo-clique existente. |
| CA6 | PASS — ver comandos acima (0 erros de lint; check sem regressão nova). |

**Decisões tomadas durante a implementação (não 100% explícitas na SPEC):**

1. **Card view (`renderCard`) também ganhou o `onContextMenu` de massa.** A SPEC fala em "linha/card" (RF2) espelhando o texto de `rowActions`, mas nem Romaneio nem Operational hoje têm um mecanismo de seleção funcional em modo card (o `<Form.Check>` de seleção só existe na `<td>` da tabela; cards sem `rowActions` não têm nenhum handler de clique). Implementado o `onContextMenu` no wrapper do card por paridade estrutural com o menu de item (mesmo padrão condicional), mas isso não resolve a limitação pré-existente de seleção não funcionar em card view — fora do escopo desta SPEC, não é regressão introduzida aqui.
2. **`ControlledMenu` exportado de `crud-row-actions.tsx`** em vez de duplicado — reduz risco do R1 da SPEC (divergência visual entre os dois menus/pontos de entrada), já que agora os dois menus controlados (item e massa) compartilham o mesmíssimo mecanismo de posicionamento/portal/fechamento.
3. **Precedência entre `rowActions` e `bulkActions`** no `onContextMenu`: implementado como `rowActions ? (menu de item) : (selection && bulkActions ? (menu de massa) : undefined)` — `rowActions` sempre vence se ambos estiverem presentes. Não documentado explicitamente na SPEC porque hoje nenhuma tela usa as duas props ao mesmo tempo (Single-select usa `rowActions`, Multi-select usa `bulkActions`); a escolha evita ambiguidade caso isso mude no futuro, sem exigir prop de prioridade nova.

**Limitações conhecidas:** mesmas duas pendências já sinalizadas em §6 (botão direito sem seleção fica inerte, sem confirmação explícita do usuário; acesso em touch/mobile não resolvido) — nenhuma delas bloqueava a implementação, conforme §3.2.

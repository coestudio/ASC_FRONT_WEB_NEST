# SPEC-96 — Listagens Single-Select: clique abre view, duplo clique abre edição, botão direito abre menu

- **ID:** SPEC-96
- **Nome:** single-select-click-view-rightclick-menu
- **Status:** IMPLEMENTED (2026-09-18) — aprovado pelo usuário ("APROVAR
  SPEC-96"). `[NEEDS_DECISION]` de §6 (acesso ao menu em touch) segue
  aberta, não bloqueia a implementação desktop conforme §3.2.
- **Autor:** claude (pedido do usuário, 2026-09-18)
- **Área:** `src/components/crud/crud-list-page.tsx`,
  `src/components/crud/crud-row-actions.tsx`,
  `src/components/operations/operations-list.tsx`, e os 8 consumidores
  administrativos listados em §3.
- **Supersede:** `specs/79-click-to-reveal-row-actions` §3 (RF2/RF3 — a
  interação de "clique revela menu / duplo clique abre view" descrita lá).
  §4 (botão de excluir no `CrudRecordModal`) e o restante da SPEC-79
  continuam `IMPLEMENTED`, inalterados.
- **Não se aplica a:** telas do tipo **Multi-select** (Romaneio,
  Operational/Estufagem-Desestufagem — checkbox de seleção em massa,
  `specs/53-romaneio-bulk-select-actions`) nem às demais sub-abas de
  Operação que usam `CrudRowActions` no modo clássico (toggle `⋮` sempre
  visível — Containers, Documents, Occurrences, etc., SPEC-65). Escopo
  aqui é só o tipo **Single-select** (ver nomenclatura abaixo).

---

## 0. Nomenclatura — dois tipos de listagem (documentação, sem mudança de código)

Pra facilitar referência em specs futuras, o projeto passa a nomear os dois
padrões de listagem já existentes:

- **Single-select** — listagens sem checkbox de seleção múltipla; cada
  linha/card representa uma ação sobre **um** item por vez. Hoje: as 8
  telas administrativas (`administrative/clients`,
  `administrative/registry/{harbor,terminal,product,container,vessel}`,
  `client/collaborators`, `administrative/access`) + `operations-list.tsx`
  (lista de Operações), via `crud-list-page.tsx`/`rowActions`. **Esta SPEC
  muda a regra de interação deste tipo.**
- **Multi-select** — listagens com checkbox por linha e ações em lote
  (excluir/editar em massa). Hoje: `Romaneio.tsx` e `Operational.tsx`
  (`specs/53-romaneio-bulk-select-actions`, `onRowSingleClick`/
  `onRowDoubleClick`). **Fora do escopo desta SPEC — nenhuma mudança.**

## 1. Objetivo

Trocar a regra de interação por mouse nas listagens **Single-select**
(hoje: clique revela menu / duplo clique abre view, SPEC-79 §3/§7) por:

1. **Clique (1x)** numa linha/card: abre a visualização do item
   diretamente (mesmo destino do `onRowOpen`/"Ver" de hoje) — sem menu
   intermediário.
2. **Duplo clique (2x)**: abre a **edição** do item diretamente (mesmo
   destino do `onEdit`/"Editar" de hoje).
3. **Botão direito do mouse** (evento `contextmenu`, com
   `preventDefault()` do menu nativo do navegador): abre o menu de ações
   completo (`CrudRowActions` — Ver/Editar/Excluir), ancorado na posição
   do clique — mesmo mecanismo visual (`position: fixed` via
   `createPortal`, clamp de viewport) que a SPEC-79 já implementou pro
   clique simples, só troca o evento que dispara.

Motivação do usuário: fluxo mais rápido pra quem só quer consultar (maioria
dos acessos) — não precisa de um clique extra pra abrir o menu e escolher
"Ver".

## 2. Contexto — estado atual (SPEC-79, IMPLEMENTED)

Ver `specs/79-click-to-reveal-row-actions/spec.md` §10 (Implementation
Notes) pro mecanismo vigente: `crud-list-page.tsx` guarda `activeId` +
`clickPos` (`clientX`/`clientY`), `<tr>`/wrapper do card têm só `onClick`
(seta `activeId`/`clickPos`, revela o menu) e `onDoubleClick`
(`onRowOpen`, fecha o menu). `CrudRowActions` tem um modo controlado
(`show`/`position`/`onToggle`) usado só quando `rowActions` é passado.

## 3. Escopo

Mesmos 8 consumidores administrativos + `operations-list.tsx` da
`specs/79` §3:

1. `src/components/operations/operations-list.tsx`
2. `src/routes/_dashboard/_internal/administrative/clients/index.tsx`
3. `.../registry/harbor/index.tsx`
4. `.../registry/terminal/index.tsx`
5. `.../registry/product/index.tsx`
6. `.../registry/container/index.tsx`
7. `.../registry/vessel/index.tsx`
8. `src/routes/_dashboard/client/collaborators/index.tsx`
9. `src/routes/_dashboard/_internal/administrative/access/index.tsx`
   (migrado ao padrão `rowActions` pela SPEC-80 — conferir na
   implementação se já está na lista de consumidores de `crud-list-page`
   com `rowActions`, incluir se sim)

### 3.1 Requisitos funcionais

- **RF1** — `onClick` da linha/card chama `onRowOpen?.(item)` (view)
  diretamente. Não seta mais `activeId`/`clickPos` no clique simples, não
  há destaque visual de "selecionado" nesse evento.
- **RF2** — `onDoubleClick` da linha/card chama `onEdit?.(item)` (mesmo
  callback que hoje abre edição a partir do menu). Se o consumidor não
  tiver `onEdit` disponível (ex. sem permissão), duplo clique não faz
  nada — mesma regra condicional que já existe pro menu.
- **RF3** — `onContextMenu` da linha/card: `e.preventDefault()` (suprime
  o menu nativo do navegador) e abre o menu de ações (`CrudRowActions`
  controlado) ancorado em `{x: e.clientX, y: e.clientY}` — reaproveita
  exatamente o mecanismo de `activeId`/`clickPos`/render único fora da
  tabela que a SPEC-79 já implementou, só troca o evento de origem de
  `onClick` para `onContextMenu`.
- **RF4** — Menu aberto por RF3 continua fechando em clique fora ou
  `Escape` (comportamento já existente do modo controlado de
  `CrudRowActions`, sem mudança).
- **RF5** — Card (visão em grade) segue o mesmo padrão de RF1-RF3.

### 3.2 Fora do escopo

- Telas **Multi-select** (Romaneio, Operational) e sub-abas de Operação em
  modo clássico (`⋮` sempre visível) — nenhuma mudança.
- Acesso ao menu de ações em touch/mobile — **`[NEEDS_DECISION]`**, ver
  §6. Nesta SPEC, o requisito cobre certamente desktop (mouse); a
  implementação inicial pode deixar touch sem acesso ao menu até a
  decisão ser tomada, sem bloquear o restante.
- `CrudRecordModal` (botão de excluir) — já implementado pela SPEC-79,
  sem mudança aqui.

## 4. i18n

Nenhuma chave nova prevista — reaproveita textos existentes do menu
(`crud.list.rowActions*`).

## 5. Arquivos esperados

- `src/components/crud/crud-list-page.tsx` (trocar handlers de
  `onClick`/`onDoubleClick` conforme RF1-RF2, adicionar `onContextMenu`
  conforme RF3).
- `src/components/operations/operations-list.tsx` (réplica manual do
  mesmo padrão, como já faz hoje pro mecanismo da SPEC-79).
- Nenhuma mudança esperada em `crud-row-actions.tsx` — o modo controlado
  já existe e é agnóstico do evento que o aciona.

## 6. `[NEEDS_DECISION]` — acesso ao menu em touch/mobile

Sem botão direito em touch. Usuário optou por não decidir agora — registrar
como pendência aberta, não bloqueia a implementação desktop. Opções
levantadas na conversa que gerou esta SPEC (para retomar quando o usuário
quiser fechar):

1. **Long-press** dispara `contextmenu` em navegadores mobile — reaproveita
   RF3 sem handler extra, mas pode conflitar com seleção de texto/scroll
   do navegador dependendo do elemento.
2. **Botão kebab (⋮) fixo só em touch** — detecta `pointer: coarse` (media
   query ou `navigator.maxTouchPoints`) e volta ao modo clássico de
   `CrudRowActions` (toggle sempre visível) só nesse caso, mantendo
   clique = view / duplo toque = editar como em desktop.

## 7. Riscos

- **R1** — Duplo clique abrindo edição é um "salto" maior que abrir view
  (RF2) — usuário pode clicar duas vezes sem querer (ex. clique duplo
  acidental tentando só selecionar/focar) e cair direto no modo de edição
  de um registro. Mitigação: nenhuma prevista nesta SPEC (decisão
  consciente do usuário); se virar problema, reavaliar depois.
- **R2** — `contextmenu` já é usado pelo navegador/OS pra outras coisas em
  alguns contextos (ex. trackpad com clique de dois dedos, mouse sem botão
  direito configurado) — comportamento depende do dispositivo do usuário,
  fora do controle da aplicação.
- **R3** — Perda temporária de acesso ao menu de ações em touch até a
  `[NEEDS_DECISION]` de §6 ser fechada — usuários mobile ficam sem
  editar/excluir nas telas Single-select enquanto isso (podem só ver, via
  RF1). Avaliar se isso é aceitável como estado transitório ou se bloqueia
  o merge desta SPEC até §6 ser resolvido — **fica com o usuário decidir
  no momento da aprovação**.

## 8. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Nas telas Single-select de §3, clicar 1x numa linha/card abre a visualização do item, sem menu intermediário. |
| CA2 | Duplo clique numa linha/card abre a edição do item diretamente (quando `onEdit` disponível; sem efeito quando não). |
| CA3 | Botão direito do mouse numa linha/card abre o menu de ações (Ver/Editar/Excluir) ancorado na posição do clique, sem abrir o menu de contexto nativo do navegador. |
| CA4 | Menu aberto por botão direito fecha em clique fora ou `Escape`, mesmo comportamento já existente. |
| CA5 | Telas Multi-select (Romaneio, Operational) e sub-abas de Operação em modo clássico sem nenhuma mudança de comportamento. |
| CA6 | Card (visão em grade) segue o mesmo padrão de CA1-CA3. |
| CA7 | `bun run check` + `bun run lint` sem regressão. |

## 9. Implementation Notes (2026-09-18)

- **Mecanismo central (`crud-list-page.tsx`):** o `<tr>`/wrapper do card
  (só quando `rowActions` está presente) trocou de dois handlers
  (`onClick` revela menu / `onDoubleClick` abre view) pra três:
  - `onClick` → `onRowOpen?.(item)` direto, sem tocar em
    `activeId`/`clickPos` (RF1).
  - `onDoubleClick` → `onRowEdit?.(item)` direto (RF2, prop nova — ver
    abaixo).
  - `onContextMenu` → `e.preventDefault()` + `setActiveId(id)` +
    `setClickPos({x: e.clientX, y: e.clientY})` (RF3) — mesmo estado
    `activeId`/`clickPos` e o mesmo render único de `rowActions` fora da
    tabela/grid que a SPEC-79 já implementava, só trocando o evento de
    origem (`onClick` → `onContextMenu`).
  - `CrudRowActions`/`ControlledMenu` (`crud-row-actions.tsx`) não
    precisaram de nenhuma mudança — o modo controlado já era agnóstico do
    evento que dispara `show`/`position` (confirmado, como a SPEC previa
    em §5).
- **Prop nova `onRowEdit?: (item: T) => void`** — decisão tomada durante a
  implementação, não estava em §5 explicitamente: RF2 pede que o duplo
  clique abra a edição *direto*, mas `onEdit` só existia dentro do closure
  que cada consumidor monta em `rowActions={(item, ctl) => <CrudRowActions
  onEdit={...} .../>}`, sem ficar acessível pro `CrudListPageBody` (que só
  conhece `onRowOpen`). Solução: nova prop de topo `onRowEdit`, simétrica a
  `onRowOpen`, propagada por `CrudListPage` → `CrudListPageBody` do mesmo
  jeito. Cada um dos 8 consumidores de `rowActions` passou
  `onRowEdit={(item) => <mesmo destino do onEdit de dentro do rowActions>}`,
  **exceto `client/collaborators`**, que não tem `onEdit` (Core não expõe
  update de `Collaborator`, já documentado na SPEC-79) — sem a prop,
  duplo-clique não faz nada ali, conforme a regra condicional do RF2.
- **9 consumidores administrativos confirmados** (a lista de §3 tinha 8 +
  a ressalva do item 9 pra conferir `access`): `clients`, `registry/
  {harbor,terminal,product,container,vessel}`, `client/collaborators` e
  `admin/access/index.tsx` (não `administrative/access` como o texto da
  SPEC especulava — a rota real, migrada pela SPEC-80, é
  `src/routes/_dashboard/admin/access/index.tsx`; confirmado via grep por
  `rowActions=`). Todos os 8 com `onEdit` ganharam `onRowEdit`;
  `collaborators` ficou sem, pelo motivo acima.
- **`operations-list.tsx`** (réplica manual, tabela própria — não usa
  `CrudListPage`): `OperationRow`/`OperationCard` trocaram as props
  `onSelect`/`onOpen` por `onContextMenu`/`onOpen`/`onEdit`. `onClick`
  chama `onOpen` (via `viewOperation`) direto; `onDoubleClick` chama
  `onEdit` (nova função `editOperation`, que só age se `!readOnly` — mesma
  condição que já existia no `onEdit` do `CrudRowActions` montado em
  `OperationsList`, linha ~638); `onContextMenu` (com `preventDefault`)
  chama a função renomeada `openRowActions` (era `selectRowActions`) que
  seta `activeId`/`clickPos`. No modo `readOnly` (área Operacional,
  SPEC-08), duplo-clique não abre nada — coerente com RF2 e com o fato de
  o menu de ações também não oferecer "Editar" nesse modo.
- **RF4/CA4 (fechar em clique fora/`Escape`)** — nenhuma mudança
  necessária, é comportamento do `ControlledMenu`/modo controlado do
  `CrudRowActions`, que não foi tocado.
- **RF5/CA6 (card segue o mesmo padrão)** — aplicado igual à tabela nos
  dois arquivos (`crud-list-page.tsx` e `operations-list.tsx`).
- **Fora do escopo, como previsto:** `Romaneio.tsx`/`Operational.tsx`
  (Multi-select, `onRowSingleClick`/`onRowDoubleClick`) e as sub-abas de
  Operação em modo clássico (Containers/Documents/Occurrences/etc., sem
  `rowActions`/`onRowOpen`/`onRowEdit`) não foram tocados — o ramo
  `else`/`onRowSingleClick`/`onRowDoubleClick` de `crud-list-page.tsx`
  ficou intacto.
- **`[NEEDS_DECISION]` §6 (touch)** — não fechada nesta implementação,
  como previsto; permanece como pendência aberta, sem gesto equivalente a
  botão direito em touch/mobile.
- **Comandos:**
  - `bun run check` (`tsc --noEmit`) — **VERIFIED**: limpo em relação a
    esta mudança. Restam 2 erros pré-existentes, não relacionados
    (`Documents.tsx`/`Occurrences.tsx`, propriedade `Search` ausente no
    tipo gerado) — confirmados presentes também em `git stash` (antes
    desta implementação), fora do escopo desta SPEC.
  - `bun run lint` — **VERIFIED**: `63 problems (0 errors, 63 warnings)`,
    mesma contagem baseline da SPEC-79/80 — nenhum warning novo em
    nenhum dos arquivos tocados (conferido filtrando a saída pelos nomes
    dos arquivos alterados).
- **Critérios de aceitação:**

| # | Resultado |
| --- | --- |
| CA1 | PASS — clique abre `onRowOpen` direto, sem `activeId`/menu. |
| CA2 | PASS — duplo clique abre `onRowEdit`/edição direto; sem efeito onde não há `onEdit` disponível (`collaborators`, `operations-list.tsx` em modo `readOnly`). |
| CA3 | PASS — `onContextMenu` com `preventDefault()` abre o menu controlado na posição do clique. |
| CA4 | PASS (sem mudança) — `ControlledMenu` já fechava em clique fora/`Escape`. |
| CA5 | PASS — Multi-select e sub-abas clássicas de Operação não tocadas. |
| CA6 | PASS — card segue o mesmo padrão da tabela nos dois arquivos. |
| CA7 | PASS — ver comandos acima. |

- **Limitações conhecidas:** não verificado visualmente em navegador
  nesta sessão (sem suíte de testes automatizados no projeto) — mesmo
  disclaimer da SPEC-79 §10. Menu em touch/mobile continua sem acesso
  (R3/§6, decisão aberta do usuário).

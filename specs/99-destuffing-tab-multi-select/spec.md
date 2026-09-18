# SPEC-99 — Aba Desestufagem: migrar pro padrão Multi-select

- **ID:** SPEC-99
- **Nome:** destuffing-tab-multi-select
- **Status:** IMPLEMENTED (2026-09-18) — aprovado pelo usuário ("APROVAR
  SPEC-99"). Bloqueio de §2 resolvido: `warren/Core/specs/49-cargo-unit-cancel-batch`
  está `IMPLEMENTED` e `just map` já rodou (hook
  `usePostApiOperationOperationIdCargoCancelBatch` disponível em
  `src/api/generated/endpoints/cargo-unit/cargo-unit.ts`).
- **Autor:** claude (pedido do usuário, 2026-09-18)
- **Área:** `src/components/operations/tabs/Operational.tsx`
  (`DestuffingTab`, linhas 665-810, e `CancelCargoUnitModal`, linhas
  598-660).
- **Depende de (Core):** `specs/49-cargo-unit-cancel-batch`
  (`IMPLEMENTED`) — endpoint `POST operation/{operationId}/cargo/cancel-batch`.
- **Não se aplica a:** `StuffingTab` (já é o padrão de referência,
  `specs/53`/`76`/`97`, sem mudança aqui) nem a nenhuma outra sub-aba de
  Operação.

---

## 1. Objetivo

Migrar a sub-aba **Desestufagem** (`DestuffingTab`) do padrão atual
(tabela crua, ação individual de cancelar por linha) pro padrão
**Multi-select** já estabelecido em `StuffingTab`/Romaneio
(`specs/53`, `76`, `97`): `CrudListPage` com `selection` (checkbox),
barra fixa sempre visível (`belowSearch`, botão desabilitado sem
seleção), menu de ações em massa no botão direito (`bulkActions`,
SPEC-97) e clique simples selecionando a linha (`onRowSingleClick`).

**Decisão do usuário:** a ação individual de cancelar por linha
(botão `❌`, hoje único ponto de entrada) **sai** — vira exclusivamente
"Desestufar selecionados" em lote, mesmo padrão que o Romaneio adotou
ao remover a exclusão individual quando ganhou seleção múltipla
(SPEC-53). Cancelar 1 fardo só passa a selecionar aquele fardo e usar a
ação em lote — sem atalho de 1 clique só.

## 2. Bloqueio — dependência do Core

`DestuffingTab` hoje cancela um `CargoUnit` por vez via
`usePostApiOperationOperationIdCargoIdCancel` (endpoint individual,
`CancelCargoUnitModal`, linhas 598-660). "Desestufar selecionados" em
lote precisa do endpoint novo de `specs/49-cargo-unit-cancel-batch`
(Core, `DRAFT`) — sem ele, não há como cancelar N fardos com um motivo
só numa chamada tudo-ou-nada. **Esta SPEC não pode ser implementada até
a SPEC-49 do Core estar `IMPLEMENTED` e `just map` (rodado de dentro de
`warren/NewPortal`) expor o hook novo** (`usePostApiOperation
OperationIdCargoCancelBatch` ou nome equivalente gerado pelo Orval).

## 3. Contexto — estado atual

- `DestuffingTab` (linhas 665-810): usa `<Table>` crua do
  React-Bootstrap, não `CrudListPage` — comentário no código (linhas
  720-723) já documenta o motivo histórico ("leitura + ação de cancelar
  por linha, não CRUD paginado clássico"), motivo que deixa de valer com
  esta SPEC.
- Busca (`FilterText`), ordenação (`SortableTh`) e paginação
  (`ListPagination`) já existem na tabela crua (SPEC-93) — precisam ser
  preservadas na migração pra `CrudListPage` (que já tem os três
  nativamente).
- `cancelTarget: CargoUnitDTO | null` (linha 686) guarda o alvo único do
  modal de cancelamento — vira uma lista de IDs selecionados.
- `CancelCargoUnitModal` (linhas 598-660): modal com campo `reason`
  (`InputTextArea`, `maxLength 500`, obrigatório via
  `PostApiOperationOperationIdCargoIdCancelBody`/Zod gerado), botão
  "Confirmar" chama `usePostApiOperationOperationIdCargoIdCancel`. Vira
  a referência estrutural do modal de lote (RF6) — mesmo campo de
  motivo, mesma UX, só troca o hook e o alvo (lista, não um item).
- `StuffingTab` (linhas 105-283+) é a referência viva do padrão
  Multi-select completo a replicar aqui: `selection` (linhas 156-168,
  passado na linha 244), `belowSearch` sempre visível com botão
  desabilitado sem seleção (linhas 222-243), `bulkActions`/
  `CrudBulkActions` no botão direito (linhas 245-264, SPEC-97),
  `onRowSingleClick={(r) => toggleSelected(r.id)}` (linha 269).

## 4. Escopo

### 4.1 Requisitos funcionais

- **RF1** — `DestuffingTab` migra de `<Table>` crua pra `CrudListPage`,
  preservando busca/ordenação/paginação já existentes (via
  `search`/`onSearchChange`, `sort`/`onSortChange`, paginação nativa do
  `CrudListPage` — mesmo padrão de `StuffingTab`).
- **RF2** — Ganha `selection: CrudSelection<CargoUnitDTO>` (mesmo
  formato de `StuffingTab`/Romaneio — `selectedIds`/`onToggle`/
  `onToggleAll`; sem `isDisabled` previsto, já que todo item listado
  aqui é `Status: "Stuffed"`, logo sempre cancelável — a checar na
  implementação se algum outro estado precisa ficar de fora).
- **RF3** — `onRowSingleClick={(r) => toggleSelected(r.id)}` — clique
  simples seleciona/desseleciona, mesmo padrão de `StuffingTab`. Sem
  `onRowDoubleClick` (esta tela não tem ação de ver/editar item
  individual, mesma ausência que `StuffingTab` já tem).
- **RF4** — Barra fixa via `belowSearch`: contador de selecionados +
  botão "Desestufar selecionados" (reaproveita string existente ou
  chave nova — ver §5), **sempre visível**, botão `disabled` quando
  `selectedIds.size === 0` — mesmo padrão de `StuffingTab`/Romaneio
  pós-SPEC-97 (nunca escondida).
- **RF5** — `bulkActions` (`CrudBulkActions`, botão direito do mouse):
  mesma ação "Desestufar selecionados" da barra, segundo ponto de
  entrada — mesmo padrão RF4/RF5 da SPEC-97 aplicado aqui.
- **RF6** — Coluna/célula de ação individual (botão `❌` por linha) é
  **removida**. `CancelCargoUnitModal` (single-target) é substituído por
  um modal de lote (`CancelCargoUnitBatchModal` ou nome equivalente) —
  mesma estrutura (campo `reason`, `maxLength 500`, obrigatório), mas
  recebendo `cargoUnitIds: string[]` em vez de um `cargoUnit` único, e
  chamando o hook novo gerado a partir da SPEC-49 do Core.
- **RF7** — Ao confirmar o cancelamento em lote com sucesso: mesmo
  padrão de toast de sucesso já usado (`administrative-operations.
  containers.stuffing.toast.canceled` — adaptar mensagem pra plural se
  fizer sentido, a definir na implementação), invalida a query da
  listagem (mesmo `invalidate`/`onCanceled` já usado), limpa a seleção
  (`selectedIds` volta a vazio).
- **RF8** — Se o Core retornar erro de gate (algum `Id` já cancelado ou
  não encontrado — RF4/RF5 da SPEC-49), o erro aparece via toast (mesmo
  interceptor global do `mutator.ts`, `catch` vazio, igual o modal
  individual já faz hoje) — sem tratamento especial de "qual item
  falhou" (é tudo-ou-nada, mensagem do Core já é agregada).

### 4.2 Fora do escopo

- `StuffingTab` — já é a referência, sem mudança.
- Qualquer mudança no endpoint individual do Core (`Cancel`) — continua
  existindo (fora do escopo da SPEC-49 também), só deixa de ser chamado
  por esta tela especificamente.
- Acesso ao menu de ações em massa em touch/mobile — mesma
  `[NEEDS_DECISION]` já registrada nas SPECs 96/97, não resolvida aqui.

## 5. i18n

- Reaproveita `administrative-operations.containers.stuffing.cancelTitle`/
  `cancelReason`/`cancelConfirm`/`toast.canceled` onde fizer sentido
  (adaptar texto pra plural/lote é decisão de redação na implementação,
  não muda a chave necessariamente).
- Chave nova provável: `administrative-operations.containers.stuffing.
  destuffSelected` ("Desestufar selecionados") pro botão da barra/menu —
  mesmo padrão de nome que `batchButton`/`batchSelected` já usados em
  `StuffingTab` pro lado da estufagem.

## 6. Arquivos esperados

- `src/components/operations/tabs/Operational.tsx` (`DestuffingTab`,
  `CancelCargoUnitModal` → novo modal de lote, RF1-RF8).
- `src/api/generated/**` — regenerado por `just map` a partir da
  SPEC-49 do Core (pré-requisito, não é escrito à mão).
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
  (chave nova de §5).

## 7. Riscos

- **R1** — Perda do atalho de 1 clique pra cancelar 1 fardo só — decisão
  consciente do usuário (§1), mesmo trade-off já aceito pelo Romaneio na
  SPEC-53.
- **R2** — Bloqueio externo: esta SPEC não anda sem a SPEC-49 do Core
  ser aprovada e implementada primeiro — sequência de trabalho, não
  risco técnico.

## 8. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | `DestuffingTab` usa `CrudListPage` com `selection`, preservando busca/ordenação/paginação já existentes. |
| CA2 | Clique simples numa linha seleciona/desseleciona o fardo. |
| CA3 | Barra fixa (`belowSearch`) sempre visível, botão "Desestufar selecionados" desabilitado sem seleção. |
| CA4 | Botão direito abre menu com "Desestufar selecionados", mesmo destino da barra. |
| CA5 | Não existe mais botão de cancelar individual por linha. |
| CA6 | Confirmar o modal de lote cancela todos os fardos selecionados com um motivo só, invalida a listagem e limpa a seleção. |
| CA7 | `bun run check` + `bun run lint` sem regressão. |

## 9. Implementation Notes

- **Arquivos alterados:**
  - `src/components/operations/tabs/Operational.tsx` — `DestuffingTab`
    reescrita (linhas ~676-865): de `<Table>` crua pra `CrudListPage`, com
    `selection`/`belowSearch`/`bulkActions`/`onRowSingleClick`, mesmo padrão
    de `StuffingTab`. `CancelCargoUnitModal` (single-target) removido e
    substituído por `CancelCargoUnitBatchModal` (lote). Imports ajustados:
    saíram `Table`, `SortableTh`, `ListPagination`, `FilterText`,
    `LoadingState`, `tableCardStyles` (não usados mais nesta sub-aba) e
    `usePostApiOperationOperationIdCargoIdCancel`/
    `PostApiOperationOperationIdCargoIdCancelBody`; entraram
    `usePostApiOperationOperationIdCargoCancelBatch`/
    `PostApiOperationOperationIdCargoCancelBatchBody`.
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
    — chave nova `containers.stuffing.destuffSelected` ("Desestufar
    selecionados"/"Destuff selected"/"Desestibar seleccionados"/"拆箱所选项")
    e `operational.destuffing.title`/`.empty` (faltavam — `CrudListPage`
    exige `titleKey` e o `emptyMessageKey` é usado pro estado vazio nativo
    do componente; texto reaproveitado do antigo cabeçalho manual/
    `containers.destuffing.title/.empty`). `toast.canceled` adaptado pra
    plural genérico ("Fardo(s) cancelado(s) com sucesso." e equivalentes),
    sem virar chave nova nem precisar de `{count}` — é o único consumidor
    dessa chave agora que o modal single-target saiu.

- **Shape exato do hook/tipo gerado usado:**
  - `usePostApiOperationOperationIdCargoCancelBatch()` — mutation
    `(operationId: string, data: CargoUnitCancelBatch) => CargoUnitDTO[]`,
    chamada via `mutation.mutateAsync({ operationId, data: values })`.
  - `CargoUnitCancelBatch = { ids: string[] /* @minItems 1 */; reason:
    string /* @maxLength 500 */ }` (`src/api/generated/model/
    cargoUnitCancelBatch.ts`) — mesmo casing que o C#, sem surpresa de
    naming.
  - Zod gerado: `PostApiOperationOperationIdCargoCancelBatchBody =
    zod.object({ ids: zod.array(zod.uuid()).min(1), reason:
    zod.string().max(500) })` — mesmo padrão do schema individual
    (`PostApiOperationOperationIdCargoIdCancelBody`, só `reason`), sem
    `min(1)`/obrigatoriedade de conteúdo em `reason` (mesma ausência de
    validação "não vazio" que o modal single-target antigo já tinha —
    comportamento preexistente, não uma regressão desta SPEC).

- **Decisões tomadas durante a implementação (não 100% explícitas na
  spec):**
  - `CancelCargoUnitBatchModal` usa `zodResolver` sobre o schema **inteiro**
    (`ids` + `reason`), não só sobre `reason`. Como o campo `ids` nunca é
    renderizado (`Controller`/`register`) — só entra via `defaultValues:
    { ids: cargoUnitIds, reason: "" }` no `useForm` —, ele fica fixo desde
    a montagem do modal (que é remontado a cada abertura, via renderização
    condicional `cancelOpen ? <Modal ids={...}/> : null`, então sempre
    reflete a seleção atual). Isso evita reimplementar a validação de
    `reason` à mão (proibido — regra Zod intocável) e ainda valida `ids`
    (`min(1)`) de graça, sem custo de UI extra.
  - `belowSearch`/`bulkActions` usam `variant="danger"` no botão/ícone de
    "Desestufar selecionados" (ícone `bi-x-circle`) — diferente do azul/
    `bi-box-seam` de "Estufar em container" na `StuffingTab` — pra sinalizar
    visualmente que a ação é destrutiva (cancelamento), mesmo tratamento
    que o antigo botão `❌` por linha já dava (`btn-outline-danger`). Não
    estava explícito na spec, mas é consistente com o resto do app
    (`CrudBulkActions` já suporta `variant: "danger"` nativamente).
  - `CrudColumn.headerKey` das 4 colunas reaproveita chaves existentes de
    `containers.stuffing.*`/`containers.destuffing.colContainer` (mesmas
    usadas no cabeçalho manual anterior) — sem criar chave nova pras
    colunas, já que o texto era idêntico.
  - `renderCard` (visão mobile/cards do `CrudListPage`, obrigatório na
    prop) mostra identificador do container + status do fardo — não havia
    card equivalente antes (a tabela crua não tinha fallback mobile
    dedicado); segui o mesmo padrão de composição de `StuffingTab.renderCard`
    (título + subtítulo), sem nenhuma chave de i18n nova.
  - `itemsByIdRef` (padrão usado em `StuffingTab` pra reter dados
    completos dos itens selecionados através de páginas) não foi
    necessário aqui: o modal de lote só precisa dos `id`s selecionados
    (`Array.from(selectedIds)`), não de nenhum outro campo do `CargoUnitDTO`.

- **Comandos executados e resultado:**
  - `bun run check` (`tsc --noEmit`) — **VERIFIED**, 0 erros.
  - `bun run lint` (`eslint .`) — **VERIFIED**, 0 erros, 63 warnings
    (mesmo baseline pré-existente, nenhum novo).
  - `just map` não rodou nesta implementação — não era necessário, o
    contrato já estava atualizado (pré-requisito da SPEC-49 do Core,
    resolvido antes desta implementação começar).

- **Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| CA1 | `DestuffingTab` usa `CrudListPage` com `selection`, preservando busca/ordenação/paginação. | PASS |
| CA2 | Clique simples numa linha seleciona/desseleciona o fardo. | PASS (`onRowSingleClick`) |
| CA3 | Barra fixa (`belowSearch`) sempre visível, botão desabilitado sem seleção. | PASS |
| CA4 | Botão direito abre menu com "Desestufar selecionados", mesmo destino da barra. | PASS (`bulkActions`) |
| CA5 | Não existe mais botão de cancelar individual por linha. | PASS (coluna/célula removida) |
| CA6 | Confirmar o modal de lote cancela todos os fardos selecionados com um motivo só, invalida a listagem e limpa a seleção. | PASS |
| CA7 | `bun run check` + `bun run lint` sem regressão. | PASS |

- **Limitações conhecidas:** mesma pendência de acesso ao menu de ações em
  massa em touch/mobile já registrada nas SPECs 96/97 — não resolvida
  aqui, fora de escopo (§4.2). Verificação foi estática (leitura de
  código + `check`/`lint`); não há suíte de testes automatizados no
  projeto e a spec não pediu verificação visual/manual específica além
  dos critérios de aceitação.

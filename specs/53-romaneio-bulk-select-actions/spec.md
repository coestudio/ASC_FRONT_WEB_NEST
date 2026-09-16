# SPEC-53 — Romaneio: seleção em massa (excluir/editar NF-Lote), coluna/filtro de estufado, ordenação por NF/Lote

- **ID:** SPEC-53
- **Nome:** romaneio-bulk-select-actions
- **Status:** IMPLEMENTED — dependência `warren/Core/specs/43-romaneio-stuffed-status-bulk-actions`
  resolvida (`IMPLEMENTED`, 2026-09-16: `IsStuffed` computado no `GetAll`),
  client gerado (`just map`) já com `RomaneioDTO.isStuffed`,
  `GetApiOperationOperationIdRomaneioParams.IsStuffed`, `delete-batch` e
  `update-batch`. Sem `[NEEDS_DECISION]` (regra de negócio confirmada pelo
  usuário 2026-09-16: linha estufada não é selecionável).
- **Autor:** claude (pedido do usuário, 2026-09-16, em 3 mensagens
  seguidas na mesma conversa)
- **Área:** `src/components/operations/tabs/Romaneio.tsx`,
  `src/components/crud/crud-list-page.tsx` (extensão genérica de
  seleção + ordenação), `src/i18n/dictionaries/{pt-BR,en,es,zh}/
administrative-operations.json`.
- **Depende de (Core):** `specs/43-romaneio-stuffed-status-bulk-actions`
  (`DRAFT`) — `RomaneioDTO.IsStuffed`, filtro `?IsStuffed=`, endpoints
  `delete-batch`/`update-batch`, gate de estufagem no `PUT` individual.
  Ordenação por `NotaFiscal`/`Lote` **já existe** no Core
  (`RomaneioViewModel.Query.Sortable` já tem as duas chaves) — sem
  dependência de Core pra essa parte.

---

## 1. Objetivo

Quatro pedidos do usuário, todos na aba Romaneio, na mesma conversa:

1. Coluna + filtro "Estufado" (Sim/Não/Todos).
2. Checkbox por linha + "selecionar tudo", excluir os selecionados de
   uma vez, **removendo** o botão de exclusão individual por linha.
   Linha estufada **não é selecionável** (não editável nem excluível —
   regra de negócio confirmada, §2).
3. Editar `NotaFiscal`/`Lote` em massa nas linhas selecionadas.
4. Ordenar a lista por NF e por Lote, ascendente/descendente, clicando
   no cabeçalho da coluna.

## 2. Contexto

`CrudListPage` (`src/components/crud/crud-list-page.tsx`) não tem
nenhum suporte a seleção de linha nem a ordenação clicável de coluna
hoje (`grep` por `selectable`/`checkbox`/`selected`/`sort` não acha
nada relevante — o único uso de `Sort` no projeto é um valor default
fixo em `operations-list.tsx`, não interativo). `Romaneio.tsx` usa
`CrudRowActions` com `onView`/`onEdit`/`onDelete` por linha — `onDelete`
abre `ConfirmationModal` de exclusão individual.

**Regra de negócio confirmada pelo usuário:** linha de Romaneio já
estufada (tem `CargoUnit` ativa vinculada) não pode ser editada nem
excluída — nem individual, nem em massa. Por isso ela **não fica
selecionável** (checkbox desabilitado) — não é um caso de erro a tratar
depois de selecionar, é a linha nunca entrar na seleção. O Core
(`specs/43`) valida de novo server-side (rede de segurança contra
corrida, não UX principal) e também passa a bloquear edição individual
da linha estufada, que hoje não tinha gate nenhum.

Ordenação por `NotaFiscal`/`Lote` (pedido 4) **já é suportada pelo
Core** (`RomaneioViewModel.Query.Sortable` já mapeia as duas chaves) —
gap é 100% do front, que nunca expôs nenhum cabeçalho clicável.

## 3. Escopo

### 3.1 Seleção — extensão genérica em `CrudListPage`

Prop nova opcional `selection`:

```tsx
type CrudSelection<T> = {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  /** Linha não pode ser selecionada — checkbox desabilitado, sem onClick. */
  isDisabled?: (item: T) => boolean;
};
```

Quando presente: injeta uma coluna extra à esquerda (checkbox por
linha — desabilitado quando `isDisabled(item)` for `true`; checkbox no
`<th>` seleciona/desseleciona só os itens **selecionáveis da página
atual**, ignorando os desabilitados). Só `Romaneio.tsx` usa isso por
ora — os outros ~7 usos de `CrudListPage` continuam sem `selection`,
sem mudança de comportamento (prop opcional).

`Romaneio.tsx` passa `isDisabled={(r) => r.isStuffed}`.

### 3.2 Ordenação clicável — extensão genérica em `CrudListPage`

`CrudColumn<T>` ganha campo opcional `sortKey?: string` (a chave que o
Core espera em `Sort`, ex. `"notaFiscal"`, `"-notaFiscal"`). Quando
presente, o `<th>` daquela coluna vira clicável (ícone de seta indicando
direção atual, ou nenhuma seta se não for a coluna ativa de ordenação).

`CrudListPage` ganha props opcionais `sort`/`onSortChange`:

```tsx
sort?: string; // valor cru do Sort atual, ex. "-notaFiscal" ou "lote"
onSortChange?: (sort: string) => void;
```

Clique alterna: sem ordenação nessa coluna → ascendente (`"notaFiscal"`)
→ descendente (`"-notaFiscal"`) → volta pra sem ordenação (`undefined`,
Core usa o `defaultSort` de cada endpoint). Só uma coluna ordenada por
vez (mesmo modelo do `PageQuery.Sort` do Core, uma string só). Colunas
sem `sortKey` continuam com `<th>` estático, sem mudança visual/de
comportamento (aditivo).

`Romaneio.tsx` aplica `sortKey="notaFiscal"`/`sortKey="lote"` nas
colunas de NF (nova, §3.5) e Lote; `sort`/`onSortChange` ligados a um
state local repassado pro `listQueryOptions` (`Sort: sort`).

### 3.3 Barra de ação em massa (`Romaneio.tsx`)

Quando `selectedIds.size > 0`, mostra uma barra acima da tabela: contador
"N selecionados", botão "Editar NF/Lote" e botão "Excluir selecionados"
(`variant="danger"`).

- **Excluir selecionados** → `ConfirmationModal` (reusa o componente já
  existente) confirmando "excluir N itens?", chama
  `POST .../romaneio/delete-batch`. Como a UI já impede selecionar linha
  estufada, o `409` do Core (SPEC-43 §3.4) só deveria acontecer por
  corrida rara (outra aba estufou entre o carregamento da lista e o
  clique) — toast de erro genérico (`administrative-operations.
romaneio.bulkActions.toastError`) já cobre esse caso, sem UX especial.
- **Editar NF/Lote** → modal pequeno novo (`RomaneioBulkEditModal`) com
  2 campos opcionais (`InputText` pra NF, `InputText` pra Lote — mesmo
  Field já usado no form de criar/editar Romaneio). Só os campos
  preenchidos vão no `update-batch`; campo vazio = não mexe. Sucesso:
  toast, invalida a lista, fecha o modal.

### 3.4 Remove exclusão individual, desabilita edição de linha estufada (RF2)

`columns`: `<CrudRowActions onView onEdit onDelete>` perde `onDelete`.
`onEdit` passa a ser condicional — `onEdit={r.isStuffed ? undefined :
() => setModal({ mode: "edit", record: r })}` (mesmo padrão de
desabilitar ação por linha já usado em outras telas, se existir
precedente — senão, `CrudRowActions` precisa aceitar `onEdit`
opcional/`undefined` pra esconder o ícone, confirmar no componente
real). `pendingDelete`/`setPendingDelete`/`confirmDelete` (exclusão
individual) são removidos — código morto depois da mudança.

### 3.5 Coluna "Nota Fiscal" (nova) + "Estufado" (RF1)

`RomaneioDTO` já tem `notaFiscal` mas a tabela nunca mostrava essa
coluna — adiciona (`sortKey="notaFiscal"`, §3.2), antes de "Lote".
Coluna "Estufado" nova, depois de "Peso": badge (`Badge` do
react-bootstrap) "Estufado"/"Não estufado" conforme `r.isStuffed`
(verde/cinza — mesma paleta semântica já usada em outros badges de
status do projeto).

### 3.6 Filtro "Estufado" (RF1)

Dropdown/`Form.Select` novo na barra de filtros (Todos/Estufado/Não
estufado), state local (`isStuffedFilter: boolean | null`), passado
como `IsStuffed` pro `listQueryOptions`.

## 4. Fora do escopo

- Mudar `CrudRowActions`/`CrudColumn` além do necessário pra seleção e
  ordenação — extensões aditivas só.
- Adicionar seleção/ordenação em outra tela além de Romaneio — fora do
  pedido, mesmo a infra ficando genérica pra reuso futuro.
- Ordenação por outras colunas além de NF/Lote nesta tela — pedido
  explícito limitou a essas duas (a infra genérica do §3.2 permite
  estender depois trivialmente, se pedido).

## 5. Requisitos funcionais

- **RF1** — Coluna "Nota Fiscal" + "Estufado" (badge) + filtro
  (Todos/Estufado/Não estufado) na aba Romaneio.
- **RF2** — Checkbox por linha (desabilitado em linha estufada) +
  "selecionar todos selecionáveis da página"; botão de exclusão
  individual removido; edição individual desabilitada em linha
  estufada.
- **RF3** — "Excluir selecionados" exclui em lote via `delete-batch`,
  com confirmação.
- **RF4** — "Editar NF/Lote" aplica os campos preenchidos em todas as
  linhas selecionadas via `update-batch`, sem exigir os dois campos.
- **RF5** — Clicar no cabeçalho "Nota Fiscal" ou "Lote" ordena a lista
  (asc → desc → sem ordenação), refletido visualmente (seta).

## 6. Camada de dados

`just map` contra o Core com `specs/43` `IMPLEMENTED` — hooks novos
(`GET .../romaneio` com `IsStuffed` no schema de query,
`POST .../romaneio/delete-batch`, `POST .../romaneio/update-batch`) +
`RomaneioDTO.isStuffed` no schema/model gerado. `Sort` já existe no
schema de `GET .../romaneio` hoje (não é novidade do `specs/43`).

## 7. i18n

Chaves novas em `administrative-operations.romaneio.*` (4 locales):
`colNotaFiscal` (se não existir já — conferir, pode já existir em
outro contexto do módulo), `colIsStuffed`,
`filterIsStuffed.{all,stuffed,notStuffed}`,
`bulkActions.{selectedCount,editNfLote,deleteSelected,
confirmDelete,editTitle,fieldNotaFiscal,fieldLote,toastSuccess,
toastError}`.

## 8. Arquivos esperados

- `src/components/crud/crud-list-page.tsx`
- `src/components/operations/tabs/Romaneio.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
- `src/api/generated/**` (via `just map`)

## 9. Critérios de aceitação

| # | Critério |
| --- | --- |
| CA1 | Colunas "Nota Fiscal" e "Estufado" aparecem com dado/badge corretos. |
| CA2 | Filtro Todos/Estufado/Não estufado funciona (lista + paginação consistentes). |
| CA3 | Checkbox aparece desabilitado em linha estufada; "selecionar todos" não marca linhas estufadas. |
| CA4 | Sem botão de exclusão individual na tabela; ícone de editar desabilitado/ausente em linha estufada. |
| CA5 | "Excluir selecionados" remove as linhas escolhidas. |
| CA6 | "Editar NF/Lote" com só um dos dois campos preenchido só muda esse campo nas linhas selecionadas. |
| CA7 | Clicar no cabeçalho "Nota Fiscal" ordena asc, clica de novo ordena desc, clica de novo volta ao padrão — mesmo pra "Lote". |
| CA8 | Outras ~7 telas que usam `CrudListPage` continuam funcionando idênticas (sem `selection`/`sort`, sem regressão). |
| CA9 | `bun run check` + `bun run lint` sem regressão. |
| CA10 | 4 dicts de i18n com as mesmas chaves novas. |

## 10. Riscos

- **R1** — `crud-list-page.tsx` é componente compartilhado por ~7 telas
  além de Romaneio — as duas extensões (seleção, ordenação) precisam
  ser estritamente aditivas, testar que as outras telas não regridem
  (CA8).

## Implementation Notes

- **Arquivos alterados:**
  - `src/components/crud/crud-list-page.tsx` — `CrudColumn.sortKey`,
    `CrudSelection<T>` (novo tipo exportado), props `selection`/`sort`/
    `onSortChange` em `CrudListPageProps`/`CrudListPageBody`; coluna de
    checkbox (header "selecionar tudo" restrito aos selecionáveis da página
    + checkbox por linha desabilitável) e cabeçalho de coluna clicável
    (asc → desc → sem ordenação, ícone `bi-sort-up-alt`/`bi-sort-down-alt`/
    `bi-arrow-down-up`) — aditivo, os outros consumidores de `CrudListPage`
    não passam essas props e não mudam de comportamento.
  - `src/components/operations/tabs/Romaneio.tsx` — colunas "Nota Fiscal"
    (`sortKey="notaFiscal"`) e "Estufado" (badge); filtro `Form.Select`
    Todos/Estufado/Não estufado (`IsStuffed`); `selection` ligada a
    `isStuffed` (`isDisabled`); barra de ação em massa (contador + "Editar
    NF/Lote" + "Excluir selecionados") acima do `CrudListPage` quando há
    seleção; `CrudRowActions` perdeu `onDelete` (exclusão só em massa agora)
    e `onEdit` fica `undefined` em linha estufada; removido
    `pendingDelete`/`confirmDelete`/`useDeleteApiOperationOperationIdRomaneioId`
    (código morto pós-mudança); novo componente local
    `RomaneioBulkEditModal` (form `react-hook-form` + `zodResolver` sobre
    `PostApiOperationOperationIdRomaneioUpdateBatchBody` gerado, campo vazio
    normalizado pra `undefined` — não `null` — antes de validar, pra não
    violar o `min(1)` de `lote` e pra "não mexe" no `update-batch`); `Sort`
    (state local) passado pro `listQueryOptions`.
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`
    — `romaneio.colNotaFiscal`, `colIsStuffed`, `isStuffedYes`/`isStuffedNo`,
    `filterIsStuffed.{all,stuffed,notStuffed}`,
    `bulkActions.{selectedCount,editNfLote,deleteSelected,
    confirmDeleteTitle,confirmDelete,editTitle,fieldNotaFiscal,fieldLote,
    toastSuccess,toastDeleteSuccess,toastError}` — mesmas chaves nos 4
    locales.
  - `src/i18n/dictionaries/{pt-BR,en,es,zh}/crud.json` — `list.selectAll`/
    `list.selectRow` (label acessível dos novos checkboxes genéricos).
  - `src/api/generated/**` — nenhuma mudança nesta sessão (`just map`
    contra o Core já rodado antes desta tarefa, hash do contrato
    inalterado; client já tinha `isStuffed`, `IsStuffed`, `delete-batch`,
    `update-batch` conforme confirmado pelo usuário).
- **Comandos executados:**
  - `bun run check` → **VERIFIED** (`tsc --noEmit`, sem erro).
  - `bun run lint` → **VERIFIED** (66 problems / 3 errors / 63 warnings —
    idêntico ao baseline conhecido, pré-existente em
    `src/lib/session.server.ts` (3 `react-hooks/rules-of-hooks`) e
    `src/lib/ui-prefs.tsx` (`react-refresh/only-export-components`); zero
    regressão introduzida por esta SPEC).
  - `just map` não rodado nesta sessão (contrato já mapeado antes desta
    tarefa, sem mudança).
- **Critérios de aceitação:**

  | # | Resultado |
  | --- | --- |
  | CA1 | PASS — colunas "Nota Fiscal" (`r.notaFiscal ?? "—"`) e "Estufado" (`Badge` verde/cinza) adicionadas. |
  | CA2 | PASS — `Form.Select` filtra via `IsStuffed` no `listQueryOptions`, reseta pra página 1 na troca. |
  | CA3 | PASS — `selection.isDisabled = (r) => r.isStuffed === true`; header "selecionar tudo" só considera `selectableItems` (filtrados) da página atual. |
  | CA4 | PASS — `CrudRowActions` sem `onDelete`; `onEdit` vira `undefined` (ícone some, ver `CrudRowActions` — item condicional já existente) em linha estufada. |
  | CA5 | PASS — `handleBulkDelete` chama `postApiOperationOperationIdRomaneioDeleteBatch` com os `ids` selecionados, confirmação via `ConfirmationModal`. |
  | CA6 | PASS — `RomaneioBulkEditModal` só envia `notaFiscal`/`lote` quando preenchidos (`""` → `undefined` antes do `zodResolver`, chave ausente no JSON enviado). |
  | CA7 | PASS — `nextSort` alterna `key` → `-key` → `undefined`; testado via leitura de código para as duas colunas com `sortKey`. |
  | CA8 | PASS (por construção) — `selection`/`sort`/`onSortChange`/`sortKey` são todos opcionais; `bun run check`/`lint` não acusou nenhum dos outros ~7 consumidores de `CrudListPage`. Sem verificação visual manual das outras telas (fora do escopo de tempo desta sessão — risco R1 mitigado só por tipagem/aditividade, não por teste manual). |
  | CA9 | PASS — ver comandos acima. |
  | CA10 | PASS — 4 locales de `administrative-operations.json` e `crud.json` com as mesmas chaves (pt-BR fonte de verdade). |

- **Decisões tomadas durante a implementação:**
  - `onToggleAll` do `CrudSelection<T>` ganhou um parâmetro `ids: string[]`
    (não estava no shape exato do §3.1 da SPEC, que só tinha `checked:
    boolean`) — necessário pra `CrudListPage` informar ao consumidor quais
    ids da página atual são selecionáveis (o componente genérico não pode
    supor como o consumidor guarda a página carregada). Mudança aditiva
    dentro do mesmo conceito descrito na SPEC, não muda contrato de UX.
  - `RomaneioBulkEditModal` normaliza `""` → `undefined` (não `null`, que é
    o padrão do `CrudRecordModal`) porque aqui campo vazio significa "não
    mexe" (RF4), e `lote` tem `min(1)` no schema gerado — `null`/`""`
    quebrariam essa validação; `undefined` é aceito pelo `.nullish()` e o
    `axios`/`JSON.stringify` descarta a chave, batendo com a semântica
    pedida.
  - Confirmação visual manual das telas (CA1–CA7) não foi feita nesta
    sessão (sem navegador disponível no ambiente do agente) — validado por
    leitura de código, tipos (`tsc`) e paridade com padrões já usados em
    `admin/access` (filtro `Form.Select`) e `crud-record-modal.tsx`
    (resolver com normalização pré-validação).
- **Limitações conhecidas:**
  - Nenhuma verificação end-to-end/manual no browser rodou nesta sessão
    (ambiente sem navegador) — recomenda-se checagem visual na rota
    `/administrative/operations/$id` (aba Romaneio) antes de considerar o
    risco R1 zerado na prática, não só por tipo.
  - `src/api/snapshot.json` já tinha diferença pendente de timestamp de uma
    rodada de `just map` anterior a esta tarefa — mantida como estava,
    conforme instrução recebida.

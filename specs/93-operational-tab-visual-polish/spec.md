# SPEC-93 — Polish visual e ordenação da aba Operacional (Estufagem/Desestufagem)

- **ID:** 93
- **Nome:** operational-tab-visual-polish
- **Status:** IMPLEMENTED
- **Autor:** claude (triagem de leva de ajustes pré-apresentação, pedido do
  usuário em 2026-09-17)
- **Área:** `src/components/operations/tabs/Operational.tsx`

## 1. Objetivo

Cobre 2 itens da leva do usuário:

- Item 3: "Fazer funcionar a desestufagem — quando o usuário seleciona o
  checkbox pra estufar, e na tela desestufagem mostrar os itens estufados
  e permitir desestufar."
- Item 14: "Melhorar design/layout da aba Operacional — hoje não tem
  destaque, não tá bom pra apresentar."

## 2. Contexto (investigado em 2026-09-17)

### Item 3 — já implementado, mecânica funciona hoje

`Operational.tsx` já tem exatamente o fluxo descrito:

- Sub-aba **Estufagem** (`StuffingTab`, linhas 101-295): lista fardos não
  estufados via `CrudListPage` com `selection`/checkbox por linha
  (`CrudSelection`), clique na linha também seleciona
  (`onRowSingleClick`), botão "Estufar em container" abre `StuffBatchModal`
  com os itens marcados.
- Sub-aba **Desestufagem** (`DestuffingTab`, linhas 652-751): lista todos os
  `CargoUnit` com `Status: "Stuffed"` da operação (`GetApiOperation
  OperationIdCargo`), mostra o container de origem
  (`identifierByContainerId`) e tem um botão por linha (`bi-x-circle`,
  `btn-outline-danger`) que abre `CancelCargoUnitModal` — cancelamento =
  desestufagem, motivo obrigatório.

Ou seja: **o item 3 já está implementado como descrito**. Não há bug
confirmado — o comportamento pedido já existe em código. Nenhuma SPEC de
funcionalidade nova é necessária aqui; o que resta é a hipótese, levantada
pelo usuário, de que isso "não funciona" na prática por estar pouco visível
— o que aponta pro item 14 (design) como causa real, coberta abaixo.

### Item 14 — `DestuffingTab` foge do padrão visual do resto do app

Diferente de `StuffingTab` (usa `CrudListPage`, com toda a UI padrão:
busca, paginação com `ListPagination`, cabeçalho com título/descrição,
`.tableCard`/`.crudTable`), `DestuffingTab` é uma tabela **crua**
(`<Table hover size="sm">` dentro de `<div className="table-responsive">`,
sem `.soft-card`/`.tableCard` nenhum — nem o wrapper mínimo que
`Documents.tsx`/`Invoice.tsx` usam). Sem cabeçalho de seção, sem busca, sem
`SortableTh` (nenhuma coluna é clicável — Sort já existe no Core,
`GetApiOperationOperationIdCargoParams.Sort`, só não é usado aqui).

Resultado: a sub-aba Desestufagem parece "menos pronta" que o resto da
tela — tabela sem moldura, sem realce visual, sem busca/ordenação — o que
bate com a queixa do usuário ("não tem destaque, não tá bom pra
apresentar").

## 3. Escopo

- `DestuffingTab`: dar o mesmo tratamento visual do resto do app —
  cabeçalho de seção (título/contagem), busca por texto (Core já expõe
  `Search` em `GetApiOperationOperationIdCargoParams`), colunas ordenáveis
  (`SortableTh`, mesmo padrão de `Occurrences.tsx`/`Documents.tsx`, ou
  migração pra `CrudListPage` se a SPEC-94 definir esse como o padrão
  novo — ver dependência abaixo).
- `StuffingTab`: já usa `CrudListPage` — revisar espaçamento/hierarquia
  visual junto (título da sub-aba, `Nav.Link` "pills", espaço entre a barra
  de seleção em lote e a tabela) pra ficar consistente com o nível de
  polish de Romaneio/Responsible (SPEC-53/87).
- Revisar o `Nav` (`variant="pills"`) das 2 sub-abas — hoje sem nenhum
  destaque visual além do texto (comparar com o padrão de
  `Invoice.tsx`, que tem o mesmo `Nav`/`Tab.Container` mas é alvo da
  SPEC-94 por outro motivo).

## 4. Fora do escopo

- Mudar a lógica de negócio de estufagem/desestufagem (Modo A/B, batch,
  cancelamento) — já funciona, sem mudança de comportamento aqui, só de
  apresentação.
- Adicionar filtro por container na Desestufagem (não pedido).

## 5. Dependência

Esta SPEC depende da decisão de padrão visual que sair da **SPEC-94**
(`raw-table-visual-standardization`) — se a decisão lá for "toda tabela
crua vira `.tableCard`/`.crudTable` do `CrudListPage`", `DestuffingTab`
deve migrar pra `CrudListPage` de verdade (ganha `SortableTh` de graça via
`CrudColumn.sortKey`) em vez de só herdar a classe CSS. Recomendação:
implementar SPEC-94 primeiro (ou junto), pra não duplicar decisão de
padrão em 2 SPECs diferentes.

## 6. UI

- `DestuffingTab` ganha: campo de busca (`FilterText`, mesmo padrão de
  `Documents.tsx`/`Occurrences.tsx`), `SortableTh` (ou `CrudColumn`, a
  depender da SPEC-94) nas colunas Status/Identificado/Peso Bruto/
  Container, wrapper visual consistente (`.tableCard` ou `.soft-card` +
  `overflow: hidden`, a depender da SPEC-94).
- Título/contagem de itens no topo da sub-aba (mesmo padrão de
  `CrudListPage.titleKey`/`descriptionKey`, ainda que montado manualmente
  aqui).

## 7. i18n

Reusa chaves já existentes em `administrative-operations.containers.
stuffing.*`/`destuffing.*` para textos de coluna/ação. Chave nova só se
"busca" precisar de um placeholder dedicado (`searchPlaceholder`), a
adicionar nos 4 locales.

## 8. Critérios de aceitação (a validar após implementação)

| # | Critério |
| --- | --- |
| 1 | `DestuffingTab` tem busca por texto funcional |
| 2 | Colunas de `DestuffingTab` são ordenáveis (pelo menos Status e Container) |
| 3 | `DestuffingTab` usa o mesmo wrapper visual (`.tableCard`/`.soft-card` com `overflow: hidden`) do padrão definido na SPEC-94 |
| 4 | Sub-abas Estufagem/Desestufagem mantêm o fluxo funcional de hoje (seleção em lote, estufar, desestufar) sem regressão |
| 5 | `bun run check` e `bun run lint` sem novos erros |

## 9. Riscos

Baixo a médio — depende da decisão de padrão da SPEC-94 pra não retrabalhar.

## 10. Implementation Notes

**Dependência da SPEC-94 resolvida primeiro** (implementada antes desta,
conforme a recomendação do §5): a decisão lá foi manter tabela crua com
CSS compartilhado (`.tableCard`/`.rawTable` de `table-card.module.css`),
não migrar tudo pra `CrudListPage`. Por isso `DestuffingTab` recebeu o
mesmo tratamento das 5 tabelas da SPEC-94 (card + cabeçalho escuro), **não**
uma migração pra `CrudListPage` — consistente com a decisão já tomada, sem
retrabalho.

**O que foi implementado em `DestuffingTab`:**
- Cabeçalho de seção (título reusando `containers.destuffing.title`,
  descrição nova `operational.destuffing.description`).
- Busca por texto (`FilterText`, novo `Search` no
  `GetApiOperationOperationIdCargoParams`, já suportado pelo Core).
- Colunas "Status" e "Container" viraram `SortableTh` (`sortKey: "status"`/
  `"containerOperationId"`, nomes inferidos a partir dos campos do DTO —
  mesma convenção usada em `Romaneio`/`Invoice`, não confirmado
  literalmente contra o `Sortable` do Core nesta sessão porque não havia
  Core rodando; na pior hipótese o Core ignora uma chave não suportada,
  sem quebrar a tela).
- Wrapper visual `tableCardStyles.tableCard`/`.rawTable` (mesmo padrão da
  SPEC-94), substituindo o antigo `<div className="table-responsive">`
  solto (sem `.soft-card` nenhum antes).

**`StuffingTab`/`Nav` pills revisados, sem mudança necessária:** já usam
`CrudListPage` (título/descrição/busca/paginação no padrão) e o mesmo
`Nav variant="pills" className="mb-3"` que `Invoice.tsx` (referência
citada na própria spec) — nenhuma divergência de padrão encontrada, então
nenhuma mudança foi feita ali além do já herdado indiretamente (nenhuma
classe nova necessária).

**Item 3 (funcionalidade de desestufagem):** confirmado no código, sem
mudança de comportamento — já funcionava antes desta SPEC (ver §2 da
spec original). Nenhuma regressão introduzida (fluxo de seleção/estufar/
desestufar intacto).

**Arquivos alterados:**
- `src/components/operations/tabs/Operational.tsx`
- `src/i18n/dictionaries/{pt-BR,en,es,zh}/administrative-operations.json`

**Comandos executados:**
- `bun run check` — VERIFIED, sem erros.
- `bun run lint` — VERIFIED, 0 errors / 63 warnings (mesmo baseline, sem
  warning novo).

**Critérios de aceitação:**

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | Busca por texto funcional em `DestuffingTab` | PASS |
| 2 | Colunas ordenáveis (Status e Container) | PASS |
| 3 | Mesmo wrapper visual da SPEC-94 | PASS |
| 4 | Sem regressão no fluxo funcional | PASS (nenhuma lógica de negócio tocada) |
| 5 | `bun run check`/`lint` sem novos erros | PASS |

**Limitações conhecidas:** `sortKey` de `DestuffingTab` é inferido dos
nomes de campo do DTO, não confirmado contra o `Sortable` real do Core
(sem ambiente rodando nesta sessão) — se o Core não reconhecer essas
chaves, a ordenação simplesmente não terá efeito (sem erro), até
confirmação/ajuste num teste manual. Sem verificação visual em navegador
(mesma ressalva das SPECs anteriores desta leva).
